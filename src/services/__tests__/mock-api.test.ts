import { beforeEach, describe, expect, it } from "vitest";
import { MockRepairDeskApi } from "../mock/mock-api";
import { memoryPersistence } from "../mock/store";
import { seedDb } from "../mock/seed";
import { ApiError } from "../types";

const FIXED = new Date("2026-09-04T12:00:00.000Z");

function makeApi() {
  return new MockRepairDeskApi({
    persistence: memoryPersistence(),
    now: () => FIXED,
    seed: () => seedDb(FIXED),
  });
}

async function signedInAdmin() {
  const api = makeApi();
  await api.signIn({ username: "admin", password: "admin123" });
  return api;
}

async function expectApiError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(ApiError);
  await promise.catch((e: ApiError) => expect(e.code).toBe(code));
}

describe("authentication", () => {
  let api: MockRepairDeskApi;
  beforeEach(() => {
    api = makeApi();
  });

  it("signs in an active administrator", async () => {
    const user = await api.signIn({ username: "admin", password: "admin123" });
    expect(user.role).toBe("admin");
    expect(user).not.toHaveProperty("password");
    expect(await api.getCurrentUser()).toMatchObject({ id: user.id });
  });

  it("is case-insensitive on the username", async () => {
    await expect(
      api.signIn({ username: "  ADMIN ", password: "admin123" }),
    ).resolves.toMatchObject({ username: "admin" });
  });

  it("rejects a wrong password", async () => {
    await expectApiError(
      api.signIn({ username: "admin", password: "nope" }),
      "invalid_credentials",
    );
  });

  it("rejects a disabled employee", async () => {
    await expectApiError(
      api.signIn({ username: "leon", password: "tech123" }),
      "account_disabled",
    );
  });

  it("signs out", async () => {
    await api.signIn({ username: "admin", password: "admin123" });
    await api.signOut();
    expect(await api.getCurrentUser()).toBeNull();
  });

  it("blocks unauthenticated reads", async () => {
    await expectApiError(api.listRepairs(), "unauthenticated");
  });
});

describe("authorization", () => {
  it("keeps employee management admin-only", async () => {
    const api = makeApi();
    await api.signIn({ username: "miguel", password: "tech123" });
    await expectApiError(api.listEmployees(), "forbidden");
    await expectApiError(
      api.createEmployee({
        username: "x",
        displayName: "X",
        role: "technician",
        password: "secret1",
      }),
      "forbidden",
    );
  });

  it("lets an admin create and disable an employee", async () => {
    const api = await signedInAdmin();
    const created = await api.createEmployee({
      username: "sam",
      displayName: "Sam Reeve",
      role: "technician",
      password: "secret1",
    });
    expect(created.active).toBe(true);

    await api.setEmployeeActive(created.id, false);
    await api.signOut();
    await expectApiError(
      api.signIn({ username: "sam", password: "secret1" }),
      "account_disabled",
    );
  });

  it("prevents an admin disabling their own account", async () => {
    const api = await signedInAdmin();
    const me = await api.getCurrentUser();
    await expectApiError(api.setEmployeeActive(me!.id, false), "validation");
  });
});

