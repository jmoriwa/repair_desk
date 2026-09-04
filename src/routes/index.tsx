import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardList,
  ExternalLink,
  ListChecks,
  PackageCheck,
  Plus,
  Timer,
  UserX,
} from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge, STATUS_RAIL } from "@/components/status-badge";
import { DeviceIcon } from "@/components/device-icon";
import { initials } from "@/components/app-shell";
import { api, STATUS_LABELS } from "@/services";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Shop dashboard — RepairDesk" },
      {
        name: "description",
        content:
          "Today's bench at a glance: open repairs, devices waiting on parts and tickets ready for pickup.",
      },
      { property: "og:title", content: "Shop dashboard — RepairDesk" },
      {
        property: "og:description",
        content:
          "Today's bench at a glance: open repairs, devices waiting on parts and tickets ready for pickup.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

function Dashboard() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
  });

  const stats = [
    {
      label: "Open repairs",
      value: data?.openRepairs,
      icon: ClipboardList,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Ready for pickup",
      value: data?.readyForPickup,
      icon: PackageCheck,
      tone: "text-success bg-success/12",
    },
    {
      label: "Waiting",
      value: data?.waiting,
      icon: Timer,
      tone: "text-warning-foreground bg-warning/20",
    },
    {
      label: "Unassigned",
      value: data?.unassigned,
      icon: UserX,
      tone: "text-destructive bg-destructive/10",
    },
  ];

  const max = Math.max(1, ...(data?.byStatus.map((r) => r.count) ?? [1]));

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Workspace</p>
          <h1 className="truncate font-display text-xl font-semibold">
            Desktop — {user?.displayName}
          </h1>
        </div>
        <Button asChild size="sm" className="h-8">
          <Link to="/repairs/new">
            <Plus className="size-3.5" /> New ticket
          </Link>
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel flex items-center gap-3 px-3.5 py-3">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-sm ${s.tone}`}
            >
              <s.icon className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">
                {s.label}
              </p>
              <p className="numeral text-2xl font-semibold leading-tight">
                {s.value ?? "—"}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <section className="portlet">
          <div className="portlet-head">
            <ListChecks className="size-3.5 text-muted-foreground" />
            <span>Active work orders</span>
            <Link
              to="/repairs"
              className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              Open queue <ExternalLink className="size-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="datagrid">
              <thead>
                <tr>
                  <th className="w-[5.5rem]">Ticket</th>
                  <th className="w-[5.5rem]">Priority</th>
                  <th>Device</th>
                  <th className="hidden w-[8.5rem] 2xl:table-cell">Customer</th>
                  <th className="hidden w-[8.5rem] md:table-cell">Assigned to</th>
                  <th className="w-[8.5rem]">Status</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent.map(({ repair, customer, device, technician }) => (
                  <tr key={repair.id}>
                    <td
                      className="rail"
                      style={
                        { "--rail": STATUS_RAIL[repair.status] } as React.CSSProperties
                      }
                    >
                      <Link
                        to="/repairs/$repairId"
                        params={{ repairId: repair.id }}
                        className="ticket-no text-[12.5px] text-primary hover:underline"
                      >
                        {repair.ticketNumber}
                      </Link>
                    </td>
                    <td>
                      <PriorityBadge priority={repair.priority} />
                    </td>
                    <td>
                      <span className="flex items-center gap-2">
                        <DeviceIcon
                          type={device.deviceType}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="block truncate font-medium">
                          {device.manufacturer} {device.model}
                        </span>
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap 2xl:table-cell">
                      {customer.firstName} {customer.lastName}
                    </td>
                    <td className="hidden md:table-cell">
                      {technician ? (
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[9px] font-semibold text-secondary-foreground">
                            {initials(technician.displayName)}
                          </span>
                          <span className="truncate">{technician.displayName}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={repair.status} />
                    </td>
                  </tr>
                ))}
                {!data && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="portlet">
          <div className="portlet-head">
            <BarChart3 className="size-3.5 text-muted-foreground" />
            <span>Work orders by stage</span>
          </div>
          <ul className="divide-y divide-border">
            {data?.byStatus.map((row) => (
              <li key={row.status} className="px-3 py-2.5">
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[row.status]}
                  </span>
                  <span className="numeral font-semibold">{row.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-sm bg-surface-2">
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${(row.count / max) * 100}%`,
                      background: STATUS_RAIL[row.status],
                    }}
                  />
                </div>
              </li>
            ))}
            {!data && (
              <li className="px-3 py-8 text-center text-muted-foreground">Loading…</li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
