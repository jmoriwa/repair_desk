import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/services";
import type { Priority, RepairStatus } from "@/services";

const STATUS_CLASS: Record<RepairStatus, string> = {
  received: "bg-secondary text-secondary-foreground ring-border",
  diagnosing: "bg-info/12 text-info ring-info/25",
  waiting_customer: "bg-warning/20 text-warning-foreground ring-warning/40",
  waiting_parts: "bg-warning/20 text-warning-foreground ring-warning/40",
  repairing: "bg-primary/10 text-primary ring-primary/25",
  ready_for_pickup: "bg-success/15 text-success ring-success/30",
  completed: "bg-muted text-muted-foreground ring-border",
  cannot_repair: "bg-destructive/10 text-destructive ring-destructive/25",
  cancelled: "bg-muted text-muted-foreground ring-border",
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
  completed: "var(--color-border)",
  cannot_repair: "var(--color-destructive)",
  cancelled: "var(--color-border)",
};

const PULSING: RepairStatus[] = ["repairing", "ready_for_pickup"];

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
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight ring-1 ring-inset",
        STATUS_CLASS[status],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          STATUS_DOT[status],
          PULSING.includes(status) && "animate-pulse",
        )}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_CLASS: Record<Priority, string> = {
  low: "border-border text-muted-foreground",
  normal: "border-border text-muted-foreground",
  high: "border-accent/60 bg-accent/15 text-accent-foreground",
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
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
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]",
        PRIORITY_CLASS[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
