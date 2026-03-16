/**
 * vlei-seller-query-credentials.ts
 *
 * Query existing credentials for jupiterSellerAgent from KERIA.
 * Returns the full credential JSON with digital signatures.
 * Does NOT issue new credentials - just queries what exists.
 *
 * Usage: tsx vlei-seller-query-credentials.ts <env> [taskDataDir]
 */

import fs from "fs";
import { getOrCreateClient } from "../../client/identifiers.js";

const args = process.argv.slice(2);
const env = (args[0] as 'docker' | 'testnet') || 'docker';
const taskDataDir = args[1] || '/task-data';

const SELLER_AGENT = "jupiterSellerAgent";

async function main() {
    const output: any = {
        workflow: "vLEI Query Jupiter Seller Credentials",
        timestamp: new Date().toISOString(),
        sellerAgent: SELLER_AGENT,
    };

    try {
        // Load BRAN
        const branFilePath = `${taskDataDir}/${SELLER_AGENT}-bran.txt`;
        if (!fs.existsSync(branFilePath)) {
            throw new Error(`Agent BRAN not found: ${branFilePath}`);
        }
        const agentBran = fs.readFileSync(branFilePath, 'utf-8').trim();

        // Load agent info
        const agentInfoPath = `${taskDataDir}/${SELLER_AGENT}-info.json`;
        if (!fs.existsSync(agentInfoPath)) {
            throw new Error(`Agent info not found: ${agentInfoPath}`);
        }
        const agentInfo = JSON.parse(fs.readFileSync(agentInfoPath, 'utf-8'));
        output.sellerAgentAID = agentInfo.aid;

        // Connect to KERIA
        console.error("Connecting to KERIA...");
        const client = await getOrCreateClient(agentBran, env);

        // Get seller AID
        const sellerAid = await client.identifiers().get(SELLER_AGENT);
        output.sellerPrefix = sellerAid.prefix;

        // List ALL credentials
        console.error("Querying credentials...");
        const allCreds = await client.credentials().list({ filter: {} });

        output.totalCredentials = allCreds.length;
        output.credentials = [];

        for (const cred of allCreds) {
            const credDetail: any = {
                said: cred.sad?.d,
                issuer: cred.sad?.i,
                schema: cred.sad?.s,
                status: cred.status,
                issuanceTimestamp: cred.sad?.a?.dt,
            };

            // Check if self-attested
            if (cred.sad?.a?.i) {
                credDetail.issuee = cred.sad.a.i;
                credDetail.selfAttested = cred.sad.i === cred.sad.a.i;
            }

            // Check if invoice credential
            if (cred.sad?.a?.invoiceNumber) {
                credDetail.type = "InvoiceCredential";
                credDetail.invoiceNumber = cred.sad.a.invoiceNumber;
                credDetail.totalAmount = cred.sad.a.totalAmount;
                credDetail.currency = cred.sad.a.currency;
                credDetail.sellerLEI = cred.sad.a.sellerLEI;
                credDetail.buyerLEI = cred.sad.a.buyerLEI;
            } else if (cred.sad?.a?.officialRole) {
                credDetail.type = "OOR";
                credDetail.officialRole = cred.sad.a.officialRole;
                credDetail.personLegalName = cred.sad.a.personLegalName;
            } else {
                credDetail.type = "Other";
            }

            // Digital signature info
            credDetail.digitalSignature = {
                signedDigest: cred.sad?.d,
                signaturePresent: !!cred.sad?.d,
            };

            // Full SAD for the credential
            credDetail.fullSAD = cred.sad;
            credDetail.chains = cred.chains;

            output.credentials.push(credDetail);
        }

        // List registries
        const registries = await client.registries().list(SELLER_AGENT);
        output.registries = registries.map((r: any) => ({
            name: r.name,
            regk: r.regk,
        }));

        output.success = true;

    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        output.success = false;
        output.error = error.message;

        // Try to load from file if KERIA is unreachable
        try {
            const existingPath = `${taskDataDir}/${SELLER_AGENT}-self-invoice-credential-info.json`;
            if (fs.existsSync(existingPath)) {
                output.existingCredentialData = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
                output.note = "KERIA unreachable, loaded from prior run file.";
            }
            const latestPath = `${taskDataDir}/${SELLER_AGENT}-vlei-credential-latest.json`;
            if (fs.existsSync(latestPath)) {
                output.latestWorkflowData = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
            }
        } catch { /* ignore */ }
    }

    console.log(JSON.stringify(output));
}

main().catch((err) => {
    console.error("Fatal:", err);
    console.log(JSON.stringify({ success: false, error: err.message, timestamp: new Date().toISOString() }));
    process.exit(1);
});
