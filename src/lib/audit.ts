import { AuditLogger } from "@dotevolve/error-utils/browser";
import type {
  AuditTransport,
  AuditLogEntry,
} from "@dotevolve/error-utils/browser";
import { api } from "./api";

export const browserAuditTransport: AuditTransport = async (
  events: AuditLogEntry[],
): Promise<void> => {
  try {
    await api.post("/audit-logs", { events });
  } catch (err) {
    console.error("Failed to push audit logs", err);
  }
};

const auditLogger = new AuditLogger({
  transport: browserAuditTransport,
  batchSize: 10,
  flushIntervalMs: 5000,
});

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    auditLogger.shutdown();
  });
}

export default auditLogger;
