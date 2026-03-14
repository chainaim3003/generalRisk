/**
 * index.tsx
 * Barrel export for defi-newdashboard1.
 *
 * Usage anywhere in the app:
 *   import { BufferDashboardShell } from '@/components/dashboard/defi-newdashboard1'
 *
 * To wire into the existing dashboard-shell.tsx, add one tab:
 *   <TabsTrigger value="buffer-v5">Buffer V5</TabsTrigger>
 *   <TabsContent value="buffer-v5"><BufferDashboardShell /></TabsContent>
 *
 * Also add "buffer-v5" to the DashboardMode union in lib/types.ts.
 * Both of those files are optional — this dashboard also works standalone.
 */

export { BufferDashboardShell } from './buffer-dashboard-shell'
