import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ClipboardList, PackageCheck, Timer, UserX } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
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
    { label: "Open repairs", value: data?.openRepairs, icon: ClipboardList },
    { label: "Ready for pickup", value: data?.readyForPickup, icon: PackageCheck },
    { label: "Waiting", value: data?.waiting, icon: Timer },
    { label: "Unassigned", value: data?.unassigned, icon: UserX },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="font-display text-3xl font-bold">{user?.displayName}</h1>
        </div>
        <Button asChild>
          <Link to="/repairs/new">New repair ticket</Link>
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{s.value ?? "—"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="panel overflow-hidden">
          <h2 className="border-b border-border px-5 py-4 text-sm font-semibold">
            Recent activity on the bench
          </h2>
          <ul className="divide-y divide-border">
            {data?.recent.map(({ repair, customer, device, technician }) => (
              <li key={repair.id}>
                <Link
                  to="/repairs/$repairId"
                  params={{ repairId: repair.id }}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
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
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
            {!data && <li className="px-5 py-8 text-sm text-muted-foreground">Loading…</li>}
          </ul>
        </section>

        <section className="panel p-5">
          <h2 className="text-sm font-semibold">Workload by stage</h2>
          <ul className="mt-4 space-y-3">
            {data?.byStatus.map((row) => {
              const max = Math.max(1, ...(data?.byStatus.map((r) => r.count) ?? [1]));
              return (
                <li key={row.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{STATUS_LABELS[row.status]}</span>
                    <span className="font-semibold">{row.count}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(row.count / max) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
