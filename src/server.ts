import { applyDnsChange, type CloudflareClient } from "./cloudflare";
import { parseKumaPayload } from "./payload";
import type { AppConfig, KumaEvent, Logger } from "./types";

type KnownStatus = 0 | 1;

type QueueLike = {
  enqueue(key: string, task: () => Promise<void>): "started" | "replaced";
};

export type ServerDeps = {
  config: AppConfig;
  cloudflare: CloudflareClient;
  queue: QueueLike;
  logger: Logger;
  statusCache?: Map<string, KnownStatus>;
};

export function makeHandler(deps: ServerDeps): (request: Request) => Promise<Response> {
  const statusCache = deps.statusCache ?? new Map<string, KnownStatus>();

  return async (request) => {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/webhook/uptime-kuma") {
      return new Response("not found\n", { status: 404 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response("invalid json\n", { status: 400 });
    }

    const parsed = parseKumaPayload(body);
    if (!parsed.ok) {
      return new Response(`${parsed.error}\n`, { status: 400 });
    }

    const record = deps.config.records[parsed.event.monitorKey];
    if (!record) {
      deps.logger.info("ignored unknown monitor", { monitorKey: parsed.event.monitorKey });
      return new Response("ignored\n", { status: 200 });
    }

    if (parsed.event.status !== 0 && parsed.event.status !== 1) {
      deps.logger.info("ignored unsupported status", {
        monitorKey: parsed.event.monitorKey,
        status: parsed.event.status,
      });
      return new Response("ignored\n", { status: 200 });
    }

    const event: KumaEvent & { status: KnownStatus } = {
      monitorKey: parsed.event.monitorKey,
      status: parsed.event.status === 1 ? 1 : 0,
    };

    const cachedStatus = statusCache.get(event.monitorKey);
    if (cachedStatus === event.status) {
      deps.logger.info("ignored unchanged status", {
        monitorKey: event.monitorKey,
        status: event.status,
      });
      return new Response("ignored\n", { status: 200 });
    }

    statusCache.set(event.monitorKey, event.status);
    const queueResult = deps.queue.enqueue(parsed.event.monitorKey, async () => {
      await processEvent(deps, event);
    });

    return new Response(`${queueResult}\n`, { status: 200 });
  };
}

async function processEvent(deps: ServerDeps, event: KumaEvent & { status: 0 | 1 }): Promise<void> {
  const record = deps.config.records[event.monitorKey];
  if (!record) {
    deps.logger.info("ignored unknown monitor", { monitorKey: event.monitorKey });
    return;
  }

  try {
    const result = await applyDnsChange(deps.cloudflare, record, event.status);
    deps.logger.info("dns change complete", {
      monitorKey: event.monitorKey,
      name: record.name,
      type: record.type,
      content: record.content,
      ...result,
    });
  } catch (error) {
    deps.logger.error("cloudflare error", {
      monitorKey: event.monitorKey,
      name: record.name,
      type: record.type,
      content: record.content,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
