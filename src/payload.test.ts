import { describe, expect, test } from "bun:test";
import { parseKumaPayload } from "./payload";

describe("parseKumaPayload", () => {
  test("accepts string monitorId and numeric status", () => {
    expect(parseKumaPayload({ monitorId: "12", status: 1 })).toEqual({
      ok: true,
      event: { monitorKey: "12", status: 1 },
    });
  });

  test("accepts monitorKey and string status", () => {
    expect(parseKumaPayload({ monitorKey: "node-a", status: "0" })).toEqual({
      ok: true,
      event: { monitorKey: "node-a", status: 0 },
    });
  });

  test("accepts uptime kuma text statuses", () => {
    expect(parseKumaPayload({ monitorKey: "node-a", status: "✅ Up" })).toEqual({
      ok: true,
      event: { monitorKey: "node-a", status: 1 },
    });
    expect(parseKumaPayload({ monitorKey: "node-a", status: "🔴 Down" })).toEqual({
      ok: true,
      event: { monitorKey: "node-a", status: 0 },
    });
  });

  test("accepts unsupported numeric status for handler-level ignore", () => {
    expect(parseKumaPayload({ monitorKey: "12", status: 2 })).toEqual({
      ok: true,
      event: { monitorKey: "12", status: 2 },
    });
  });

  test("rejects non-numeric status", () => {
    expect(parseKumaPayload({ monitorKey: "12", status: "⚠️ Test" })).toEqual({
      ok: false,
      error: "status must be a number or uptime kuma status text",
    });
  });
});
