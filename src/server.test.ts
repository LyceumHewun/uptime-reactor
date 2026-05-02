import { describe, expect, test } from "bun:test";
import { makeHandler } from "./server";
import type { AppConfig, Logger } from "./types";

const config: AppConfig = {
  cloudflare: { apiToken: "token" },
  server: { host: "127.0.0.1", port: 8787 },
  records: {
    "12": {
      zoneId: "zone-1",
      name: "app.example.com",
      type: "A",
      content: "1.2.3.4",
      ttl: 60,
      proxied: false,
    },
  },
};

const logger: Logger = {
  info() {},
  warn() {},
  error() {},
};

describe("makeHandler", () => {
  test("ignores unknown monitorId with 200", async () => {
    let enqueued = 0;
    const handler = makeHandler({
      config,
      cloudflare: {} as never,
      logger,
      queue: {
        enqueue() {
          enqueued += 1;
          return "started";
        },
      },
    });

    const response = await handler(jsonRequest({ monitorId: "unknown", status: 1 }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ignored\n");
    expect(enqueued).toBe(0);
  });

  test("rejects invalid json", async () => {
    const handler = makeHandler({
      config,
      cloudflare: {} as never,
      logger,
      queue: {
        enqueue() {
          return "started";
        },
      },
    });

    const response = await handler(
      new Request("http://localhost/webhook/uptime-kuma", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
  });

  test("enqueues known monitor", async () => {
    const keys: string[] = [];
    const handler = makeHandler({
      config,
      cloudflare: {} as never,
      logger,
      queue: {
        enqueue(key) {
          keys.push(key);
          return "started";
        },
      },
    });

    const response = await handler(jsonRequest({ monitorId: 12, status: "0" }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("started\n");
    expect(keys).toEqual(["12"]);
  });

  test("ignores unsupported status with 200", async () => {
    let enqueued = 0;
    const handler = makeHandler({
      config,
      cloudflare: {} as never,
      logger,
      queue: {
        enqueue() {
          enqueued += 1;
          return "started";
        },
      },
    });

    const response = await handler(jsonRequest({ monitorId: "12", status: 2 }));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ignored\n");
    expect(enqueued).toBe(0);
  });

  test("ignores repeated unchanged status after first event", async () => {
    const keys: string[] = [];
    const handler = makeHandler({
      config,
      cloudflare: {} as never,
      logger,
      queue: {
        enqueue(key) {
          keys.push(key);
          return "started";
        },
      },
    });

    const first = await handler(jsonRequest({ monitorId: "12", status: 1 }));
    const second = await handler(jsonRequest({ monitorId: "12", status: 1 }));

    expect(first.status).toBe(200);
    expect(await first.text()).toBe("started\n");
    expect(second.status).toBe(200);
    expect(await second.text()).toBe("ignored\n");
    expect(keys).toEqual(["12"]);
  });

  test("enqueues when cached status changes", async () => {
    const statuses: number[] = [];
    const handler = makeHandler({
      config,
      cloudflare: {} as never,
      logger,
      queue: {
        enqueue(_key, task) {
          statuses.push(statuses.length);
          void task();
          return "started";
        },
      },
    });

    const first = await handler(jsonRequest({ monitorId: "12", status: 1 }));
    const second = await handler(jsonRequest({ monitorId: "12", status: 0 }));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(statuses).toEqual([0, 1]);
  });
});

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/webhook/uptime-kuma", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}
