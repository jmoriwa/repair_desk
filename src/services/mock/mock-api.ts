import type {
  CustomerInput,
  DeviceInput,
  EmployeeInput,
  RepairDeskApi,
  RepairInput,
  RepairMetaInput,
  SignInInput,
} from "../api";
import {
  ApiError,
  type ActivityEvent,
  type ActivityType,
  type Attachment,
  type Customer,
  type DashboardSummary,
  type Device,
  type Diagnosis,
  type PublicRepairStatus,
  type Repair,
  type RepairDetail,
  type RepairFilters,
  type RepairNote,
  type RepairPart,
  type RepairStatus,
  type RepairSummary,
  type User,
} from "../types";
import { canTransition, isOpen, OPEN_STATUSES } from "../workflow";
import {
  defaultPersistence,
  type MockDb,
  type Persistence,
} from "./store";
import { seedDb } from "./seed";

export interface MockApiOptions {
  persistence?: Persistence;
  /** Simulated network latency in ms. */
  latency?: number;
  now?: () => Date;
  seed?: () => MockDb;
}

const TRACKING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function stripPassword(user: User & { password: string }): User {
  const { password: _password, ...rest } = user;
  return rest;
}

/**
 * A complete in-browser implementation of `RepairDeskApi`.
 * Data lives in a JSON document persisted to localStorage, so the whole
 * product is usable — and testable — with no backend running.
 */
export class MockRepairDeskApi implements RepairDeskApi {
  private db: MockDb;
  private persistence: Persistence;
  private latency: number;
  private now: () => Date;
  private trackingAttempts = new Map<string, { count: number; first: number }>();

  constructor(options: MockApiOptions = {}) {
    this.persistence = options.persistence ?? defaultPersistence();
    this.latency = options.latency ?? 0;
    this.now = options.now ?? (() => new Date());
    const loaded = this.persistence.load();
    this.db = loaded ?? (options.seed ? options.seed() : seedDb(this.now()));
    if (!loaded) this.persist();
  }

  // ---------------------------------------------------------------- internals

  private persist() {
    this.persistence.save(this.db);
  }

  private async tick() {
    if (this.latency > 0) {
      await new Promise((r) => setTimeout(r, this.latency));
    }
  }

  private iso() {
    return this.now().toISOString();
  }

  private id(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private requireUser(): User {
    const id = this.db.sessionUserId;
    const found = id ? this.db.users.find((u) => u.id === id) : undefined;
    if (!found) throw new ApiError("unauthenticated", "Please sign in to continue.");
    if (!found.active)
      throw new ApiError("account_disabled", "This account has been disabled.");
    return stripPassword(found);
  }

  private requireAdmin(): User {
    const user = this.requireUser();
    if (user.role !== "admin") {
      throw new ApiError("forbidden", "Administrator access is required.");
    }
    return user;
  }

  private log(
    repairId: string,
    actorId: string,
    type: ActivityType,
    details: ActivityEvent["details"] = {},
  ) {
    this.db.activity.push({
      id: this.id("a"),
      repairId,
      actorId,
      type,
      details,
      createdAt: this.iso(),
    });
  }

  private find<T extends { id: string }>(list: T[], id: string, label: string): T {
    const item = list.find((x) => x.id === id);
    if (!item) throw new ApiError("not_found", `${label} not found.`);
    return item;
  }

  private nextTicketNumber(): string {
    const numbers = this.db.repairs
      .map((r) => Number.parseInt(r.ticketNumber.replace("RD-", ""), 10))
      .filter((n) => Number.isFinite(n));
    const next = (numbers.length ? Math.max(...numbers) : 1041) + 1;
    return `RD-${next}`;
  }

  private trackingCode(): string {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += TRACKING_ALPHABET[Math.floor(Math.random() * TRACKING_ALPHABET.length)];
    }
    return this.db.repairs.some((r) => r.trackingCode === code)
      ? this.trackingCode()
      : code;
  }

