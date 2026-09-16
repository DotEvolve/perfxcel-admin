/// <reference types="vite/client" />
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

export interface CourseSchedule {
  id?: string;
  course_id?: string;
  start_date: string;
  end_date?: string | null;
  location?: string | null;
  method?: string | null;
  status: 'open' | 'guaranteed' | 'filling_fast' | 'closed' | 'cancelled';
}

export interface Course {
  id: string;
  slug?: string;
  short_code?: string;
  title: string;
  description: string;
  objectives: string;
  target_audience: string;
  is_published: boolean;
  cost: number | null;
  duration: string | null;
  image_url?: string | null;
  categories?: TaxonomyItem[];
  cities?: TaxonomyItem[];
  associations?: TaxonomyItem[];
  delivery_modes?: TaxonomyItem[];
  course_schedules?: CourseSchedule[];
  is_blended?: boolean;
  status?: 'active' | 'archived' | 'deleted';
  is_public?: boolean;
  deleted_at?: string | null;
}

export interface CourseFormPayload {
  title: string;
  description: string;
  objectives: string;
  target_audience: string;
  is_published: boolean;
  cost: number | null;
  duration: string | null;
  image_url?: string | null;
  category_ids: string[];
  city_ids: string[];
  association_ids: string[];
  delivery_mode_ids: string[];
  schedules: CourseSchedule[];
  status?: 'active' | 'archived';
  is_public?: boolean;
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

export const createCourse = async (payload: CourseFormPayload): Promise<Course> => {
  const response = await api.post("/courses", payload);
  return response.data.data;
};

export const updateCourse = async (id: string, payload: CourseFormPayload): Promise<Course> => {
  const response = await api.put(`/courses/${id}`, payload);
  return response.data.data;
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

// --- Enquiries ---
export const getEnquiries = async (params?: Record<string, unknown>) => {
  const response = await api.get("/enquiries", { params });
  return response.data;
};

export const updateEnquiryStatus = async (id: string, status: string) => {
  const response = await api.patch(`/enquiries/${id}`, { status });
  return response.data;
};

// --- Audit Logs ---
export const getAuditLogs = async (
  filters?: AuditLogFilters
): Promise<AuditLogResponse> => {
  const backendFilters = {
    ...filters,
    pageSize: filters?.limit,
  };
  const response = await api.get("/audit-logs", { params: backendFilters });
  
  const mappedData = response.data.data.map((log: any) => ({
    id: log.id || `${log.tenant_id}-${log.timestamp}`,
    action: log.action,
    resource: log.entity_type,
    resourceId: log.entity_id,
    userId: log.actor_id,
    userEmail: log.actor_id, // We fallback to actor_id if no email is attached to log
    tenantId: log.tenant_id,
    metadata: log.details,
    createdAt: log.timestamp
  }));
  
  return {
    ...response.data,
    data: mappedData
  };
};
