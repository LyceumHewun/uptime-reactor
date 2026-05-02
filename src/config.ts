import { readFileSync } from "node:fs";
import YAML from "yaml";
import type { AppConfig, DnsRecordConfig } from "./types";

export function loadConfig(path: string): AppConfig {
  const raw = readFileSync(path, "utf8");
  return parseConfig(YAML.parse(raw));
}

export function parseConfig(value: unknown): AppConfig {
  const root = asObject(value, "config");
  const cloudflare = asObject(root.cloudflare, "cloudflare");
  const server = asObject(root.server, "server");
  const records = asObject(root.records, "records");

  const parsedRecords: Record<string, DnsRecordConfig> = {};
  for (const [monitorId, recordValue] of Object.entries(records)) {
    const record = asObject(recordValue, `records.${monitorId}`);
    const type = readString(record.type, `records.${monitorId}.type`);
    if (type !== "A") {
      throw new Error(`records.${monitorId}.type must be A`);
    }

    parsedRecords[String(monitorId)] = {
      zoneId: readString(record.zoneId, `records.${monitorId}.zoneId`),
      name: readString(record.name, `records.${monitorId}.name`),
      type,
      content: readString(record.content, `records.${monitorId}.content`),
      ttl: readNumber(record.ttl, `records.${monitorId}.ttl`),
      proxied: readBoolean(record.proxied, `records.${monitorId}.proxied`),
    };
  }

  return {
    cloudflare: {
      apiToken: readString(cloudflare.apiToken, "cloudflare.apiToken"),
    },
    server: {
      host: readString(server.host, "server.host"),
      port: readNumber(server.port, "server.port"),
    },
    records: parsedRecords,
  };
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function readString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function readNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a number`);
  }
  return value;
}

function readBoolean(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${path} must be a boolean`);
  }
  return value;
}
