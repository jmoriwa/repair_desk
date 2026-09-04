import { describe, expect, it } from "vitest";
import { ALLOWED_TRANSITIONS, canTransition, isOpen } from "../workflow";
import { REPAIR_STATUSES } from "../types";

describe("repair workflow rules", () => {
  it("allows the typical happy path", () => {
    expect(canTransition("received", "diagnosing")).toBe(true);
    expect(canTransition("diagnosing", "repairing")).toBe(true);
    expect(canTransition("repairing", "ready_for_pickup")).toBe(true);
    expect(canTransition("ready_for_pickup", "completed")).toBe(true);
  });

  it("allows the documented alternative paths", () => {
    expect(canTransition("diagnosing", "waiting_customer")).toBe(true);
    expect(canTransition("diagnosing", "waiting_parts")).toBe(true);
    expect(canTransition("repairing", "waiting_parts")).toBe(true);
    expect(canTransition("diagnosing", "cannot_repair")).toBe(true);
    expect(canTransition("received", "cancelled")).toBe(true);
  });

  it("rejects skipping the queue and reopening terminal states", () => {
    expect(canTransition("received", "completed")).toBe(false);
    expect(canTransition("received", "ready_for_pickup")).toBe(false);
    expect(canTransition("completed", "repairing")).toBe(false);
    expect(canTransition("cancelled", "received")).toBe(false);
  });

  it("rejects a no-op transition", () => {
    expect(canTransition("repairing", "repairing")).toBe(false);
  });

  it("defines transitions for every status", () => {
    for (const status of REPAIR_STATUSES) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
    }
  });

  it("treats only in-progress states as open", () => {
    expect(isOpen("repairing")).toBe(true);
    expect(isOpen("completed")).toBe(false);
    expect(isOpen("cancelled")).toBe(false);
  });
});
