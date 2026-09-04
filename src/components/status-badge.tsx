import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/services";
import type { Priority, RepairStatus } from "@/services";

const STATUS_CLASS: Record<RepairStatus, string> = {
  received: "bg-secondary text-secondary-foreground ring-border-strong",
  diagnosing: "bg-info/10 text-info ring-info/30",
  waiting_customer: "bg-warning/15 text-warning-foreground ring-warning/45",
  waiting_parts: "bg-warning/15 text-warning-foreground ring-warning/45",
  repairing: "bg-primary/10 text-primary ring-primary/30",
  ready_for_pickup: "bg-success/12 text-success ring-success/35",
  completed: "bg-muted text-muted-foreground ring-border-strong",
  cannot_repair: "bg-destructive/10 text-destructive ring-destructive/30",
  cancelled: "bg-muted text-muted-foreground ring-border-strong",
};

const STATUS_DOT: Record<RepairStatus, string> = {
  received: "bg-muted-foreground",
  diagnosing: "bg-info",
  waiting_customer: "bg-warning",
  waiting_parts: "bg-warning",
  repairing: "bg-primary",
  ready_for_pickup: "bg-success",
  completed: "bg-muted-foreground",
  cannot_repair: "bg-destructive",
  cancelled: "bg-muted-foreground",
};

/** CSS colour for the left rail on list rows, per repair status. */
export const STATUS_RAIL: Record<RepairStatus, string> = {
  received: "var(--color-muted-foreground)",
  diagnosing: "var(--color-info)",
  waiting_customer: "var(--color-warning)",
  waiting_parts: "var(--color-warning)",
  repairing: "var(--color-primary)",
  ready_for_pickup: "var(--color-success)",
  completed: "var(--color-border-strong)",
  cannot_repair: "var(--color-destructive)",
  cancelled: "var(--color-border-strong)",
};

export function StatusBadge({
  status,
  className,
}: {
  status: RepairStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        STATUS_CLASS[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_CLASS: Record<Priority, string> = {
  low: "border-border-strong text-muted-foreground",
  normal: "border-border-strong text-muted-foreground",
  high: "border-warning/60 bg-warning/15 text-warning-foreground",
  urgent: "border-destructive/45 bg-destructive/10 text-destructive",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-1.5 py-px text-[10px] font-semibold uppercase tracking-[0.08em]",
        PRIORITY_CLASS[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
