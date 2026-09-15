import axios from "axios";
import type { DashboardMetrics } from "../types/metrics";
import type { AuditLogFilters, AuditLogResponse } from "../types/auditLog";
import { supabase } from "./supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://api-dev.perfxcel.com/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export interface Course {
  id: string;
  title: string;
  description: string;
  objectives: string;
  target_audience: string;
  is_published: boolean;
  category_id: string | null;
  city_id: string | null;
  association_id: string | null;
  delivery_mode_id: string | null;
  categories?: TaxonomyItem | null;
  cities?: TaxonomyItem | null;
  associations?: TaxonomyItem | null;
  delivery_modes?: TaxonomyItem | null;
}

export interface TaxonomyItem {
  id: string;
  name: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export const deleteCourse = async (id: string) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

export const deleteEnrollment = async (id: string) => {
  const response = await api.delete(`/enrollments/${id}`);
  return response.data;
};

export const getMetrics = async (): Promise<DashboardMetrics> => {
  const response = await api.get("/metrics");
  return response.data.data;
};

export const getInterests = async (params?: Record<string, any>): Promise<PaginatedResponse<any>> => {
  const response = await api.get("/interests", { params });
  return response.data;
};

export const updateInterestStatus = async (id: string, status: string) => {
  const response = await api.patch(`/interests/${id}`, { status });
  return response.data;
};

export const getCourses = async (params?: Record<string, any>): Promise<PaginatedResponse<Course>> => {
  const response = await api.get("/courses", { params });
  return response.data;
};

export const bulkUpdateCourses = async (ids: string[], updates: Partial<Course>) => {
  const response = await api.patch("/courses/bulk", { ids, updates });
  return response.data;
};

export const getTaxonomies = async () => {
  const response = await api.get("/taxonomies");
  return response.data.data;
};

export const getEnrollments = async (params?: Record<string, any>): Promise<PaginatedResponse<any>> => {
  const response = await api.get("/enrollments", { params });
  return response.data;
};

export const createEnrollment = (interestId: string) =>
  api.post("/enrollments", { interest_id: interestId }).then(r => r.data.data);

export const updateEnrollmentStatus = (id: string, status: string) =>
  api.patch(`/enrollments/${id}`, { status }).then(r => r.data.data);

// --- Audit Logs ---
export const getAuditLogs = async (
  filters?: AuditLogFilters
): Promise<AuditLogResponse> => {
  const response = await api.get("/audit-logs", { params: filters });
  return response.data;
};
