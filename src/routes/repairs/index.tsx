import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { api, REPAIR_STATUSES, STATUS_LABELS } from "@/services";
import type { RepairStatus } from "@/services";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/repairs/")({
  head: () => ({
    meta: [
      { title: "Repair queue — RepairDesk" },
      {
        name: "description",
        content:
          "Search and filter every repair ticket in the shop by status, technician, customer or device.",
      },
      { property: "og:title", content: "Repair queue — RepairDesk" },
      {
        property: "og:description",
        content:
          "Search and filter every repair ticket in the shop by status, technician, customer or device.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RepairQueue />
    </RequireAuth>
  ),
});

function RepairQueue() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RepairStatus | "all" | "open">("open");
  const [mineOnly, setMineOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["repairs", query, status, mineOnly, user?.id],
    queryFn: () =>
      api.listRepairs({
        query,
        status,
        technicianId: mineOnly ? user?.id : undefined,
      }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Repair queue</h1>
          <p className="text-sm text-muted-foreground">
            {data ? `${data.length} matching repairs` : "Loading…"}
          </p>
        </div>
        <Button asChild>
          <Link to="/repairs/new">New repair ticket</Link>
        </Button>
      </header>

      <div className="panel space-y-4 p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Ticket number, customer, phone, device or problem"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search repairs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["open", "all", ...REPAIR_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                status === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {s === "open" ? "Open" : s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMineOnly((v) => !v)}
            className={cn(
              "ml-auto rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              mineOnly
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            My repairs
          </button>
        </div>
      </div>

      <section className="panel overflow-hidden">
        <ul className="divide-y divide-border">
          {data?.map(({ repair, customer, device, technician }) => (
            <li key={repair.id}>
              <Link
                to="/repairs/$repairId"
                params={{ repairId: repair.id }}
                className="grid gap-2 px-5 py-4 transition-colors hover:bg-muted/60 sm:grid-cols-[8rem_1fr_auto] sm:items-center"
              >
                <div>
                  <p className="font-mono text-sm font-semibold">{repair.ticketNumber}</p>
                  <PriorityBadge priority={repair.priority} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {device.manufacturer} {device.model}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {customer.firstName} {customer.lastName} · {repair.reportedProblem}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                  <span className="text-sm text-muted-foreground">
                    {technician?.displayName ?? "Unassigned"}
                  </span>
                  <StatusBadge status={repair.status} />
                </div>
              </Link>
            </li>
          ))}
          {data?.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              No repairs match those filters.
            </li>
          )}
          {isLoading && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              Loading…
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
