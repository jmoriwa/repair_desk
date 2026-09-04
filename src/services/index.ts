import { getApi, setApi, api, type RepairDeskApi } from "./api";
import { MockRepairDeskApi } from "./mock/mock-api";

let configured = false;

/**
 * Wire the app to an API implementation. Today this is the in-browser mock;
 * swapping in a real backend means calling `setApi(new HttpRepairDeskApi())`
 * here and changing nothing else in the UI.
 */
export function configureApi(impl?: RepairDeskApi) {
  if (configured && !impl) return;
  setApi(impl ?? new MockRepairDeskApi({ latency: 120 }));
  configured = true;
}

export { api, getApi, setApi, MockRepairDeskApi };
export type { RepairDeskApi };
export * from "./types";
export * from "./workflow";
