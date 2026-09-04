import type { MockDb } from "./store";
import { emptyDb } from "./store";

const day = 24 * 60 * 60 * 1000;

/**
 * Deterministic demo data so the app is useful the moment it loads.
 * `now` is injectable to keep tests stable.
 */
export function seedDb(now: Date = new Date()): MockDb {
  const db = emptyDb();
  const t = (offsetDays: number) =>
    new Date(now.getTime() - offsetDays * day).toISOString();

  db.users = [
    {
      id: "u-admin",
      username: "admin",
      displayName: "Dana Okafor",
      role: "admin",
      active: true,
      password: "admin123",
      createdAt: t(120),
      updatedAt: t(120),
    },
    {
      id: "u-tech1",
      username: "miguel",
      displayName: "Miguel Santos",
      role: "technician",
      active: true,
      password: "tech123",
      createdAt: t(110),
      updatedAt: t(110),
    },
    {
      id: "u-tech2",
      username: "priya",
      displayName: "Priya Raman",
      role: "technician",
      active: true,
      password: "tech123",
      createdAt: t(90),
      updatedAt: t(90),
    },
    {
      id: "u-tech3",
      username: "leon",
      displayName: "Leon Whitaker",
      role: "technician",
      active: false,
      password: "tech123",
      createdAt: t(80),
      updatedAt: t(10),
    },
  ];

  const customers: [string, string, string, string, string][] = [
    ["c-1", "Ava", "Bennett", "(312) 555-0142", "ava.bennett@example.com"],
    ["c-2", "Marcus", "Cole", "(312) 555-0178", "marcus.cole@example.com"],
    ["c-3", "Hana", "Ito", "(773) 555-0119", "hana.ito@example.com"],
    ["c-4", "Owen", "Fletcher", "(773) 555-0164", "owen.f@example.com"],
    ["c-5", "Rosa", "Delgado", "(312) 555-0190", "rosa.delgado@example.com"],
  ];
  db.customers = customers.map(([id, firstName, lastName, phone, email], i) => ({
    id,
    firstName,
    lastName,
    phone,
    email,
    notes: undefined,
    createdAt: t(60 - i * 5),
    updatedAt: t(60 - i * 5),
  }));

  db.devices = [
    {
      id: "d-1",
      customerId: "c-1",
      deviceType: "Laptop",
      manufacturer: "Apple",
      model: 'MacBook Pro 14" M2',
      serialNumber: "C02XK1PLJG5H",
      identifyingNotes: "Space grey, sticker on lid",
      createdAt: t(60),
      updatedAt: t(60),
    },
    {
      id: "d-2",
      customerId: "c-2",
      deviceType: "Smartphone",
      manufacturer: "Samsung",
      model: "Galaxy S23",
      serialNumber: "RF8T20ABCDE",
      createdAt: t(55),
      updatedAt: t(55),
    },
    {
      id: "d-3",
      customerId: "c-3",
      deviceType: "Game console",
      manufacturer: "Sony",
      model: "PlayStation 5",
      serialNumber: "PS5-99213",
      createdAt: t(50),
      updatedAt: t(50),
    },
    {
      id: "d-4",
      customerId: "c-4",
      deviceType: "Laptop",
      manufacturer: "Dell",
      model: "XPS 13 9315",
      serialNumber: "8QK4RM3",
      createdAt: t(45),
      updatedAt: t(45),
    },
    {
      id: "d-5",
      customerId: "c-5",
      deviceType: "Tablet",
      manufacturer: "Apple",
      model: 'iPad Air 11"',
      createdAt: t(40),
      updatedAt: t(40),
    },
    {
      id: "d-6",
      customerId: "c-1",
      deviceType: "Monitor",
      manufacturer: "LG",
      model: "27UP850",
      createdAt: t(35),
      updatedAt: t(35),
    },
  ];

  type SeedRepair = {
    id: string;
    n: number;
    customerId: string;
    deviceId: string;
    tech?: string;
    problem: string;
    priority: "low" | "normal" | "high" | "urgent";
    status: MockDb["repairs"][number]["status"];
    days: number;
    code: string;
    completed?: number;
    update?: string;
  };

  const repairs: SeedRepair[] = [
    {
      id: "r-1",
      n: 1042,
      customerId: "c-1",
      deviceId: "d-1",
      tech: "u-tech1",
      problem: "Liquid spill — laptop will not power on after coffee spill.",
      priority: "urgent",
      status: "repairing",
      days: 3,
      code: "7GQ4KD",
      update: "Board cleaned, waiting on final reassembly and testing.",
    },
    {
      id: "r-2",
      n: 1043,
      customerId: "c-2",
      deviceId: "d-2",
      tech: "u-tech2",
      problem: "Cracked screen, touch works intermittently on the left edge.",
      priority: "high",
      status: "waiting_parts",
      days: 5,
      code: "M2XP9A",
      update: "Replacement display ordered, expected in 2 business days.",
    },
    {
      id: "r-3",
      n: 1044,
      customerId: "c-3",
      deviceId: "d-3",
      problem: "Console overheats and shuts down after ~20 minutes of play.",
      priority: "normal",
      status: "received",
      days: 1,
      code: "TB63LV",
    },
    {
      id: "r-4",
      n: 1045,
      customerId: "c-4",
      deviceId: "d-4",
      tech: "u-tech1",
      problem: "Battery drains in under an hour, laptop runs hot.",
      priority: "normal",
      status: "ready_for_pickup",
      days: 8,
      code: "QH51ZR",
      update: "Battery replaced and tested. Ready for collection.",
    },
    {
      id: "r-5",
      n: 1046,
      customerId: "c-5",
      deviceId: "d-5",
      tech: "u-tech2",
      problem: "Charging port loose, cable falls out.",
      priority: "low",
      status: "completed",
      days: 20,
      completed: 14,
      code: "WD08NC",
      update: "Charging port replaced. Thanks for your business!",
    },
    {
      id: "r-6",
      n: 1047,
      customerId: "c-1",
      deviceId: "d-6",
      tech: "u-tech2",
      problem: "Monitor flickers on HDMI input 2.",
      priority: "normal",
      status: "diagnosing",
      days: 2,
      code: "K49FJT",
    },
  ];

  db.repairs = repairs.map((r) => ({
    id: r.id,
    ticketNumber: `RD-${r.n}`,
    customerId: r.customerId,
    deviceId: r.deviceId,
    assignedTechnicianId: r.tech,
    createdById: "u-admin",
    reportedProblem: r.problem,
    priority: r.priority,
    status: r.status,
    estimatedCompletion:
      r.status === "completed" ? undefined : t(-2).slice(0, 10),
    completedAt: r.completed !== undefined ? t(r.completed) : undefined,
    customerUpdate: r.update,
    trackingCode: r.code,
    createdAt: t(r.days),
    updatedAt: t(Math.max(0, r.days - 1)),
  }));

  db.intakes = repairs.map((r, i) => ({
    id: `i-${i + 1}`,
    repairId: r.id,
    employeeId: "u-admin",
    powersOn: r.id !== "r-1",
    screenCondition: r.id === "r-2" ? "Cracked, top-left corner" : "Good",
    scratches: i % 2 === 0,
    dents: i === 3,
    liquidDamage: r.id === "r-1",
    missingComponents: false,
    chargerReceived: true,
    caseReceived: i % 3 === 0,
    otherAccessories: r.id === "r-3" ? "One DualSense controller" : undefined,
    conditionNotes: "Condition documented at counter with customer present.",
    createdAt: t(r.days),
  }));

  db.diagnoses = [
    {
      id: "dg-1",
      repairId: "r-1",
      technicianId: "u-tech1",
      description:
        "Corrosion across the logic board near the trackpad connector; keyboard flex damaged.",
      recommendedRepair:
        "Ultrasonic clean, replace keyboard flex cable and trackpad connector.",
      estimatedCost: 285,
      createdAt: t(2),
      updatedAt: t(2),
    },
    {
      id: "dg-2",
      repairId: "r-2",
      technicianId: "u-tech2",
      description: "Digitizer damaged; OLED panel shows no dead pixels.",
      recommendedRepair: "Replace full display assembly.",
      estimatedCost: 220,
      createdAt: t(4),
      updatedAt: t(4),
    },
    {
      id: "dg-3",
      repairId: "r-4",
      technicianId: "u-tech1",
      description: "Battery health at 61%, 812 cycles. Fan intake heavily dusty.",
      recommendedRepair: "Replace battery, clean thermal path, repaste.",
      estimatedCost: 165,
      createdAt: t(7),
      updatedAt: t(7),
    },
  ];

  db.notes = [
    {
      id: "n-1",
      repairId: "r-1",
      authorId: "u-tech1",
      visibility: "internal",
      content: "Board in ultrasonic bath, 12 min cycle. Photos taken before clean.",
      createdAt: t(2),
    },
    {
      id: "n-2",
      repairId: "r-1",
      authorId: "u-tech1",
      visibility: "customer",
      content: "Good news — the board survived the spill and is drying now.",
      createdAt: t(1),
    },
    {
      id: "n-3",
      repairId: "r-2",
      authorId: "u-tech2",
      visibility: "customer",
      content: "Display ordered. We'll message you as soon as it lands.",
      createdAt: t(3),
    },
    {
      id: "n-4",
      repairId: "r-4",
      authorId: "u-tech1",
      visibility: "internal",
      content: "Ran 2h load test after battery swap — stable at 74C.",
      createdAt: t(6),
    },
  ];

  db.parts = [
    {
      id: "p-1",
      repairId: "r-1",
      recordedById: "u-tech1",
      name: "Keyboard flex cable",
      partNumber: "A2779-KFC",
      quantity: 1,
      unitCost: 42,
      createdAt: t(2),
    },
    {
      id: "p-2",
      repairId: "r-4",
      recordedById: "u-tech1",
      name: "Battery pack 52Wh",
      partNumber: "DXPS-52WH",
      quantity: 1,
      unitCost: 88,
      notes: "OEM equivalent",
      createdAt: t(6),
    },
    {
      id: "p-3",
      repairId: "r-4",
      recordedById: "u-tech1",
      name: "Thermal paste",
      quantity: 1,
      unitCost: 6,
      createdAt: t(6),
    },
  ];

  db.activity = db.repairs.flatMap((r, i) => [
    {
      id: `a-${i}-1`,
      repairId: r.id,
      actorId: "u-admin",
      type: "repair_created" as const,
      details: { ticketNumber: r.ticketNumber },
      createdAt: r.createdAt,
    },
    ...(r.assignedTechnicianId
      ? [
          {
            id: `a-${i}-2`,
            repairId: r.id,
            actorId: "u-admin",
            type: "technician_assigned" as const,
            details: { technicianId: r.assignedTechnicianId },
            createdAt: r.createdAt,
          },
        ]
      : []),
    {
      id: `a-${i}-3`,
      repairId: r.id,
      actorId: r.assignedTechnicianId ?? "u-admin",
      type: "status_changed" as const,
      details: { from: "received", to: r.status },
      createdAt: r.updatedAt,
    },
  ]);

  return db;
}
