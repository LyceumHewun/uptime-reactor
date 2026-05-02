import type { KumaEvent } from "./types";

export type ParsePayloadResult =
  | { ok: true; event: KumaEvent }
  | { ok: false; error: string };

export function parseKumaPayload(payload: unknown): ParsePayloadResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "payload must be an object" };
  }

  const body = payload as Record<string, unknown>;
  const monitorKey = parseMonitorKey(body.monitorKey ?? body.monitorId);
  if (monitorKey === undefined) {
    return { ok: false, error: "monitorKey is required" };
  }

  const status = parseStatus(body.status);
  if (status === undefined) {
    return { ok: false, error: "status must be a number or uptime kuma status text" };
  }

  return { ok: true, event: { monitorKey, status } };
}

function parseMonitorKey(value: unknown): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function parseStatus(value: unknown): number | undefined {
  const status = typeof value === "string" ? parseStringStatus(value) : value;
  if (typeof status === "number" && Number.isFinite(status)) {
    return status;
  }
  return undefined;
}

function parseStringStatus(value: string): number | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "0") {
    return 0;
  }
  if (normalized === "1") {
    return 1;
  }
  if (normalized.includes("down")) {
    return 0;
  }
  if (normalized.includes("up")) {
    return 1;
  }
  return undefined;
}