describe("intake flow", () => {
  it("creates customer, device and repair with a unique ticket number", async () => {
    const api = await signedInAdmin();
    const customer = await api.createCustomer({
      firstName: "Nina",
      lastName: "Park",
      phone: "(312) 555-0777",
    });
    const device = await api.createDevice({
      customerId: customer.id,
      deviceType: "Laptop",
      manufacturer: "Lenovo",
      model: "ThinkPad X1",
    });
    const repair = await api.createRepair({
      customerId: customer.id,
      deviceId: device.id,
      reportedProblem: "Hinge is loose",
      priority: "normal",
      intake: {
        powersOn: true,
        screenCondition: "Good",
        scratches: true,
        dents: false,
        liquidDamage: false,
        missingComponents: false,
        chargerReceived: true,
        caseReceived: false,
        otherAccessories: "Sleeve",
        conditionNotes: "Minor wear",
      },
    });

    expect(repair.ticketNumber).toMatch(/^RD-\d+$/);
    expect(repair.status).toBe("received");
    expect(repair.trackingCode).toHaveLength(6);

    const all = await api.listRepairs();
    const tickets = all.map((r) => r.repair.ticketNumber);
    expect(new Set(tickets).size).toBe(tickets.length);

    const detail = await api.getRepair(repair.id);
    expect(detail.intake?.chargerReceived).toBe(true);
    expect(detail.intake?.otherAccessories).toBe("Sleeve");
    expect(detail.activity.some((a) => a.type === "repair_created")).toBe(true);
  });

  it("flags a likely duplicate customer", async () => {
    const api = await signedInAdmin();
    await expectApiError(
      api.createCustomer({
        firstName: "Ava",
        lastName: "Bennett",
        phone: "3125550142",
      }),
      "validation",
    );
  });

  it("refuses a device that belongs to another customer", async () => {
    const api = await signedInAdmin();
    await expectApiError(
      api.createRepair({
        customerId: "c-2",
        deviceId: "d-1",
        reportedProblem: "Broken",
        priority: "low",
      }),
      "validation",
    );
  });
});

describe("repair workflow", () => {
  it("moves a repair through the lifecycle and logs activity", async () => {
    const api = await signedInAdmin();
    await api.changeStatus("r-3", "diagnosing");
    await api.addDiagnosis("r-3", {
      description: "Dust-clogged heatsink",
      recommendedRepair: "Clean and repaste",
      estimatedCost: 90,
    });
    await api.changeStatus("r-3", "repairing");
    await api.addPart("r-3", { name: "Thermal paste", quantity: 1, unitCost: 6 });
    await api.changeStatus("r-3", "ready_for_pickup");
    const completed = await api.changeStatus("r-3", "completed");

    expect(completed.status).toBe("completed");
    expect(completed.completedAt).toBeTruthy();

    const detail = await api.getRepair("r-3");
    const types = detail.activity.map((a) => a.type);
    expect(types).toContain("status_changed");
    expect(types).toContain("diagnosis_recorded");
    expect(types).toContain("part_added");
    expect(types).toContain("repair_completed");
  });

  it("rejects an invalid transition", async () => {
    const api = await signedInAdmin();
    await expectApiError(api.changeStatus("r-3", "completed"), "invalid_transition");
    const detail = await api.getRepair("r-3");
    expect(detail.repair.status).toBe("received");
  });

  it("assigns and reassigns a technician, recording history", async () => {
    const api = await signedInAdmin();
    await api.assignTechnician("r-3", "u-tech1");
    const reassigned = await api.assignTechnician("r-3", "u-tech2");
    expect(reassigned.assignedTechnicianId).toBe("u-tech2");
    const activity = await api.getActivity("r-3");
    expect(activity.filter((a) => a.type === "technician_assigned")).toHaveLength(2);
  });

  it("will not assign a disabled employee", async () => {
    const api = await signedInAdmin();
    await expectApiError(api.assignTechnician("r-3", "u-tech3"), "validation");
  });

  it("appends notes without overwriting earlier ones", async () => {
    const api = await signedInAdmin();
    const before = (await api.getRepair("r-1")).notes.length;
    await api.addNote("r-1", { content: "Reassembled", visibility: "internal" });
    const after = await api.getRepair("r-1");
    expect(after.notes).toHaveLength(before + 1);
    expect(after.notes.at(-1)?.content).toBe("Reassembled");
  });

  it("validates attachments", async () => {
    const api = await signedInAdmin();
    await expectApiError(
      api.addAttachment("r-1", {
        filename: "notes.pdf",
        fileType: "application/pdf",
        fileSize: 1000,
        url: "blob:x",
        category: "intake",
      }),
      "validation",
    );
    await expectApiError(
      api.addAttachment("r-1", {
        filename: "huge.png",
        fileType: "image/png",
        fileSize: 20 * 1024 * 1024,
        url: "blob:x",
        category: "intake",
      }),
      "validation",
    );
    const ok = await api.addAttachment("r-1", {
      filename: "board.jpg",
      fileType: "image/jpeg",
      fileSize: 400_000,
      url: "blob:x",
      category: "damage",
    });
    expect(ok.uploadedById).toBe("u-admin");
  });
});

