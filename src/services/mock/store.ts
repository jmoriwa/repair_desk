import type {
  ActivityEvent,
  Attachment,
  Customer,
  Device,
  Diagnosis,
  IntakeRecord,
  Repair,
  RepairNote,
  RepairPart,
  User,
} from "../types";

export interface MockDb {
  users: (User & { password: string })[];
  customers: Customer[];
  devices: Device[];
  repairs: Repair[];
  intakes: IntakeRecord[];
  diagnoses: Diagnosis[];
  notes: RepairNote[];
  parts: RepairPart[];
  attachments: Attachment[];
  activity: ActivityEvent[];
  sessionUserId: string | null;
}

export const STORAGE_KEY = "repairdesk.mockdb.v1";

export function emptyDb(): MockDb {
  return {
    users: [],
    customers: [],
    devices: [],
    repairs: [],
    intakes: [],
    diagnoses: [],
    notes: [],
    parts: [],
    attachments: [],
    activity: [],
    sessionUserId: null,
  };
}

export interface Persistence {
  load(): MockDb | null;
  save(db: MockDb): void;
  clear(): void;
}

/** No-op persistence — used during SSR and in tests. */
export const memoryPersistence = (): Persistence => {
  let held: MockDb | null = null;
  return {
    load: () => held,
    save: (db) => {
      held = db;
    },
    clear: () => {
      held = null;
    },
  };
};

export const localStoragePersistence = (): Persistence => ({
  load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MockDb) : null;
    } catch {
      return null;
    }
  },
  save(db) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* storage unavailable — keep working in memory */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
});

export function defaultPersistence(): Persistence {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    return localStoragePersistence();
  }
  return memoryPersistence();
}
