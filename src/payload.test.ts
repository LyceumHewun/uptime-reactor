import { describe, expect, test } from "bun:test";
import { parseKumaPayload } from "./payload";

describe("parseKumaPayload", () => {
  test("accepts string monitorId and numeric status", () => {
    expect(parseKumaPayload({ monitorId: "12", status: 1 })).toEqual({
      ok: true,
      event: { monitorId: "12", status: 1 },
    });
  });

  test("accepts numeric monitorId and string status", () => {
    expect(parseKumaPayload({ monitorId: 12, status: "0" })).toEqual({
      ok: true,
      event: { monitorId: "12", status: 0 },
    });
  });

  test("accepts unsupported numeric status for handler-level ignore", () => {
    expect(parseKumaPayload({ monitorId: "12", status: 2 })).toEqual({
      ok: true,
      event: { monitorId: "12", status: 2 },
    });
  });

  test("rejects non-numeric status", () => {
    expect(parseKumaPayload({ monitorId: "12", status: "up" })).toEqual({
      ok: false,
      error: "status must be a number",
    });
  });
});
