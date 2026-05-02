import type { DnsRecordConfig } from "./types";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

type CloudflareDnsRecord = {
  id: string;
  name: string;
  type: string;
  content: string;
};

type CloudflareResponse<T> = {
  success: boolean;
  errors?: Array<{ code?: number; message?: string }>;
  result: T;
  result_info?: {
    page: number;
    per_page: number;
    count: number;
    total_count: number;
    total_pages: number;
  };
};

export type DnsChangeResult =
  | { action: "upsert"; result: "created"; cfRecordId: string }
  | { action: "upsert"; result: "noop"; cfRecordId: string }
  | { action: "delete"; result: "deleted"; count: number }
  | { action: "delete"; result: "noop"; count: 0 };

export class CloudflareClient {
  constructor(
    private readonly apiToken: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly baseUrl = "https://api.cloudflare.com/client/v4",
  ) {}

  async listMatchingRecords(record: DnsRecordConfig): Promise<CloudflareDnsRecord[]> {
    const records: CloudflareDnsRecord[] = [];
    let page = 1;

    while (true) {
      const params = new URLSearchParams({
        type: record.type,
        name: record.name,
        content: record.content,
        page: String(page),
        per_page: "100",
      });
      const data = await this.requestEnvelope<CloudflareDnsRecord[]>(
        `/zones/${encodeURIComponent(record.zoneId)}/dns_records?${params}`,
        { method: "GET" },
      );
      records.push(...data.result);

      const totalPages = data.result_info?.total_pages ?? 1;
      if (page >= totalPages) {
        return records;
      }
      page += 1;
    }
  }

  async createRecord(record: DnsRecordConfig): Promise<CloudflareDnsRecord> {
    return this.request<CloudflareDnsRecord>(
      `/zones/${encodeURIComponent(record.zoneId)}/dns_records`,
      {
        method: "POST",
        body: JSON.stringify({
          type: record.type,
          name: record.name,
          content: record.content,
          ttl: record.ttl,
          proxied: record.proxied,
        }),
      },
    );
  }

  async deleteRecord(zoneId: string, recordId: string): Promise<void> {
    await this.request<unknown>(
      `/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(recordId)}`,
      { method: "DELETE" },
    );
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const data = await this.requestEnvelope<T>(path, init);
    return data.result;
  }

  private async requestEnvelope<T>(path: string, init: RequestInit): Promise<CloudflareResponse<T>> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.apiToken}`,
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const data = (await response.json()) as CloudflareResponse<T>;
    if (!response.ok || !data.success) {
      const detail = data.errors?.map((error) => error.message ?? error.code).join("; ");
      throw new Error(detail ? `Cloudflare API error: ${detail}` : "Cloudflare API error");
    }
    return data;
  }
}

export async function applyDnsChange(
  cloudflare: CloudflareClient,
  record: DnsRecordConfig,
  status: 0 | 1,
): Promise<DnsChangeResult> {
  const matches = await cloudflare.listMatchingRecords(record);

  if (status === 1) {
    const existing = matches[0];
    if (existing) {
      return { action: "upsert", result: "noop", cfRecordId: existing.id };
    }
    const created = await cloudflare.createRecord(record);
    return { action: "upsert", result: "created", cfRecordId: created.id };
  }

  if (matches.length === 0) {
    return { action: "delete", result: "noop", count: 0 };
  }

  const deletes = await Promise.allSettled(
    matches.map((match) => cloudflare.deleteRecord(record.zoneId, match.id)),
  );
  const failed = deletes.filter((deleteResult) => deleteResult.status === "rejected");
  if (failed.length > 0) {
    throw new Error(
      `Cloudflare delete failed for ${failed.length}/${matches.length} matching records`,
    );
  }
  return { action: "delete", result: "deleted", count: matches.length };
}
