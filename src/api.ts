import axios from "axios";

const API_BASE_URL = "http://localhost:5002/api/v1";

export const api = axios.create({
  baseURL: API_BASE_URL,
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

export const getCourses = async (): Promise<Course[]> => {
  const response = await api.get("/courses");
  return response.data.data;
};

export const getTaxonomies = async () => {
  const response = await api.get("/taxonomies");
  return response.data.data;
};
