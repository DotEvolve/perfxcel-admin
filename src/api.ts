import axios from "axios";
import { supabase } from "./lib/supabase";

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
  categories?: TaxonomyItem | null;
  cities?: TaxonomyItem | null;
  associations?: TaxonomyItem | null;
}

export interface TaxonomyItem {
  id: string;
  name: string;
}

export const deleteCourse = async (id: string) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

export const getInterests = async () => {
  const response = await api.get("/interests");
  return response.data.data;
};

export const updateInterestStatus = async (id: string, status: string) => {
  const response = await api.patch(`/interests/${id}`, { status });
  return response.data;
};

export const getCourses = async (): Promise<Course[]> => {
  const response = await api.get("/courses");
  return response.data.data;
};

export const getTaxonomies = async () => {
  const response = await api.get("/taxonomies");
  return response.data.data;
};

export const getEnrollments = () => api.get("/enrollments").then(r => r.data.data);

export const createEnrollment = (interestId: string) =>
  api.post("/enrollments", { interest_id: interestId }).then(r => r.data.data);

export const updateEnrollmentStatus = (id: string, status: string) =>
  api.patch(`/enrollments/${id}`, { status }).then(r => r.data.data);
