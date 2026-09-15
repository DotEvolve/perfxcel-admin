import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.dev.local" });

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: "perfxcel" }
});

async function seed() {
  console.log("Seeding taxonomies...");
  
  // Insert Categories
  const { data: categories } = await supabase
    .from("categories")
    .insert([{ name: "Leadership" }, { name: "IT" }, { name: "Finance" }])
    .select();
  
  // Insert Cities
  const { data: cities } = await supabase
    .from("cities")
    .insert([{ name: "Dubai" }, { name: "London" }, { name: "New York" }])
    .select();
  
  // Insert Associations
  const { data: associations } = await supabase
    .from("associations")
    .insert([{ name: "PMI" }, { name: "SHRM" }])
    .select();

  console.log("Seeding courses...");

  const catId = categories?.[0]?.id;
  const cityId = cities?.[0]?.id;
  const assocId = associations?.[0]?.id;

  const courses = [
    {
      title: "Advanced Leadership Bootcamp",
      description: "A comprehensive course on modern leadership.",
      objectives: "Learn to lead teams effectively.",
      target_audience: "Mid to Senior Managers",
      is_published: true,
      category_id: catId,
      city_id: cityId,
      association_id: assocId
    },
    {
      title: "Cloud Computing Fundamentals",
      description: "Introduction to AWS and Azure.",
      objectives: "Understand cloud architecture.",
      target_audience: "IT Professionals",
      is_published: true,
      category_id: categories?.[1]?.id,
      city_id: cities?.[1]?.id,
      association_id: associations?.[1]?.id
    },
    {
      title: "Corporate Finance 101",
      description: "Basics of corporate finance and valuation.",
      objectives: "Analyze financial statements.",
      target_audience: "Finance Analysts",
      is_published: false,
      category_id: categories?.[2]?.id,
      city_id: cities?.[2]?.id,
      association_id: null
    }
  ];

  for (const course of courses) {
    const { error } = await supabase.from("courses").insert(course);
    if (error) {
      console.error(`Failed to insert course ${course.title}:`, error);
    } else {
      console.log(`Inserted course: ${course.title}`);
    }
  }

  console.log("Seeding complete!");
}

seed().catch(console.error);
