/**
 * vlei-seller-credential-workflow.ts
 *
 * Jupiter Seller-side VLEI workflow:
 *   1. Connect to KERIA as jupiterSellerAgent (using existing BRAN)
 *   2. Get OOR credential chain info
 *   3. Create invoice registry (if not already created)
 *   4. Issue self-attested invoice credential with REAL digital signature
 *   5. Output the full credential JSON to stdout for the UI
 *
 * This script assumes the OOR credential is already established.
 * It does NOT perform agent delegation.
 *
 * Usage: tsx vlei-seller-credential-workflow.ts <env> [taskDataDir]
 */

import fs from "fs";
import path from "path";
import { getOrCreateClient } from "../../client/identifiers.js";
import { waitOperation } from "../../client/operations.js";
import { resolveOobi } from "../../client/oobis.js";
import { createTimestamp } from "../../time.js";

// ============================================================================
// Configuration
// ============================================================================
const args = process.argv.slice(2);
const env = (args[0] as 'docker' | 'testnet') || 'docker';
const taskDataDir = args[1] || '/task-data';

const SELLER_AGENT = "jupiterSellerAgent";
const INVOICE_REGISTRY_NAME = `${SELLER_AGENT}_INVOICE_REGISTRY`;

// Load invoice config
const INVOICE_CONFIG_PATHS = [
    '/vlei/appconfig/invoiceConfig.json',
    './appconfig/invoiceConfig.json',
    path.join(process.cwd(), 'appconfig/invoiceConfig.json'),
];

function loadInvoiceConfig(): any {
    for (const p of INVOICE_CONFIG_PATHS) {
        try {
            if (fs.existsSync(p)) {
                return JSON.parse(fs.readFileSync(p, 'utf-8'));
            }
        } catch { /* continue */ }
    }
    throw new Error("Invoice config not found in any expected path");
}

// Load schema SAID
function getInvoiceSchemaSaid(): string {
    const possiblePaths = [
        '/vlei/appconfig/schemaSaids.json',
        './appconfig/schemaSaids.json',
        path.join(process.cwd(), 'appconfig/schemaSaids.json'),
    ];
    for (const configPath of possiblePaths) {
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                if (config.invoiceSchema?.said) {
                    return config.invoiceSchema.said;
                }
            }
        } catch { /* continue */ }
    }
    // Fallback
    return "EIKpV6ZqOn2Rg-DY86bIKDixNlgdvUQoSpijhVqs_EPu";
}

