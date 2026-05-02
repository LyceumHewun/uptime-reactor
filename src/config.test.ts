import { describe, expect, test } from "bun:test";
import { parseConfig } from "./config";

describe("parseConfig", () => {
  test("reads Cloudflare API token from config", () => {
    const config = parseConfig({
      cloudflare: { apiToken: "cf-token" },
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
    });

    expect(config.cloudflare.apiToken).toBe("cf-token");
  });
});
