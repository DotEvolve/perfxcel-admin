import { z } from "zod";

const moduleSchema = z.object({
  title: z.string().min(1, "Module title is required"),
  description: z.string().optional(),
  duration: z.string().optional(),
});

const daySchema = z.object({
  day: z.number(),
  title: z.string().min(1, "Day title is required"),
  modules: z.array(moduleSchema),
});

const scheduleSchema = z.object({
  id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  method: z.string().optional().nullable(),
  status: z.string().optional(),
});

export const courseFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  short_code: z.string().min(1, "Short code is required"),
  slug: z.string().optional(),
  description: z.string().optional(),
  objectives: z.string().optional(),
  target_audience: z.string().optional(),
  duration: z.string().optional(),
  cost: z.coerce.number().min(0).optional(),
  status: z.enum(["active", "archived"]).optional(),
  is_public: z.boolean().optional(),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  seo_keywords: z.string().optional(),
  category_ids: z.array(z.string()).optional(),
  city_ids: z.array(z.string()).optional(),
  association_ids: z.array(z.string()).optional(),
  delivery_mode_ids: z.array(z.string()).optional(),
  course_outline: z.array(daySchema).optional().nullable(),
  brochure_url: z.string().url().optional().nullable(),
  schedules: z.array(scheduleSchema).optional(),
  is_published: z.boolean().optional(),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;
