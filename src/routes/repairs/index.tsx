import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Download,
  Filter,
  Inbox,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge, STATUS_RAIL } from "@/components/status-badge";
import { DeviceIcon } from "@/components/device-icon";
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

function age(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  return days <= 0 ? "Today" : `${days}d`;
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function RepairQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RepairStatus | "all" | "open">("open");
  const [mineOnly, setMineOnly] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["repairs", query, status, mineOnly, user?.id],
    queryFn: () =>
      api.listRepairs({
        query,
        status,
        technicianId: mineOnly ? user?.id : undefined,
      }),
  });

  const urgent =
    data?.filter((r) => r.repair.priority === "urgent" || r.repair.priority === "high")
      .length ?? 0;

  return (
    <div className="space-y-4">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Service management</p>
          <h1 className="truncate font-display text-xl font-semibold">Repair queue</h1>
        </div>
        <Button asChild size="sm" className="h-8">
          <Link to="/repairs/new">
            <Plus className="size-3.5" /> New ticket
          </Link>
        </Button>
      </header>

      <section className="portlet">
        <div className="portlet-head">
          <Filter className="size-3.5 text-muted-foreground" />
          <span>Ticket list</span>
          <span className="ml-auto flex items-center gap-3 text-[11px] font-normal text-muted-foreground">
            <span>
              <span className="numeral font-semibold text-foreground">
                {data?.length ?? 0}
              </span>{" "}
              records
            </span>
            {urgent > 0 && (
              <span className="font-medium text-destructive">{urgent} high / urgent</span>
            )}
          </span>
        </div>

        <div className="toolbar">
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
            Refresh
          </button>
          <button type="button" className="toolbar-btn">
            <Download className="size-3.5" /> Export
          </button>
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            type="button"
            onClick={() => setMineOnly((v) => !v)}
            className={cn(
              "toolbar-btn",
              mineOnly && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
            )}
          >
            My assignments
          </button>
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-7 rounded-sm bg-card pl-8 text-xs shadow-none"
              placeholder="Search ticket, customer, device, problem"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search repairs"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-2 py-1.5">
          {(["open", "all", ...REPAIR_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-sm border px-2 py-1 text-[11px] font-medium transition-colors",
                status === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-transparent text-muted-foreground hover:border-border-strong hover:bg-surface hover:text-foreground",
              )}
            >
              {s === "open" ? "Open" : s === "all" ? "All" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="datagrid">
            <thead>
              <tr>
                <th className="w-[6.5rem]">Ticket</th>
                <th className="w-[6rem]">Priority</th>
                <th className="w-[11rem]">Device</th>
                <th className="hidden w-[8.5rem] md:table-cell">Customer</th>
                <th className="hidden xl:table-cell">Reported problem</th>
                <th className="w-[8.5rem]">Assigned to</th>
                <th className="w-[8.5rem]">Status</th>
                <th className="w-[6rem] text-right">Opened</th>
              </tr>
            </thead>
            <tbody>
              {data?.map(({ repair, customer, device, technician }) => (
                <tr
                  key={repair.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({
                      to: "/repairs/$repairId",
                      params: { repairId: repair.id },
                    })
                  }
                >
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
                      onClick={(e) => e.stopPropagation()}
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
                  <td className="hidden whitespace-nowrap md:table-cell">
                    {customer.firstName} {customer.lastName}
                  </td>
                  <td className="hidden xl:table-cell">
                    <span className="block truncate text-muted-foreground">
                      {repair.reportedProblem}
                    </span>
                  </td>
                  <td>
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
                  <td className="whitespace-nowrap text-right text-muted-foreground">
                    <span className="numeral">{shortDate(repair.createdAt)}</span>
                    <span className="ml-1 text-[11px]">({age(repair.createdAt)})</span>
                  </td>
                </tr>
              ))}

              {data?.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <span className="mx-auto flex size-9 items-center justify-center rounded-sm border border-border bg-surface text-muted-foreground">
                      <Inbox className="size-4" />
                    </span>
                    <p className="mt-2 font-medium">No records found</p>
                    <p className="text-xs text-muted-foreground">
                      Adjust the status filter or clear the search.
                    </p>
                  </td>
                </tr>
              )}

              {isLoading &&
                [0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td colSpan={8}>
                      <div className="h-4 animate-pulse rounded-sm bg-surface-2" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-border bg-toolbar px-3 py-1.5 text-[11px] text-muted-foreground">
          <span>
            Showing {data?.length ?? 0} of {data?.length ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <span className="rounded-sm border border-border bg-card px-1.5 py-0.5 font-medium text-foreground">
              1
            </span>
            <span>of 1</span>
          </span>
        </div>
      </section>
    </div>
  );
}