describe("search and queues", () => {
  it("finds a repair by ticket number", async () => {
    const api = await signedInAdmin();
    const results = await api.listRepairs({ query: "rd-1042" });
    expect(results).toHaveLength(1);
    expect(results[0]!.repair.id).toBe("r-1");
  });

  it("finds repairs by customer name, phone and device model", async () => {
    const api = await signedInAdmin();
    expect(await api.listRepairs({ query: "bennett" })).not.toHaveLength(0);
    expect(await api.listRepairs({ query: "555-0178" })).not.toHaveLength(0);
    expect(await api.listRepairs({ query: "galaxy" })).not.toHaveLength(0);
  });

  it("filters by status and by assigned technician", async () => {
    const api = await signedInAdmin();
    const open = await api.listRepairs({ status: "open" });
    expect(open.every((r) => r.repair.status !== "completed")).toBe(true);
    const mine = await api.listRepairs({ technicianId: "u-tech1" });
    expect(mine.every((r) => r.repair.assignedTechnicianId === "u-tech1")).toBe(true);
  });

  it("keeps completed repairs in customer and device history", async () => {
    const api = await signedInAdmin();
    const history = await api.listRepairs({ customerId: "c-5" });
    expect(history.some((r) => r.repair.status === "completed")).toBe(true);
  });

  it("summarises the dashboard", async () => {
    const api = await signedInAdmin();
    const dash = await api.getDashboard();
    expect(dash.openRepairs).toBeGreaterThan(0);
    expect(dash.readyForPickup).toBe(1);
    expect(dash.recent.length).toBeGreaterThan(0);
  });
});

describe("public tracking", () => {
  it("returns only customer-facing information for valid credentials", async () => {
    const api = makeApi();
    const status = await api.trackRepair("rd-1042", "7gq4kd");
    expect(status.status).toBe("repairing");
    expect(status.deviceLabel).toContain("MacBook");
    expect(status.customerNotes.every((n) => !n.content.includes("ultrasonic"))).toBe(
      true,
    );
    expect(JSON.stringify(status)).not.toContain("Photos taken before clean");
  });

  it("gives the same generic error for a bad code and an unknown ticket", async () => {
    const api = makeApi();
    const a = await api.trackRepair("RD-1042", "WRONG1").catch((e: ApiError) => e);
    const b = await api.trackRepair("RD-9999", "WRONG1").catch((e: ApiError) => e);
    expect((a as ApiError).code).toBe("not_found");
    expect((a as ApiError).message).toBe((b as ApiError).message);
  });

  it("rate limits repeated invalid attempts", async () => {
    const api = makeApi();
    for (let i = 0; i < 5; i++) {
      await api.trackRepair("RD-1042", "BAD000").catch(() => undefined);
    }
    await expectApiError(api.trackRepair("RD-1042", "BAD000"), "rate_limited");
  });

  it("needs no authenticated session", async () => {
    const api = makeApi();
    expect(await api.getCurrentUser()).toBeNull();
    await expect(api.trackRepair("RD-1046", "WD08NC")).resolves.toBeTruthy();
  });
});

describe("persistence", () => {
  it("keeps confirmed records across a fresh client instance", async () => {
    const persistence = memoryPersistence();
    const first = new MockRepairDeskApi({
      persistence,
      now: () => FIXED,
      seed: () => seedDb(FIXED),
    });
    await first.signIn({ username: "admin", password: "admin123" });
    const customer = await first.createCustomer({
      firstName: "Ruth",
      lastName: "Alvarez",
      phone: "(312) 555-0311",
    });

    const second = new MockRepairDeskApi({ persistence, now: () => FIXED });
    expect(await second.getCurrentUser()).toMatchObject({ username: "admin" });
    await expect(second.getCustomer(customer.id)).resolves.toMatchObject({
      lastName: "Alvarez",
    });
  });
});
