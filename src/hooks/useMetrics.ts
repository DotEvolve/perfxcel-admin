import { useState, useEffect } from "react";
import { getMetrics } from "../lib/api";
import type { DashboardMetrics } from "../types/metrics";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const extractErrorMessage = (err: any): string => {
  if (err?.response?.data?.message) {
    return String(err.response.data.message);
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Failed to load metrics";
};

interface UseMetricsResult {
  metrics: DashboardMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useMetrics(): UseMetricsResult {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getMetrics()
      .then((data) => {
        if (!cancelled) {
          setMetrics(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(extractErrorMessage(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tick]);

  return { metrics, loading, error, refresh };
}
