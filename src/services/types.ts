/**
 * RepairDesk domain model.
 *
 * These types form the contract between the UI and the services layer.
 * Every backend call in the app goes through `RepairDeskApi` (see ./api.ts),
 * so the same UI runs against the mock implementation or a real backend.
 */

export type UserRole = "admin" | "technician";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | undefined;
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export const DEVICE_TYPES = [
  "Laptop",
  "Desktop",
  "Smartphone",
  "Tablet",
  "Television",
  "Game console",
  "Monitor",
  "Printer",
  "Other",
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface Device {
  id: string;
  customerId: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber?: string | undefined;
  identifyingNotes?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export const REPAIR_STATUSES = [
  "received",
  "diagnosing",
  "waiting_customer",
  "waiting_parts",
  "repairing",
  "ready_for_pickup",
  "completed",
  "cannot_repair",
  "cancelled",
] as const;

export type RepairStatus = (typeof REPAIR_STATUSES)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Repair {
  id: string;
  ticketNumber: string;
  customerId: string;
  deviceId: string;
  assignedTechnicianId?: string | undefined;
  createdById: string;
  reportedProblem: string;
  priority: Priority;
  status: RepairStatus;
  estimatedCompletion?: string | undefined;
  completedAt?: string | undefined;
  customerUpdate?: string | undefined;
  trackingCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeRecord {
  id: string;
  repairId: string;
  employeeId: string;
  powersOn: boolean;
  screenCondition: string;
  scratches: boolean;
  dents: boolean;
  liquidDamage: boolean;
  missingComponents: boolean;
  chargerReceived: boolean;
  caseReceived: boolean;
  otherAccessories?: string | undefined;
  conditionNotes?: string | undefined;
  createdAt: string;
}

export interface Diagnosis {
  id: string;
  repairId: string;
  technicianId: string;
  description: string;
  recommendedRepair: string;
  estimatedCost?: number | undefined;
  createdAt: string;
  updatedAt: string;
}

export type NoteVisibility = "internal" | "customer";

export interface RepairNote {
  id: string;
  repairId: string;
  authorId: string;
  visibility: NoteVisibility;
  content: string;
  createdAt: string;
}

export interface RepairPart {
  id: string;
  repairId: string;
  recordedById: string;
  name: string;
  partNumber?: string | undefined;
  quantity: number;
  unitCost?: number | undefined;
  notes?: string | undefined;
  createdAt: string;
}

export type AttachmentCategory =
  | "intake"
  | "damage"
  | "internal"
  | "part"
  | "final";

export interface Attachment {
  id: string;
  repairId: string;
  uploadedById: string;
  url: string;
  filename: string;
  fileType: string;
  fileSize: number;
  category: AttachmentCategory;
  createdAt: string;
}

export type ActivityType =
  | "repair_created"
  | "technician_assigned"
  | "status_changed"
  | "diagnosis_recorded"
  | "note_added"
  | "part_added"
  | "attachment_uploaded"
  | "priority_changed"
  | "estimate_changed"
  | "customer_update_changed"
  | "intake_recorded"
  | "repair_completed";

export interface ActivityEvent {
  id: string;
  repairId: string;
  actorId: string;
  type: ActivityType;
  details: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
}

/** A repair joined with the records the detail and list views need. */
export interface RepairDetail {
  repair: Repair;
  customer: Customer;
  device: Device;
  technician?: User | undefined;
  createdBy?: User | undefined;
  intake?: IntakeRecord | undefined;
  diagnoses: Diagnosis[];
  notes: RepairNote[];
  parts: RepairPart[];
  attachments: Attachment[];
  activity: ActivityEvent[];
}

export interface RepairSummary {
  repair: Repair;
  customer: Customer;
  device: Device;
  technician?: User | undefined;
}

export interface DashboardSummary {
  openRepairs: number;
  readyForPickup: number;
  waiting: number;
  completedThisWeek: number;
  unassigned: number;
  byStatus: { status: RepairStatus; count: number }[];
  recent: RepairSummary[];
}

/** Only fields a customer is allowed to see. */
export interface PublicRepairStatus {
  ticketNumber: string;
  status: RepairStatus;
  deviceLabel: string;
  receivedAt: string;
  estimatedCompletion?: string | undefined;
  completedAt?: string | undefined;
  customerUpdate?: string | undefined;
  customerNotes: { content: string; createdAt: string }[];
}

export interface RepairFilters {
  query?: string | undefined;
  status?: RepairStatus | "all" | "open" | undefined;
  technicianId?: string | undefined;
  priority?: Priority | undefined;
  customerId?: string | undefined;
  deviceId?: string | undefined;
}

/** Errors thrown by the services layer carry a stable code the UI can branch on. */
export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "invalid_credentials"
  | "account_disabled"
  | "invalid_transition"
  | "validation"
  | "rate_limited";

export class ApiError extends Error {
  code: ApiErrorCode;
  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}
