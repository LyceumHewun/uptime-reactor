export type DnsRecordType = "A";

export type DnsRecordConfig = {
  zoneId: string;
  name: string;
  type: DnsRecordType;
  content: string;
  ttl: number;
  proxied: boolean;
};

export type AppConfig = {
  cloudflare: {
    apiToken: string;
  };
  server: {
    host: string;
    port: number;
  };
  records: Record<string, DnsRecordConfig>;
};

export type KumaEvent = {
  monitorId: string;
  status: number;
};

export type Logger = {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
};
