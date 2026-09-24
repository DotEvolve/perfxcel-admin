import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getTaxonomies, api, createCourse, updateCourse, uploadCourseBrochure } from "../lib/api";
import type { TaxonomyItem, CourseFormPayload } from "../lib/api";
import {
  courseFormSchema,
  type CourseFormValues,
} from "../validators/courseFormSchema";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Download } from "lucide-react";

function SortableDay({
  id,
  dayIndex,
  control,
  register,
  errors,
  removeDay,
}: {
  id: string;
  dayIndex: number;
  control: any;
  register: any;
  errors: any;
  removeDay: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const { fields, append, remove } = useFieldArray({
    control,
    name: `course_outline.${dayIndex}.modules`,
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-50 border rounded-lg p-4 mb-4 relative"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab text-gray-400 hover:text-gray-600"
          >
            <GripVertical size={20} />
          </div>
          <h5 className="font-semibold text-gray-700">Day {dayIndex + 1}</h5>
        </div>
        <button
          type="button"
          onClick={() => removeDay(dayIndex)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Day Title
        </label>
        <input
          {...register(`course_outline.${dayIndex}.title` as const)}
          className="w-full border border-gray-300 rounded-md p-2"
          placeholder="e.g. Introduction to Leadership"
        />
        {errors?.course_outline?.[dayIndex]?.title && (
          <p className="mt-1 text-sm text-red-600">
            {errors.course_outline[dayIndex].title.message}
          </p>
        )}
      </div>

      <div className="space-y-3 pl-6 border-l-2 border-indigo-100">
        <h6 className="text-sm font-medium text-gray-600">Modules</h6>
        {fields.map((moduleField, mIndex) => (
          <div
            key={moduleField.id}
            className="bg-white border rounded p-3 relative flex gap-4 items-start"
          >
            <div className="flex-1 space-y-2">
              <div>
                <input
                  {...register(
                    `course_outline.${dayIndex}.modules.${mIndex}.title` as const,
                  )}
                  className="w-full border border-gray-300 rounded p-1.5 text-sm"
                  placeholder="Module Title"
                />
                {errors?.course_outline?.[dayIndex]?.modules?.[mIndex]
                  ?.title && (
                  <p className="mt-1 text-xs text-red-600">
                    {
                      errors.course_outline[dayIndex].modules[mIndex].title
                        .message
                    }
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  {...register(
                    `course_outline.${dayIndex}.modules.${mIndex}.duration` as const,
                  )}
                  className="w-1/4 border border-gray-300 rounded p-1.5 text-sm"
                  placeholder="Duration (e.g. 2h)"
                />
                <input
                  {...register(
                    `course_outline.${dayIndex}.modules.${mIndex}.description` as const,
                  )}
                  className="w-3/4 border border-gray-300 rounded p-1.5 text-sm"
                  placeholder="Short Description"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => remove(mIndex)}
              className="text-red-400 hover:text-red-600 pt-1"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => append({ title: "", description: "", duration: "" })}
          className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
        >
          <Plus size={16} /> Add Module
        </button>
      </div>
    </div>
  );
}

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema) as any,
    defaultValues: {
      is_published: false,
      is_public: false,
      status: "active",
      category_ids: [],
      city_ids: [],
      association_ids: [],
      delivery_mode_ids: [],
      schedules: [],
      course_outline: [],
    },
  });

  const {
    fields: outlineFields,
    append: appendDay,
    remove: removeDay,
    move: moveDay,
  } = useFieldArray({
    control,
    name: "course_outline",
  });

  const forceDownload = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      window.open(url, "_blank");
    }
  };

  const {
    fields: scheduleFields,
    append: appendSchedule,
    remove: removeSchedule,
  } = useFieldArray({
    control,
    name: "schedules",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [brochureFile, setBrochureFile] = useState<File | null>(null);
  const [brochureError, setBrochureError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [taxonomies, setTaxonomies] = useState<{
    categories: TaxonomyItem[];
    cities: TaxonomyItem[];
    associations: TaxonomyItem[];
    delivery_modes: TaxonomyItem[];
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    getTaxonomies().then(setTaxonomies).catch(console.error);

    if (isEdit) {
      api
        .get(`/courses/${id}`)
        .then((res) => {
          const course = res.data.data;
          reset({
            title: course.title,
            slug: course.slug || "",
            short_code: course.short_code || "",
            description: course.description || "",
            overview: course.overview || null,
            objectives: course.objectives || "",
            target_audience: course.target_audience || "",
            is_published: course.is_published,
            is_public: course.is_public || false,
            status: (course.status as "active" | "archived") || "active",
            cost: course.cost ?? undefined,
            category_ids: course.categories?.map((c: any) => c.id) || [],
            city_ids: course.cities?.map((c: any) => c.id) || [],
            association_ids: course.associations?.map((c: any) => c.id) || [],
            delivery_mode_ids:
              course.delivery_modes?.map((c: any) => c.id) || [],
            schedules: course.course_schedules || [],
            course_outline: course.course_outline || [],
            brochure_url: course.brochure_url || null,
          });
          setImageUrl(course.image_url || null);
        })
        .catch(console.error);
    }
  }, [id, isEdit, reset]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "image/jpeg") return setImageError("Only JPG allowed");
    if (file.size > 1 * 1024 * 1024) return setImageError("Max size 1MB");
    setImageError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleBrochureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf")
      return setBrochureError("Only PDF allowed");
    if (file.size > 20 * 1024 * 1024) {
      window.alert("File size exceeds 20MB limit. Please upload a smaller PDF.");
      e.target.value = "";
      return setBrochureError("Max size 20MB");
    }
    setBrochureError(null);
    setBrochureFile(file);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = outlineFields.findIndex((f) => f.id === active.id);
      const newIndex = outlineFields.findIndex((f) => f.id === over.id);
      moveDay(oldIndex, newIndex);
      // Renumber days
      const currentOutline = watch("course_outline") || [];
      const updated = arrayMove(currentOutline, oldIndex, newIndex);
      updated.forEach((_, index) => {
        setValue(`course_outline.${index}.day`, index + 1);
      });
    }
  };

  const onSubmit = async (values: CourseFormValues) => {
    try {
      if (!isEdit && !values.slug) {
        values.slug = values.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)+/g, "");
      }

      let savedCourse;
      if (isEdit)
        savedCourse = await updateCourse(
          id as string,
          values as any as CourseFormPayload,
        );
      else savedCourse = await createCourse(values as any as CourseFormPayload);

      if (imageFile || brochureFile) {
        const { supabase } = await import("../lib/supabase");
        let updatePayload: any = {};

        if (imageFile && savedCourse.short_code) {
          const filename = `${savedCourse.short_code.toLowerCase()}.jpg`;
          const { error } = await supabase.storage
            .from("course-images")
            .upload(filename, imageFile, {
              upsert: true,
              contentType: "image/jpeg",
            });
          if (error) throw error;
          const { data } = supabase.storage
            .from("course-images")
            .getPublicUrl(filename);
          updatePayload.image_url = data.publicUrl;
        }

        if (brochureFile && savedCourse.short_code) {
          const result = await uploadCourseBrochure(brochureFile, savedCourse.short_code);
          updatePayload.brochure_url = result.url;
        }

        if (Object.keys(updatePayload).length > 0) {
          await updateCourse(savedCourse.id, { ...values, ...updatePayload });
        }
      }
      navigate("/courses");
    } catch (err: any) {
      alert("Failed to save course: " + (err.message || ""));
    }
  };

  if (!taxonomies) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-semibold">
          {isEdit ? "Edit Course" : "Add Course"}
        </h3>
        <button
          onClick={() => navigate("/courses")}
          className="text-sm font-medium text-gray-500"
        >
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit as any)}
        className="bg-white shadow rounded-lg p-6 space-y-8"
      >
        <section className="space-y-4">
          <h4 className="font-medium text-lg border-b pb-2">Basic Info</h4>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Code
            </label>
            <input
              {...register("short_code")}
              className="w-full border border-gray-300 rounded-md p-2 font-mono text-sm"
            />
            {errors.short_code && (
              <p className="text-sm text-red-600">
                {errors.short_code.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              {...register("title")}
              className="w-full border border-gray-300 rounded-md p-2"
            />
            {errors.title && (
              <p className="text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug
            </label>
            <input
              {...register("slug")}
              className="w-full border border-gray-300 rounded-md p-2 font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Image
              </label>
              <input
                type="file"
                accept="image/jpeg"
                onChange={handleImageChange}
                className="w-full border rounded p-2 text-sm"
              />
              {imageError && (
                <p className="text-sm text-red-600">{imageError}</p>
              )}
              {imageUrl && (
                <div className="mt-2 flex items-start gap-4">
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="w-32 h-24 object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      forceDownload(
                        imageUrl,
                        `course_image_${watch("short_code") || "img"}.jpg`,
                      )
                    }
                    className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download Image
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Brochure (PDF)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleBrochureChange}
                className="w-full border rounded p-2 text-sm"
              />
              {brochureError && (
                <p className="text-sm text-red-600">{brochureError}</p>
              )}
              {watch("brochure_url") && !brochureFile && (
                <div className="mt-2 flex gap-4">
                  <a
                    href={watch("brochure_url") as string}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    View Current Brochure
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      forceDownload(
                        watch("brochure_url") as string,
                        `course_brochure_${watch("short_code") || "doc"}.pdf`,
                      )
                    }
                    className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download Brochure
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Overview
            </label>
            <ReactQuill
              theme="snow"
              value={watch("overview") ?? ""}
              onChange={(value) => {
                setValue("overview", value, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }}
              className="bg-white"
            />
            <p className="mt-1 text-xs text-gray-500">
              {(watch("overview") ?? "").length}/5000 characters. Displayed at the top of the public course page.
            </p>
            {errors.overview && (
              <p className="mt-1 text-sm text-red-600">{errors.overview.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost
            </label>
            <input
              type="number"
              step="0.01"
              {...register("cost")}
              className="w-full border rounded p-2"
            />
            {errors.cost && (
              <p className="text-sm text-red-600">{errors.cost.message}</p>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="font-medium text-lg border-b pb-2">Taxonomies</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <select
                multiple
                value={watch("category_ids")}
                onChange={(e) =>
                  setValue(
                    "category_ids",
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
                className="w-full h-32 border rounded p-2"
              >
                {taxonomies.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cities
              </label>
              <select
                multiple
                value={watch("city_ids")}
                onChange={(e) =>
                  setValue(
                    "city_ids",
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
                className="w-full h-32 border rounded p-2"
              >
                {taxonomies.cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Associations
              </label>
              <select
                multiple
                value={watch("association_ids")}
                onChange={(e) =>
                  setValue(
                    "association_ids",
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
                className="w-full h-32 border rounded p-2"
              >
                {taxonomies.associations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Modes
              </label>
              <select
                multiple
                value={watch("delivery_mode_ids")}
                onChange={(e) =>
                  setValue(
                    "delivery_mode_ids",
                    Array.from(e.target.selectedOptions).map((o) => o.value),
                  )
                }
                className="w-full h-32 border rounded p-2"
              >
                {taxonomies.delivery_modes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-medium text-lg">Course Outline</h4>
            <button
              type="button"
              onClick={() =>
                appendDay({
                  day: outlineFields.length + 1,
                  title: "",
                  modules: [],
                })
              }
              className="text-sm bg-gray-100 px-3 py-1 rounded"
            >
              + Add Day
            </button>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={outlineFields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              {outlineFields.map((field, index) => (
                <SortableDay
                  key={field.id}
                  id={field.id}
                  dayIndex={index}
                  control={control}
                  register={register}
                  errors={errors}
                  removeDay={removeDay}
                />
              ))}
            </SortableContext>
          </DndContext>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-medium text-lg">Schedules</h4>
            <button
              type="button"
              onClick={() =>
                appendSchedule({
                  start_date: "",
                  end_date: "",
                  location: "",
                  method: "",
                  status: "open",
                })
              }
              className="text-sm bg-gray-100 px-3 py-1 rounded"
            >
              + Add Schedule
            </button>
          </div>
          <div className="space-y-3">
            {scheduleFields.map((field, i) => (
              <div
                key={field.id}
                className="flex gap-2 items-center bg-gray-50 p-2 rounded"
              >
                <input
                  type="date"
                  {...register(`schedules.${i}.start_date` as const)}
                  required
                  className="border p-1 rounded text-sm w-full"
                />
                <input
                  type="date"
                  {...register(`schedules.${i}.end_date` as const)}
                  className="border p-1 rounded text-sm w-full"
                />
                <input
                  type="text"
                  {...register(`schedules.${i}.location` as const)}
                  placeholder="Location"
                  className="border p-1 rounded text-sm w-full"
                />
                <input
                  type="text"
                  {...register(`schedules.${i}.method` as const)}
                  placeholder="Method"
                  className="border p-1 rounded text-sm w-full"
                />
                <select
                  {...register(`schedules.${i}.status` as const)}
                  className="border p-1 rounded text-sm w-full"
                >
                  <option value="open">Open</option>
                  <option value="guaranteed">Guaranteed</option>
                  <option value="filling_fast">Filling Fast</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeSchedule(i)}
                  className="text-red-500"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("is_published")} /> Published
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" {...register("is_public")} /> Public
            </label>
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                {...register("status")}
                className="rounded border-gray-300 p-2 text-sm"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Save Course
          </button>
        </div>
      </form>
    </div>
  );
}
