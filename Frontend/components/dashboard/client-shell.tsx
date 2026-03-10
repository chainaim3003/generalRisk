"use client"

// This Client Component wrapper exists for one reason:
// Next.js App Router does NOT allow ssr:false in Server Components (page.tsx).
// ssr:false IS allowed inside Client Components ("use client").
//
// DashboardShell uses Radix UI Tabs which internally calls React's useId().
// Next.js server-renders even "use client" components, so the ID counter
// produces different values on the server vs. client → hydration mismatch.
// Loading DashboardShell with ssr:false prevents server rendering entirely,
// so IDs are only ever generated once on the client → no mismatch.

import dynamic from "next/dynamic"

const DashboardShell = dynamic(
  () =>
    import("@/components/dashboard/dashboard-shell").then((m) => ({
      default: m.DashboardShell,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading StableRisk AI…</p>
        </div>
      </div>
    ),
  }
)

export function ClientShell() {
  return <DashboardShell />
}