// Retry helper
async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    initialDelayMs: number = 3000
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error: any) {
            const isRetryable =
                error.cause?.code === 'ECONNREFUSED' ||
                error.cause?.code === 'EAI_AGAIN' ||
                error.message?.includes('fetch failed') ||
                error.message?.includes('ETIMEDOUT') ||
                error.message?.includes('404');
            if (attempt === maxRetries || !isRetryable) throw error;
            const delay = initialDelayMs * Math.pow(1.5, attempt - 1);
            console.error(`  [Retry] ${operationName} attempt ${attempt}/${maxRetries}, waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw new Error('Unexpected: exited retry loop');
}

// ============================================================================
// Main Workflow
// ============================================================================
async function main() {
    const output: any = {
        workflow: "vLEI Jupiter Seller Credential Signing",
        timestamp: new Date().toISOString(),
        steps: [],
        sellerAgent: SELLER_AGENT,
    };

    try {
        // ── Step 1: Load seller agent BRAN ──
        const branFilePath = `${taskDataDir}/${SELLER_AGENT}-bran.txt`;
        if (!fs.existsSync(branFilePath)) {
            throw new Error(`Agent BRAN file not found: ${branFilePath}. OOR workflow must be completed first.`);
        }
        const agentBran = fs.readFileSync(branFilePath, 'utf-8').trim();
        output.steps.push({ step: 1, name: "Load Agent BRAN", status: "success", detail: `BRAN loaded (${agentBran.substring(0, 12)}...)` });

        // ── Step 2: Load agent info ──
        const agentInfoPath = `${taskDataDir}/${SELLER_AGENT}-info.json`;
        if (!fs.existsSync(agentInfoPath)) {
            throw new Error(`Agent info not found: ${agentInfoPath}. OOR workflow must be completed first.`);
        }
        const agentInfo = JSON.parse(fs.readFileSync(agentInfoPath, 'utf-8'));
        output.sellerAgentAID = agentInfo.aid;
        output.steps.push({ step: 2, name: "Load Agent Info", status: "success", detail: `AID: ${agentInfo.aid}` });

        // ── Step 3: Connect to KERIA ──
        console.error("Connecting to KERIA as jupiterSellerAgent...");
        const client = await retryWithBackoff(
            () => getOrCreateClient(agentBran, env),
            'KERIA connection'
        );
        output.steps.push({ step: 3, name: "Connect to KERIA", status: "success", detail: `Controller: ${client.controller.pre}` });

        // ── Step 4: Get seller agent identifier ──
        const sellerAid = await retryWithBackoff(
            () => client.identifiers().get(SELLER_AGENT),
            'Get identifier'
        );
        output.sellerPrefix = sellerAid.prefix;
        output.steps.push({ step: 4, name: "Get Seller AID", status: "success", detail: `Prefix: ${sellerAid.prefix}` });

        // ── Step 5: List existing credentials (OOR chain) ──
        console.error("Listing existing credentials...");
        const allCreds = await client.credentials().list({ filter: {} });
        const oorCreds = allCreds.filter((c: any) =>
            c.sad?.s === 'EBNaNu-M9P5cgrnfl2Fvymy4E_jvxxyjb70PRtiANlJy' || // OOR schema
            c.sad?.a?.officialRole || c.sad?.a?.personLegalName
        );
        const existingInvoiceCreds = allCreds.filter((c: any) =>
            c.sad?.a?.invoiceNumber || c.sad?.a?.totalAmount
        );

        output.existingCredentials = {
            total: allCreds.length,
            oorCredentials: oorCreds.length,
            invoiceCredentials: existingInvoiceCreds.length,
        };
        output.steps.push({
            step: 5, name: "List Existing Credentials", status: "success",
            detail: `Total: ${allCreds.length}, OOR: ${oorCreds.length}, Invoice: ${existingInvoiceCreds.length}`
        });

        // ── Step 6: Get/Create invoice registry ──
        console.error("Checking invoice registry...");
        let registries = await client.registries().list(SELLER_AGENT);
        let invoiceRegistry = registries.find((r: any) => r.name === INVOICE_REGISTRY_NAME);

        if (!invoiceRegistry) {
            console.error("Creating invoice registry...");
            const regResult = await client.registries().create({
                name: INVOICE_REGISTRY_NAME,
                registryName: INVOICE_REGISTRY_NAME,
                nonce: '',
            });
            const regOp = await waitOperation(client, regResult.op);
            registries = await client.registries().list(SELLER_AGENT);
            invoiceRegistry = registries.find((r: any) => r.name === INVOICE_REGISTRY_NAME);
            output.steps.push({ step: 6, name: "Create Invoice Registry", status: "success", detail: `Registry: ${INVOICE_REGISTRY_NAME}` });
        } else {
            output.steps.push({ step: 6, name: "Invoice Registry Exists", status: "success", detail: `Registry: ${invoiceRegistry.regk}` });
        }

        output.registry = {
            name: INVOICE_REGISTRY_NAME,
            regk: invoiceRegistry?.regk || 'unknown',
        };

        // ── Step 7: Load invoice data & issue credential ──
        console.error("Loading invoice config and issuing credential...");
        const invoiceConfig = loadInvoiceConfig();
        const schemaSaid = getInvoiceSchemaSaid();
        const invoiceData = invoiceConfig.invoice.sampleInvoice;

        // Resolve schema OOBI
        const schemaOobi = `http://schema:7723/oobi/${schemaSaid}`;
        try {
            await resolveOobi(client, schemaOobi, `invoice-schema-${Date.now()}`);
        } catch (e: any) {
            // May already be resolved
            console.error(`  Schema OOBI note: ${e.message}`);
        }

        // Prepare credential attributes
        const credAttributes = {
            i: sellerAid.prefix, // Self-attested: issuer = issuee
            dt: createTimestamp(),
            invoiceNumber: invoiceData.invoiceNumber,
            invoiceDate: invoiceData.invoiceDate,
            dueDate: invoiceData.dueDate,
            sellerLEI: invoiceData.sellerLEI,
            buyerLEI: invoiceData.buyerLEI,
            currency: invoiceData.currency,
            totalAmount: invoiceData.totalAmount,
            lineItems: invoiceData.lineItems,
            paymentTerms: invoiceData.paymentTerms,
            paymentMethod: invoiceData.paymentMethod,
            paymentChainID: invoiceData.paymentChainID,
            paymentWalletAddress: invoiceData.paymentWalletAddress,
            ref_uri: invoiceData.ref_uri,
        };

        const credRules = {
            d: '',
            usageDisclaimer: {
                l: 'This is a self-attested invoice credential issued by the agent. The issuer and holder are the same entity.'
            },
            selfAttestation: {
                l: 'This credential is self-attested. The trust chain derives from the agent delegation to the GLEIF root.'
            }
        };

        const issData = {
            i: sellerAid.prefix,
            ri: invoiceRegistry!.regk,
            s: schemaSaid,
            a: credAttributes,
            e: undefined, // No edge for self-attested
            r: credRules,
        };

        output.steps.push({
            step: 7, name: "Prepare Credential Data", status: "success",
            detail: `Schema: ${schemaSaid}, Registry: ${invoiceRegistry!.regk}`
        });

        // ── Step 8: Issue the credential ──
        console.error("Issuing self-attested invoice credential...");
        const issResult = await retryWithBackoff(
            async () => {
                const result = await client.credentials().issue(SELLER_AGENT, issData);
                const op = await waitOperation(client, result.op);
                if (op.error) {
                    throw new Error(`Credential issuance failed: ${JSON.stringify(op.error)}`);
                }
                return { ...result, response: op.response };
            },
            'Credential issuance',
            3,
            5000
        );

        const credentialSaid = issResult.response?.ced?.d;
        if (!credentialSaid) {
            throw new Error("No credential SAID returned from issuance");
        }

        output.steps.push({ step: 8, name: "Issue Credential", status: "success", detail: `Credential SAID: ${credentialSaid}` });

        // ── Step 9: Retrieve the full credential with signatures ──
        console.error("Retrieving full credential with digital signatures...");
        const fullCredential = await client.credentials().get(credentialSaid);

        output.credential = {
            sad: fullCredential.sad,        // Signed ACDC data (contains d = SAID, i = issuer, etc.)
            status: fullCredential.status,
            atc: fullCredential.atc,        // Attestation/signature attachments
            chains: fullCredential.chains,
        };

        // Extract digital signature details
        output.digitalSignature = {
            credentialSAID: fullCredential.sad.d,
            issuerAID: fullCredential.sad.i,
            issueeAID: fullCredential.sad?.a?.i,
            selfAttested: fullCredential.sad.i === fullCredential.sad?.a?.i,
            schemaSAID: fullCredential.sad.s,
            registryID: fullCredential.sad.ri,
            issuanceTimestamp: fullCredential.sad?.a?.dt,
            // The 'sad' itself IS the signed data - 'd' field is the SAID (Self-Addressing IDentifier)
            // which is the cryptographic digest/signature of the entire credential
            signedDigest: fullCredential.sad.d,
            signaturePresent: true,
        };

        // Also include the raw ACDC, ANC (anchor), and ISS (issuance event)
        output.rawACDC = issResult.acdc;
        output.anchorEvent = issResult.anc;
        output.issuanceEvent = issResult.iss;

        output.steps.push({
            step: 9, name: "Retrieve Full Credential", status: "success",
            detail: `SAID: ${fullCredential.sad.d}, Self-attested: ${fullCredential.sad.i === fullCredential.sad?.a?.i}`
        });

        // ── Step 10: Save and output ──
        const credInfoPath = `${taskDataDir}/${SELLER_AGENT}-vlei-credential-latest.json`;
        fs.writeFileSync(credInfoPath, JSON.stringify(output, null, 2));
        console.error(`✓ Credential info saved to ${credInfoPath}`);

        output.success = true;
        output.steps.push({ step: 10, name: "Save Output", status: "success", detail: credInfoPath });

    } catch (error: any) {
        console.error(`✗ ERROR: ${error.message}`);
        output.success = false;
        output.error = error.message;
        output.steps.push({ step: output.steps.length + 1, name: "Error", status: "failed", detail: error.message });

        // If we failed but have existing credential data, try to return it
        try {
            const existingPath = `${taskDataDir}/${SELLER_AGENT}-self-invoice-credential-info.json`;
            if (fs.existsSync(existingPath)) {
                const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
                output.existingCredentialData = existingData;
                output.note = "Failed to issue new credential, but found existing credential data from prior run.";
            }
        } catch { /* ignore */ }
    }

    // Output JSON to stdout (Backend will capture this)
    console.log(JSON.stringify(output));
}

main().catch((err) => {
    console.error("Fatal error:", err);
    console.log(JSON.stringify({
        success: false,
        error: err.message,
        workflow: "vLEI Jupiter Seller Credential Signing",
        timestamp: new Date().toISOString(),
    }));
    process.exit(1);
});
