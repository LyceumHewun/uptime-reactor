import type { Logger } from "./types";

export const consoleLogger: Logger = {
  info(message, fields) {
    log("INFO", message, fields);
  },
  warn(message, fields) {
    log("WARN", message, fields);
  },
  error(message, fields) {
    log("ERROR", message, fields);
  },
};

function log(level: string, message: string, fields?: Record<string, unknown>): void {
  const suffix = fields ? ` ${JSON.stringify(fields)}` : "";
  console.log(`${new Date().toISOString()} ${level} ${message}${suffix}`);
}
