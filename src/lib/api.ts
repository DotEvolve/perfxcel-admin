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

api.interceptors.request.use(
  async (config) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
      window.location.href = "/#/login"; // using hash router
    }
    return Promise.reject(error);
  },
);

export interface CourseSchedule {
  id?: string;
  course_id?: string;
  start_date: string;
  end_date?: string | null;
  location?: string | null;
  method?: string | null;
  status: "open" | "guaranteed" | "filling_fast" | "closed" | "cancelled";
}

export interface CourseModule {
  title: string;
  description?: string;
  duration?: string;
}

export interface CourseDay {
  day: number;
  title: string;
  modules: CourseModule[];
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
  status?: "active" | "archived" | "deleted";
  is_public?: boolean;
  deleted_at?: string | null;
  course_outline?: CourseDay[] | null;
  brochure_url?: string | null;
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
  status?: "active" | "archived";
  is_public?: boolean;
  short_code?: string;
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

// --- Settings ---
export const getSettings = async () => {
  const response = await api.get("/settings");
  return response.data.data;
};

// Sends a batch update: { training_plan_expiry_days?: number, brochure_expiry_days?: number }
// The backend controller accepts both keys together via PUT /settings.
export const updateSettings = async (payload: {
  training_plan_expiry_days?: number;
  brochure_expiry_days?: number;
}) => {
  const response = await api.put("/settings", payload);
  return response.data;
};

export const uploadTrainingPlan = async (
  file: File,
): Promise<{ url: string }> => {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post("/upload/training-plan", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
};

export const downloadTrainingPlanFile = async (): Promise<void> => {
  const response = await api.get("/upload/training-plan/download", {
    responseType: "blob",
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "training_plan.pdf");
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
};

export const uploadCourseBrochure = async (
  file: File,
  shortCode: string,
): Promise<{ url: string; filename: string }> => {
  const form = new FormData();
  form.append("file", file);
  form.append("short_code", shortCode);
  const response = await api.post("/upload/course-brochure", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data.data;
};

// Convenience wrapper — updates a single setting key by building the batch payload.
export const updateSetting = async (key: string, value: number) => {
  return updateSettings({ [key]: value } as Parameters<
    typeof updateSettings
  >[0]);
};

export const getInterests = async (
  params?: Record<string, any>,
): Promise<PaginatedResponse<any>> => {
  const response = await api.get("/interests", { params });
  return response.data;
};

export const updateInterestStatus = async (id: string, status: string) => {
  const response = await api.patch(`/interests/${id}`, { status });
  return response.data;
};

export const createInterestManual = async (payload: any) => {
  const response = await api.post("/interests", payload);
  return response.data.data;
};

export const resendBrochure = async (id: string) => {
  const response = await api.post(`/interests/${id}/resend-brochure`);
  return response.data.data;
};

export const deleteInterests = async (ids: string[]) => {
  const response = await api.delete("/interests", { data: { ids } });
  return response.data;
};

export const hardDeleteInterest = async (id: string) => {
  const response = await api.post(`/interests/${id}/hard-delete`);
  return response.data;
};

export const getCourses = async (
  params?: Record<string, any>,
): Promise<PaginatedResponse<Course>> => {
  const response = await api.get("/courses", { params });
  return response.data;
};

export const bulkUpdateCourses = async (
  ids: string[],
  updates: Partial<Course>,
) => {
  const response = await api.patch("/courses/bulk", { ids, updates });
  return response.data;
};

export const createCourse = async (
  payload: CourseFormPayload,
): Promise<Course> => {
  const response = await api.post("/courses", payload);
  return response.data.data;
};

export const updateCourse = async (
  id: string,
  payload: CourseFormPayload,
): Promise<Course> => {
  const response = await api.put(`/courses/${id}`, payload);
  return response.data.data;
};

// --- Taxonomies ---
export const getTaxonomies = async (): Promise<any> => {
  const response = await api.get("/taxonomies");
  return response.data.data;
};

export const createTaxonomy = async (
  type: string,
  name: string,
): Promise<any> => {
  const response = await api.post(`/taxonomies/${type}`, { name });
  return response.data;
};

export const updateTaxonomy = async (
  type: string,
  id: string,
  name: string,
): Promise<any> => {
  const response = await api.put(`/taxonomies/${type}/${id}`, { name });
  return response.data;
};

export const deleteTaxonomy = async (
  type: string,
  id: string,
): Promise<any> => {
  const response = await api.delete(`/taxonomies/${type}/${id}`);
  return response.data;
};

export const resendCertificate = async (id: string): Promise<any> => {
  const response = await api.post(`/enrollments/${id}/resend-certificate`);
  return response.data;
};

export const getEnrollments = async (
  params?: Record<string, any>,
): Promise<PaginatedResponse<any>> => {
  const response = await api.get("/enrollments", { params });
  return response.data;
};

export const createEnrollment = (interestId: string) =>
  api
    .post("/enrollments", { interest_id: interestId })
    .then((r) => r.data.data);

export const updateEnrollmentStatus = (id: string, status: string) =>
  api.patch(`/enrollments/${id}`, { status }).then((r) => r.data.data);

// --- Enquiries ---
export const getEnquiries = async (params: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}) => {
  const response = await api.get("/enquiries", { params });
  return response.data;
};

export const updateEnquiryStatus = async (id: string, status: string) => {
  const response = await api.patch(`/enquiries/${id}`, { status });
  return response.data.data;
};

export const getTrainingPlanRequests = async (params: {
  search?: string;
  page?: number;
  limit?: number;
  date_from?: string;
  date_to?: string;
}) => {
  const response = await api.get("/training-plan", { params });
  return response.data;
};

export const createTrainingPlanManual = async (payload: any) => {
  const response = await api.post("/training-plan", payload);
  return response.data.data;
};

export const resendTrainingPlan = async (id: string) => {
  const response = await api.post(`/training-plan/${id}/resend`);
  return response.data.data;
};

export const deleteTrainingPlans = async (ids: string[]) => {
  const response = await api.delete("/training-plan", { data: { ids } });
  return response.data;
};

export const hardDeleteTrainingPlan = async (id: string) => {
  const response = await api.post(`/training-plan/${id}/hard-delete`);
  return response.data;
};

// --- Audit Logs ---
export const getAuditLogs = async (
  filters?: AuditLogFilters,
): Promise<AuditLogResponse> => {
  const backendFilters = {
    ...filters,
    pageSize: filters?.limit,
    entity_type: filters?.entityType,
  };
  const response = await api.get("/audit-logs", { params: backendFilters });

  const mappedData = response.data.data.map((log: any) => ({
    id: log.id || `${log.tenant_id}-${log.timestamp}`,
    action: log.action,
    resource: log.entity_type,
    resourceId: log.entity_id,
    userId: log.actor_id,
    userEmail: log.actor_email || log.actor_id, // We fallback to actor_id if no email is attached to log
    tenantId: log.tenant_id,
    metadata: log.details,
    createdAt: log.timestamp,
  }));

  return {
    ...response.data,
    data: mappedData,
  };
};
