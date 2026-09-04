import type {
  ActivityEvent,
  Attachment,
  AttachmentCategory,
  Customer,
  DashboardSummary,
  Device,
  DeviceType,
  Diagnosis,
  IntakeRecord,
  NoteVisibility,
  Priority,
  PublicRepairStatus,
  Repair,
  RepairDetail,
  RepairFilters,
  RepairNote,
  RepairPart,
  RepairStatus,
  RepairSummary,
  User,
  UserRole,
} from "./types";

export interface SignInInput {
  username: string;
  password: string;
}

export interface CustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface DeviceInput {
  customerId: string;
  deviceType: DeviceType;
  manufacturer: string;
  model: string;
  serialNumber?: string;
  identifyingNotes?: string;
}

export interface RepairInput {
  customerId: string;
  deviceId: string;
  reportedProblem: string;
  priority: Priority;
  assignedTechnicianId?: string;
  estimatedCompletion?: string;
  intake?: Omit<IntakeRecord, "id" | "repairId" | "employeeId" | "createdAt">;
}

export interface RepairMetaInput {
  priority?: Priority;
  estimatedCompletion?: string;
  customerUpdate?: string;
  reportedProblem?: string;
}

export interface EmployeeInput {
  username: string;
  displayName: string;
  role: UserRole;
  password: string;
}

/**
 * The single boundary between the RepairDesk UI and any backend.
 * `MockRepairDeskApi` implements it fully in-browser; a real backend
 * implementation only has to satisfy this same interface.
 */
export interface RepairDeskApi {
  // Authentication
  signIn(input: SignInInput): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;

  // Employees (admin only, except listTechnicians)
  listEmployees(): Promise<User[]>;
  listTechnicians(): Promise<User[]>;
  createEmployee(input: EmployeeInput): Promise<User>;
  updateEmployee(
    id: string,
    input: Partial<Pick<User, "displayName" | "role">>,
  ): Promise<User>;
  setEmployeeActive(id: string, active: boolean): Promise<User>;

  // Customers
  createCustomer(input: CustomerInput): Promise<Customer>;
  listCustomers(query?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer>;
  updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer>;

  // Devices
  createDevice(input: DeviceInput): Promise<Device>;
  listDevices(customerId?: string): Promise<Device[]>;
  getDevice(id: string): Promise<Device>;

  // Repairs
  createRepair(input: RepairInput): Promise<Repair>;
  listRepairs(filters?: RepairFilters): Promise<RepairSummary[]>;
  getRepair(id: string): Promise<RepairDetail>;
  updateRepair(id: string, input: RepairMetaInput): Promise<Repair>;
  changeStatus(id: string, status: RepairStatus): Promise<Repair>;
  assignTechnician(id: string, technicianId: string | null): Promise<Repair>;

  // Repair details
  addDiagnosis(
    repairId: string,
    input: { description: string; recommendedRepair: string; estimatedCost?: number },
  ): Promise<Diagnosis>;
  addNote(
    repairId: string,
    input: { content: string; visibility: NoteVisibility },
  ): Promise<RepairNote>;
  addPart(
    repairId: string,
    input: {
      name: string;
      partNumber?: string;
      quantity: number;
      unitCost?: number;
      notes?: string;
    },
  ): Promise<RepairPart>;
  addAttachment(
    repairId: string,
    input: {
      filename: string;
      fileType: string;
      fileSize: number;
      url: string;
      category: AttachmentCategory;
    },
  ): Promise<Attachment>;
  getActivity(repairId: string): Promise<ActivityEvent[]>;

  // Dashboard
  getDashboard(): Promise<DashboardSummary>;

  // Public tracking (no authentication)
  trackRepair(
    ticketNumber: string,
    trackingCode: string,
  ): Promise<PublicRepairStatus>;
}

let current: RepairDeskApi | null = null;

/** Swap the implementation (mock today, real backend later, fakes in tests). */
export function setApi(impl: RepairDeskApi) {
  current = impl;
}

export function getApi(): RepairDeskApi {
  if (!current) {
    throw new Error("RepairDesk API implementation has not been configured");
  }
  return current;
}

/** Ambient accessor so components can call `api.listRepairs()` directly. */
export const api = new Proxy({} as RepairDeskApi, {
  get(_t, prop: string) {
    const impl = getApi() as unknown as Record<string, unknown>;
    const value = impl[prop];
    return typeof value === "function" ? value.bind(impl) : value;
  },
});