  /** Test/dev helper — wipe persisted data and reseed. */
  reset(db?: MockDb) {
    this.db = db ?? seedDb(this.now());
    this.persist();
  }

  // ----------------------------------------------------------------- auth

  async signIn({ username, password }: SignInInput): Promise<User> {
    await this.tick();
    const user = this.db.users.find(
      (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
    );
    if (!user || user.password !== password) {
      throw new ApiError("invalid_credentials", "Incorrect username or password.");
    }
    if (!user.active) {
      throw new ApiError("account_disabled", "This account has been disabled.");
    }
    this.db.sessionUserId = user.id;
    this.persist();
    return stripPassword(user);
  }

  async signOut(): Promise<void> {
    await this.tick();
    this.db.sessionUserId = null;
    this.persist();
  }

  async getCurrentUser(): Promise<User | null> {
    await this.tick();
    const id = this.db.sessionUserId;
    if (!id) return null;
    const user = this.db.users.find((u) => u.id === id);
    if (!user || !user.active) {
      this.db.sessionUserId = null;
      this.persist();
      return null;
    }
    return stripPassword(user);
  }

  // ------------------------------------------------------------- employees

  async listEmployees(): Promise<User[]> {
    await this.tick();
    this.requireAdmin();
    return this.db.users.map(stripPassword);
  }

  async listTechnicians(): Promise<User[]> {
    await this.tick();
    this.requireUser();
    return this.db.users
      .filter((u) => u.role === "technician" && u.active)
      .map(stripPassword);
  }

  async createEmployee(input: EmployeeInput): Promise<User> {
    await this.tick();
    this.requireAdmin();
    const username = input.username.trim().toLowerCase();
    if (!username || !input.displayName.trim() || input.password.length < 6) {
      throw new ApiError(
        "validation",
        "Username, display name and a 6+ character password are required.",
      );
    }
    if (this.db.users.some((u) => u.username.toLowerCase() === username)) {
      throw new ApiError("validation", "That username is already taken.");
    }
    const user = {
      id: this.id("u"),
      username,
      displayName: input.displayName.trim(),
      role: input.role,
      active: true,
      password: input.password,
      createdAt: this.iso(),
      updatedAt: this.iso(),
    };
    this.db.users.push(user);
    this.persist();
    return stripPassword(user);
  }

  async updateEmployee(
    id: string,
    input: Partial<Pick<User, "displayName" | "role">>,
  ): Promise<User> {
    await this.tick();
    this.requireAdmin();
    const user = this.find(this.db.users, id, "Employee");
    Object.assign(user, input, { updatedAt: this.iso() });
    this.persist();
    return stripPassword(user);
  }

  async setEmployeeActive(id: string, active: boolean): Promise<User> {
    await this.tick();
    const admin = this.requireAdmin();
    const user = this.find(this.db.users, id, "Employee");
    if (user.id === admin.id && !active) {
      throw new ApiError("validation", "You cannot disable your own account.");
    }
    user.active = active;
    user.updatedAt = this.iso();
    this.persist();
    return stripPassword(user);
  }

  // -------------------------------------------------------------- customers

  async createCustomer(input: CustomerInput): Promise<Customer> {
    await this.tick();
    this.requireUser();
    if (!input.firstName.trim() || !input.lastName.trim() || !input.phone.trim()) {
      throw new ApiError("validation", "First name, last name and phone are required.");
    }
    const phoneDigits = input.phone.replace(/\D/g, "");
    const duplicate = this.db.customers.find(
      (c) =>
        c.phone.replace(/\D/g, "") === phoneDigits &&
        c.lastName.toLowerCase() === input.lastName.trim().toLowerCase(),
    );
    if (duplicate) {
      throw new ApiError(
        "validation",
        `A customer with this phone number already exists (${duplicate.firstName} ${duplicate.lastName}).`,
      );
    }
    const customer: Customer = {
      id: this.id("c"),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      createdAt: this.iso(),
      updatedAt: this.iso(),
    };
    this.db.customers.push(customer);
    this.persist();
    return customer;
  }

  async listCustomers(query?: string): Promise<Customer[]> {
    await this.tick();
    this.requireUser();
    const q = query?.trim().toLowerCase();
    const list = !q
      ? [...this.db.customers]
      : this.db.customers.filter((c) =>
          [c.firstName, c.lastName, c.phone, c.email ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(q),
        );
    return list.sort((a, b) => a.lastName.localeCompare(b.lastName));
  }

  async getCustomer(id: string): Promise<Customer> {
    await this.tick();
    this.requireUser();
    return this.find(this.db.customers, id, "Customer");
  }

  async updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
    await this.tick();
    this.requireUser();
    const customer = this.find(this.db.customers, id, "Customer");
    Object.assign(customer, input, { updatedAt: this.iso() });
    this.persist();
    return customer;
  }

  // ---------------------------------------------------------------- devices

  async createDevice(input: DeviceInput): Promise<Device> {
    await this.tick();
    this.requireUser();
    this.find(this.db.customers, input.customerId, "Customer");
    if (!input.manufacturer.trim() || !input.model.trim()) {
      throw new ApiError("validation", "Manufacturer and model are required.");
    }
    const device: Device = {
      id: this.id("d"),
      customerId: input.customerId,
      deviceType: input.deviceType,
      manufacturer: input.manufacturer.trim(),
      model: input.model.trim(),
      serialNumber: input.serialNumber?.trim() || undefined,
      identifyingNotes: input.identifyingNotes?.trim() || undefined,
      createdAt: this.iso(),
      updatedAt: this.iso(),
    };
    this.db.devices.push(device);
    this.persist();
    return device;
  }

  async listDevices(customerId?: string): Promise<Device[]> {
    await this.tick();
    this.requireUser();
    return this.db.devices.filter((d) => !customerId || d.customerId === customerId);
  }

  async getDevice(id: string): Promise<Device> {
    await this.tick();
    this.requireUser();
    return this.find(this.db.devices, id, "Device");
  }

  // ---------------------------------------------------------------- repairs

  async createRepair(input: RepairInput): Promise<Repair> {
    await this.tick();
    const user = this.requireUser();
    const customer = this.find(this.db.customers, input.customerId, "Customer");
    const device = this.find(this.db.devices, input.deviceId, "Device");
    if (device.customerId !== customer.id) {
      throw new ApiError("validation", "That device belongs to a different customer.");
    }
    if (!input.reportedProblem.trim()) {
      throw new ApiError("validation", "Describe the problem the customer reported.");
    }
    const repair: Repair = {
      id: this.id("r"),
      ticketNumber: this.nextTicketNumber(),
      customerId: customer.id,
      deviceId: device.id,
      assignedTechnicianId: input.assignedTechnicianId,
      createdById: user.id,
      reportedProblem: input.reportedProblem.trim(),
      priority: input.priority,
      status: "received",
      estimatedCompletion: input.estimatedCompletion,
      trackingCode: this.trackingCode(),
      createdAt: this.iso(),
      updatedAt: this.iso(),
    };
    this.db.repairs.push(repair);
    this.log(repair.id, user.id, "repair_created", {
      ticketNumber: repair.ticketNumber,
    });
    if (input.assignedTechnicianId) {
      this.log(repair.id, user.id, "technician_assigned", {
        technicianId: input.assignedTechnicianId,
      });
    }
    if (input.intake) {
      this.db.intakes.push({
        id: this.id("i"),
        repairId: repair.id,
        employeeId: user.id,
        ...input.intake,
        createdAt: this.iso(),
      });
      this.log(repair.id, user.id, "intake_recorded", {});
    }
    this.persist();
    return repair;
  }

  async listRepairs(filters: RepairFilters = {}): Promise<RepairSummary[]> {
    await this.tick();
    this.requireUser();
    const q = filters.query?.trim().toLowerCase();
    return this.db.repairs
      .filter((r) => {
        if (filters.status === "open" && !isOpen(r.status)) return false;
        if (
          filters.status &&
          filters.status !== "all" &&
          filters.status !== "open" &&
          r.status !== filters.status
        )
          return false;
        if (filters.technicianId && r.assignedTechnicianId !== filters.technicianId)
          return false;
        if (filters.priority && r.priority !== filters.priority) return false;
        if (filters.customerId && r.customerId !== filters.customerId) return false;
        if (filters.deviceId && r.deviceId !== filters.deviceId) return false;
        if (q) {
          const customer = this.db.customers.find((c) => c.id === r.customerId);
          const device = this.db.devices.find((d) => d.id === r.deviceId);
          const haystack = [
            r.ticketNumber,
            r.reportedProblem,
            customer?.firstName,
            customer?.lastName,
            customer?.phone,
            customer?.email,
            device?.manufacturer,
            device?.model,
            device?.serialNumber,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((r) => this.toSummary(r));
  }

  private toSummary(repair: Repair): RepairSummary {
    return {
      repair,
      customer: this.find(this.db.customers, repair.customerId, "Customer"),
      device: this.find(this.db.devices, repair.deviceId, "Device"),
      technician: repair.assignedTechnicianId
        ? this.db.users
            .filter((u) => u.id === repair.assignedTechnicianId)
            .map(stripPassword)[0]
        : undefined,
    };
  }

  async getRepair(id: string): Promise<RepairDetail> {
    await this.tick();
    this.requireUser();
    const repair = this.find(this.db.repairs, id, "Repair");
    const summary = this.toSummary(repair);
    const byDate = <T extends { createdAt: string }>(a: T, b: T) =>
      a.createdAt.localeCompare(b.createdAt);
    return {
      ...summary,
      createdBy: this.db.users
        .filter((u) => u.id === repair.createdById)
        .map(stripPassword)[0],
      intake: this.db.intakes.find((i) => i.repairId === id),
      diagnoses: this.db.diagnoses.filter((d) => d.repairId === id).sort(byDate),
      notes: this.db.notes.filter((n) => n.repairId === id).sort(byDate),
      parts: this.db.parts.filter((p) => p.repairId === id).sort(byDate),
      attachments: this.db.attachments.filter((a) => a.repairId === id).sort(byDate),
      activity: this.db.activity
        .filter((a) => a.repairId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async updateRepair(id: string, input: RepairMetaInput): Promise<Repair> {
    await this.tick();
    const user = this.requireUser();
    const repair = this.find(this.db.repairs, id, "Repair");
    if (input.priority && input.priority !== repair.priority) {
      this.log(id, user.id, "priority_changed", {
        from: repair.priority,
        to: input.priority,
      });
      repair.priority = input.priority;
    }
    if (
      input.estimatedCompletion !== undefined &&
      input.estimatedCompletion !== repair.estimatedCompletion
    ) {
      this.log(id, user.id, "estimate_changed", { to: input.estimatedCompletion });
      repair.estimatedCompletion = input.estimatedCompletion || undefined;
    }
    if (
      input.customerUpdate !== undefined &&
      input.customerUpdate !== repair.customerUpdate
    ) {
      this.log(id, user.id, "customer_update_changed", {});
      repair.customerUpdate = input.customerUpdate || undefined;
    }
    if (input.reportedProblem !== undefined) {
      repair.reportedProblem = input.reportedProblem;
    }
    repair.updatedAt = this.iso();
    this.persist();
    return repair;
  }

  async changeStatus(id: string, status: RepairStatus): Promise<Repair> {
    await this.tick();
    const user = this.requireUser();
    const repair = this.find(this.db.repairs, id, "Repair");
    if (!canTransition(repair.status, status)) {
      throw new ApiError(
        "invalid_transition",
        `A repair cannot move from ${repair.status.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}.`,
      );
    }
    const from = repair.status;
    repair.status = status;
    repair.updatedAt = this.iso();
    if (status === "completed") {
      repair.completedAt = this.iso();
    }
    this.log(id, user.id, "status_changed", { from, to: status });
    if (status === "completed") this.log(id, user.id, "repair_completed", {});
    this.persist();
    return repair;
  }

  async assignTechnician(id: string, technicianId: string | null): Promise<Repair> {
    await this.tick();
    const user = this.requireUser();
    const repair = this.find(this.db.repairs, id, "Repair");
    if (technicianId) {
      const tech = this.find(this.db.users, technicianId, "Technician");
      if (!tech.active)
        throw new ApiError("validation", "That employee account is disabled.");
    }
    repair.assignedTechnicianId = technicianId ?? undefined;
    repair.updatedAt = this.iso();
    this.log(id, user.id, "technician_assigned", { technicianId });
    this.persist();
    return repair;
  }

  // --------------------------------------------------------- repair details

  async addDiagnosis(
    repairId: string,
    input: { description: string; recommendedRepair: string; estimatedCost?: number },
  ): Promise<Diagnosis> {
    await this.tick();
    const user = this.requireUser();
    this.find(this.db.repairs, repairId, "Repair");
    if (!input.description.trim() || !input.recommendedRepair.trim()) {
      throw new ApiError("validation", "Diagnosis and recommended repair are required.");
    }
    const diagnosis: Diagnosis = {
      id: this.id("dg"),
      repairId,
      technicianId: user.id,
      description: input.description.trim(),
      recommendedRepair: input.recommendedRepair.trim(),
      estimatedCost: input.estimatedCost,
      createdAt: this.iso(),
      updatedAt: this.iso(),
    };
    this.db.diagnoses.push(diagnosis);
    this.log(repairId, user.id, "diagnosis_recorded", {
      estimatedCost: input.estimatedCost ?? null,
    });
    this.persist();
    return diagnosis;
  }

  async addNote(
    repairId: string,
    input: { content: string; visibility: RepairNote["visibility"] },
  ): Promise<RepairNote> {
    await this.tick();
    const user = this.requireUser();
    this.find(this.db.repairs, repairId, "Repair");
    if (!input.content.trim()) {
      throw new ApiError("validation", "A note cannot be empty.");
    }
    const note: RepairNote = {
      id: this.id("n"),
      repairId,
      authorId: user.id,
      visibility: input.visibility,
      content: input.content.trim(),
      createdAt: this.iso(),
    };
    this.db.notes.push(note);
    this.log(repairId, user.id, "note_added", { visibility: input.visibility });
    this.persist();
    return note;
  }

  async addPart(
    repairId: string,
    input: {
      name: string;
      partNumber?: string;
      quantity: number;
      unitCost?: number;
      notes?: string;
    },
  ): Promise<RepairPart> {
    await this.tick();
    const user = this.requireUser();
    this.find(this.db.repairs, repairId, "Repair");
    if (!input.name.trim()) throw new ApiError("validation", "Part name is required.");
    if (!Number.isFinite(input.quantity) || input.quantity < 1) {
      throw new ApiError("validation", "Quantity must be at least 1.");
    }
    const part: RepairPart = {
      id: this.id("p"),
      repairId,
      recordedById: user.id,
      name: input.name.trim(),
      partNumber: input.partNumber?.trim() || undefined,
      quantity: input.quantity,
      unitCost: input.unitCost,
      notes: input.notes?.trim() || undefined,
      createdAt: this.iso(),
    };
    this.db.parts.push(part);
    this.log(repairId, user.id, "part_added", { name: part.name, qty: part.quantity });
    this.persist();
    return part;
  }

  async addAttachment(
    repairId: string,
    input: {
      filename: string;
      fileType: string;
      fileSize: number;
      url: string;
      category: Attachment["category"];
    },
  ): Promise<Attachment> {
    await this.tick();
    const user = this.requireUser();
    this.find(this.db.repairs, repairId, "Repair");
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/heic"];
    if (!allowed.includes(input.fileType)) {
      throw new ApiError("validation", "Only PNG, JPEG, WEBP or HEIC images are allowed.");
    }
    if (input.fileSize > 8 * 1024 * 1024) {
      throw new ApiError("validation", "Images must be 8 MB or smaller.");
    }
    const attachment: Attachment = {
      id: this.id("at"),
      repairId,
      uploadedById: user.id,
      url: input.url,
      filename: input.filename,
      fileType: input.fileType,
      fileSize: input.fileSize,
      category: input.category,
      createdAt: this.iso(),
    };
    this.db.attachments.push(attachment);
    this.log(repairId, user.id, "attachment_uploaded", {
      filename: input.filename,
      category: input.category,
    });
    this.persist();
    return attachment;
  }

  async getActivity(repairId: string): Promise<ActivityEvent[]> {
    await this.tick();
    this.requireUser();
    return this.db.activity
      .filter((a) => a.repairId === repairId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // -------------------------------------------------------------- dashboard

  async getDashboard(): Promise<DashboardSummary> {
    await this.tick();
    this.requireUser();
    const repairs = this.db.repairs;
    const weekAgo = new Date(this.now().getTime() - 7 * 86400000).toISOString();
    return {
      openRepairs: repairs.filter((r) => isOpen(r.status)).length,
      readyForPickup: repairs.filter((r) => r.status === "ready_for_pickup").length,
      waiting: repairs.filter(
        (r) => r.status === "waiting_parts" || r.status === "waiting_customer",
      ).length,
      completedThisWeek: repairs.filter(
        (r) => r.completedAt && r.completedAt >= weekAgo,
      ).length,
      unassigned: repairs.filter((r) => isOpen(r.status) && !r.assignedTechnicianId)
        .length,
      byStatus: OPEN_STATUSES.map((status) => ({
        status,
        count: repairs.filter((r) => r.status === status).length,
      })),
      recent: [...repairs]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6)
        .map((r) => this.toSummary(r)),
    };
  }

  // --------------------------------------------------------- public tracking

  async trackRepair(
    ticketNumber: string,
    trackingCode: string,
  ): Promise<PublicRepairStatus> {
    await this.tick();
    const key = ticketNumber.trim().toUpperCase();
    const attempt = this.trackingAttempts.get(key);
    const nowMs = this.now().getTime();
    if (attempt && nowMs - attempt.first < 60_000 && attempt.count >= 5) {
      throw new ApiError(
        "rate_limited",
        "Too many attempts. Please wait a minute and try again.",
      );
    }

    const repair = this.db.repairs.find(
      (r) =>
        r.ticketNumber.toUpperCase() === key &&
        r.trackingCode.toUpperCase() === trackingCode.trim().toUpperCase(),
    );

    if (!repair) {
      // Deliberately generic: never reveals whether the ticket exists.
      this.trackingAttempts.set(key, {
        count: (attempt && nowMs - attempt.first < 60_000 ? attempt.count : 0) + 1,
        first: attempt && nowMs - attempt.first < 60_000 ? attempt.first : nowMs,
      });
      throw new ApiError(
        "not_found",
        "We couldn't find a repair with that ticket number and code.",
      );
    }

    this.trackingAttempts.delete(key);
    const device = this.db.devices.find((d) => d.id === repair.deviceId);
    return {
      ticketNumber: repair.ticketNumber,
      status: repair.status,
      deviceLabel: device ? `${device.manufacturer} ${device.model}` : "Device",
      receivedAt: repair.createdAt,
      estimatedCompletion: repair.estimatedCompletion,
      completedAt: repair.completedAt,
      customerUpdate: repair.customerUpdate,
      customerNotes: this.db.notes
        .filter((n) => n.repairId === repair.id && n.visibility === "customer")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => ({ content: n.content, createdAt: n.createdAt })),
    };
  }
}
