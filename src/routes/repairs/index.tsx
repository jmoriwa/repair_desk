import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronRight, Inbox, Plus, Search, SlidersHorizontal } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge, STATUS_RAIL } from "@/components/status-badge";
import { DeviceTile } from "@/components/device-icon";
import { initials } from "@/components/app-shell";
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

function daysOnBench(createdAt: string) {
  const ms = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

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

  const urgentCount =
    data?.filter((r) => r.repair.priority === "urgent" || r.repair.priority === "high")
      .length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">On the bench</p>
          <h1 className="mt-1.5 font-display text-4xl font-bold">Repair queue</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted-foreground">
            <span>
              <span className="numeral font-semibold text-foreground">
                {data?.length ?? "—"}
              </span>{" "}
              matching {data?.length === 1 ? "repair" : "repairs"}
            </span>
            {urgentCount > 0 && (
              <>
                <span className="text-border">•</span>
                <span className="font-medium text-destructive">
                  {urgentCount} needing attention
                </span>
              </>
            )}
          </p>
        </div>
        <Button asChild size="lg" className="shadow-[var(--shadow-panel)]">
          <Link to="/repairs/new">
            <Plus className="size-4" /> New repair ticket
          </Link>
        </Button>
      </header>

      <div className="panel-raised space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl bg-surface pl-10 text-base shadow-none"
            placeholder="Ticket number, customer, phone, device or problem"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search repairs"
          />
        </div>

        <div className="hairline-x" />

        <div className="flex flex-wrap items-center gap-2">
          <SlidersHorizontal className="mr-0.5 size-3.5 text-muted-foreground" />
          {(["open", "all", ...REPAIR_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                status === s
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_6px_16px_-8px] shadow-primary/70"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {s === "open" ? "Open" : s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMineOnly((v) => !v)}
            className={cn(
              "ml-auto rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200",
              mineOnly
                ? "border-accent bg-accent text-accent-foreground shadow-[0_6px_16px_-8px] shadow-accent/70"
                : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:text-foreground",
            )}
          >
            My repairs
          </button>
        </div>
      </div>

      <section className="space-y-2.5">
        {data?.map(({ repair, customer, device, technician }) => (
          <Link
            key={repair.id}
            to="/repairs/$repairId"
            params={{ repairId: repair.id }}
            className="rail lift-hover group grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-border bg-card py-4 pl-5 pr-4 shadow-[var(--shadow-panel)] sm:grid-cols-[auto_1fr_auto]"
            style={{ "--rail": STATUS_RAIL[repair.status] } as React.CSSProperties}
          >
            <DeviceTile
              type={device.deviceType}
              className="transition-colors group-hover:border-primary/40 group-hover:text-primary"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="ticket-no text-xs font-semibold text-muted-foreground">
                  {repair.ticketNumber}
                </span>
                <PriorityBadge priority={repair.priority} />
                <span className="text-xs text-muted-foreground">
                  · {daysOnBench(repair.createdAt)} on the bench
                </span>
              </div>
              <p className="mt-1 truncate font-display text-base font-semibold">
                {device.manufacturer} {device.model}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {customer.firstName} {customer.lastName} · {repair.reportedProblem}
              </p>
            </div>

            <div className="col-span-2 flex items-center gap-3 border-t border-border pt-3 sm:col-span-1 sm:justify-end sm:border-0 sm:pt-0">
              {technician ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary font-display text-[10px] font-bold text-secondary-foreground">
                    {initials(technician.displayName)}
                  </span>
                  <span className="hidden sm:inline">{technician.displayName}</span>
                </span>
              ) : (
                <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  Unassigned
                </span>
              )}
              <StatusBadge status={repair.status} />
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </div>
          </Link>
        ))}

        {data?.length === 0 && (
          <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface text-muted-foreground">
              <Inbox className="size-6" />
            </span>
            <p className="font-display text-lg font-semibold">Nothing here</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              No repairs match those filters. Try another status, or clear the search.
            </p>
          </div>
        )}

        {isLoading &&
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[104px] animate-pulse rounded-2xl border border-border bg-card"
            />
          ))}
      </section>
    </div>
  );
}
