import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ClipboardList,
  PackageCheck,
  Plus,
  Timer,
  UserX,
} from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge, STATUS_RAIL } from "@/components/status-badge";
import { DeviceTile } from "@/components/device-icon";
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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

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
      tone: "text-warning-foreground bg-warning/25",
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
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{greeting()}</p>
          <h1 className="mt-1.5 font-display text-4xl font-bold">
            {user?.displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Here's what the shop is holding right now.
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/repairs/new">
            <Plus className="size-4" /> New repair ticket
          </Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel-raised lift-hover p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
              <span
                className={`flex size-9 items-center justify-center rounded-xl ${s.tone}`}
              >
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="numeral mt-4 text-4xl font-bold">{s.value ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel-raised overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold">
              Recent activity on the bench
            </h2>
            <Link
              to="/repairs"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              View queue <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {data?.recent.map(({ repair, customer, device, technician }) => (
              <li key={repair.id}>
                <Link
                  to="/repairs/$repairId"
                  params={{ repairId: repair.id }}
                  className="rail group flex items-center gap-4 py-4 pl-5 pr-4 transition-colors hover:bg-surface"
                  style={{ "--rail": STATUS_RAIL[repair.status] } as React.CSSProperties}
                >
                  <DeviceTile type={device.deviceType} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="ticket-no text-xs text-muted-foreground">
                        {repair.ticketNumber}
                      </span>
                      <PriorityBadge priority={repair.priority} />
                    </div>
                    <p className="mt-1 truncate font-medium">
                      {device.manufacturer} {device.model}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {customer.firstName} {customer.lastName} ·{" "}
                      {technician?.displayName ?? "Unassigned"}
                    </p>
                  </div>
                  <StatusBadge status={repair.status} />
                </Link>
              </li>
            ))}
            {!data && <li className="px-5 py-8 text-sm text-muted-foreground">Loading…</li>}
          </ul>
        </section>

        <section className="panel-raised p-5">
          <h2 className="font-display text-base font-semibold">Workload by stage</h2>
          <ul className="mt-5 space-y-3.5">
            {data?.byStatus.map((row) => (
              <li key={row.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {STATUS_LABELS[row.status]}
                  </span>
                  <span className="numeral font-semibold">{row.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${(row.count / max) * 100}%`,
                      background: STATUS_RAIL[row.status],
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
