import type { KumaEvent } from "./types";

export type ParsePayloadResult =
  | { ok: true; event: KumaEvent }
  | { ok: false; error: string };

export function parseKumaPayload(payload: unknown): ParsePayloadResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "payload must be an object" };
  }

  const body = payload as Record<string, unknown>;
  const monitorId = parseMonitorId(body.monitorId);
  if (monitorId === undefined) {
    return { ok: false, error: "monitorId is required" };
  }

  const status = parseStatus(body.status);
  if (status === undefined) {
    return { ok: false, error: "status must be a number" };
  }

  return { ok: true, event: { monitorId, status } };
}

function parseMonitorId(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function parseStatus(value: unknown): number | undefined {
  const status = typeof value === "string" ? Number(value) : value;
  if (typeof status === "number" && Number.isFinite(status)) {
    return status;
  }
  return undefined;
}
