import { describe, expect, test } from "bun:test";
import { applyDnsChange, CloudflareClient } from "./cloudflare";
import type { DnsRecordConfig } from "./types";

const record: DnsRecordConfig = {
  zoneId: "zone-1",
  name: "app.example.com",
  type: "A",
  content: "1.2.3.4",
  ttl: 60,
  proxied: false,
};

describe("applyDnsChange", () => {
  test("does not create when matching record already exists", async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const client = new CloudflareClient("token", async (url, init) => {
      calls.push({ url: String(url), method: init?.method ?? "GET" });
      return jsonResponse([{ id: "dns-1", name: record.name, type: "A", content: record.content }]);
    });

    const result = await applyDnsChange(client, record, 1);

    expect(result).toEqual({ action: "upsert", result: "noop", cfRecordId: "dns-1" });
    expect(calls.map((call) => call.method)).toEqual(["GET"]);
  });

  test("deletes all duplicate matching records on down", async () => {
    const methods: string[] = [];
    const client = new CloudflareClient("token", async (_url, init) => {
      methods.push(init?.method ?? "GET");
      if (init?.method === "DELETE") {
        return jsonResponse({});
      }
      return jsonResponse([
        { id: "dns-1", name: record.name, type: "A", content: record.content },
        { id: "dns-2", name: record.name, type: "A", content: record.content },
      ]);
    });

    const result = await applyDnsChange(client, record, 0);

    expect(result).toEqual({ action: "delete", result: "deleted", count: 2 });
    expect(methods).toEqual(["GET", "DELETE", "DELETE"]);
  });

  test("fetches every page of matching records", async () => {
    const urls: string[] = [];
    const client = new CloudflareClient("token", async (url) => {
      urls.push(String(url));
      const currentUrl = new URL(String(url));
      const page = currentUrl.searchParams.get("page");
      return Response.json({
        success: true,
        result:
          page === "1"
            ? [{ id: "dns-1", name: record.name, type: "A", content: record.content }]
            : [{ id: "dns-2", name: record.name, type: "A", content: record.content }],
        result_info: {
          page: Number(page),
          per_page: 100,
          count: 1,
          total_count: 2,
          total_pages: 2,
        },
      });
    });

    const matches = await client.listMatchingRecords(record);

    expect(matches.map((match) => match.id)).toEqual(["dns-1", "dns-2"]);
    expect(urls).toHaveLength(2);
  });

  test("attempts every duplicate delete before reporting failure", async () => {
    const deletedIds: string[] = [];
    const client = new CloudflareClient("token", async (url, init) => {
      if (init?.method === "DELETE") {
        deletedIds.push(String(url).split("/").at(-1) ?? "");
        if (String(url).endsWith("/dns-1")) {
          return Response.json({ success: false, errors: [{ message: "delete failed" }], result: {} });
        }
        return jsonResponse({});
      }
      return jsonResponse([
        { id: "dns-1", name: record.name, type: "A", content: record.content },
        { id: "dns-2", name: record.name, type: "A", content: record.content },
      ]);
    });

    await expect(applyDnsChange(client, record, 0)).rejects.toThrow(
      "Cloudflare delete failed for 1/2 matching records",
    );
    expect(deletedIds).toEqual(["dns-1", "dns-2"]);
  });
});

function jsonResponse(result: unknown): Response {
  return Response.json({ success: true, result });
}
