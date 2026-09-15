import { useState, useEffect } from "react";
import { getAuditLogs } from "../lib/api";
import type { AuditLog, AuditLogFilters } from "../types/auditLog";

export interface UseAuditLogsResult {
  logs: AuditLog[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: AuditLogFilters;
  setFilters: (f: Partial<AuditLogFilters>) => void;
  refresh: () => void;
}

export function useAuditLogs(): UseAuditLogsResult {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFiltersState] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
  });

  const refresh = () => setTick((t) => t + 1);

  const setFilters = (f: Partial<AuditLogFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...f, page: f.page ?? 1 }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getAuditLogs(filters)
      .then((res) => {
        if (!cancelled) {
          setLogs(res.data);
          setTotal(res.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err.response?.data?.message || err.message || "Failed to load audit logs"
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filters, tick]);

  return { logs, total, loading, error, filters, setFilters, refresh };
}
