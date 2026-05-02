import { CloudflareClient } from "./cloudflare";
import { loadConfig } from "./config";
import { consoleLogger } from "./logger";
import { LatestByKeyQueue } from "./queue";
import { makeHandler } from "./server";

const configPath = Bun.env.CONFIG_PATH ?? "config.yaml";
const config = loadConfig(configPath);

const handler = makeHandler({
  config,
  cloudflare: new CloudflareClient(config.cloudflare.apiToken),
  queue: new LatestByKeyQueue((error) => {
    consoleLogger.error("queue task error", {
      error: error instanceof Error ? error.message : String(error),
    });
  }),
  logger: consoleLogger,
});

Bun.serve({
  hostname: config.server.host,
  port: config.server.port,
  fetch: handler,
});

console.log(`uptime-reactor listening on http://${config.server.host}:${config.server.port}`);
