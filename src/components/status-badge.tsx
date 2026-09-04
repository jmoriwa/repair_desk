import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/services";
import type { Priority, RepairStatus } from "@/services";

const STATUS_CLASS: Record<RepairStatus, string> = {
  received: "bg-secondary text-secondary-foreground",
  diagnosing: "bg-info/15 text-info",
  waiting_customer: "bg-warning/25 text-warning-foreground",
  waiting_parts: "bg-warning/25 text-warning-foreground",
  repairing: "bg-primary/12 text-primary",
  ready_for_pickup: "bg-success/18 text-success",
  completed: "bg-muted text-muted-foreground",
  cannot_repair: "bg-destructive/12 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
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
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight",
        STATUS_CLASS[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_CLASS: Record<Priority, string> = {
  low: "border-border text-muted-foreground",
  normal: "border-border text-foreground",
  high: "border-accent/60 text-accent-foreground bg-accent/15",
  urgent: "border-destructive/40 text-destructive bg-destructive/10",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        PRIORITY_CLASS[priority],
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
