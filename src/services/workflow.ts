import type { Priority, RepairStatus } from "./types";

/** Allowed status transitions for the repair lifecycle (spec 6.5). */
export const ALLOWED_TRANSITIONS: Record<RepairStatus, RepairStatus[]> = {
  received: ["diagnosing", "repairing", "cancelled"],
  diagnosing: [
    "repairing",
    "waiting_customer",
    "waiting_parts",
    "cannot_repair",
    "cancelled",
  ],
  waiting_customer: ["diagnosing", "repairing", "cannot_repair", "cancelled"],
  waiting_parts: ["repairing", "diagnosing", "cannot_repair", "cancelled"],
  repairing: ["waiting_parts", "ready_for_pickup", "cannot_repair"],
  ready_for_pickup: ["completed", "repairing"],
  completed: [],
  cannot_repair: ["ready_for_pickup", "completed"],
  cancelled: [],
};

export function canTransition(from: RepairStatus, to: RepairStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const OPEN_STATUSES: RepairStatus[] = [
  "received",
  "diagnosing",
  "waiting_customer",
  "waiting_parts",
  "repairing",
  "ready_for_pickup",
];

export function isOpen(status: RepairStatus): boolean {
  return OPEN_STATUSES.includes(status);
}

export const STATUS_LABELS: Record<RepairStatus, string> = {
  received: "Received",
  diagnosing: "Diagnosing",
  waiting_customer: "Waiting for customer",
  waiting_parts: "Waiting for parts",
  repairing: "Repairing",
  ready_for_pickup: "Ready for pickup",
  completed: "Completed",
  cannot_repair: "Cannot repair",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};
