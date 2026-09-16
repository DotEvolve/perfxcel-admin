import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTaxonomies, api, createCourse, updateCourse } from "../lib/api";
import type { TaxonomyItem, CourseSchedule } from "../lib/api";

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [courseStatus, setCourseStatus] = useState<'active' | 'archived'>('active');
  const [shortCode, setShortCode] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [duration, setDuration] = useState("");

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [associationIds, setAssociationIds] = useState<string[]>([]);
  const [deliveryModeIds, setDeliveryModeIds] = useState<string[]>([]);

  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const [taxonomies, setTaxonomies] = useState<{
    categories: TaxonomyItem[];
    cities: TaxonomyItem[];
    associations: TaxonomyItem[];
    delivery_modes: TaxonomyItem[];
  } | null>(null);

  useEffect(() => {
    getTaxonomies().then(setTaxonomies).catch(console.error);

    if (isEdit) {
      api
        .get(`/courses/${id}`)
        .then((res) => {
          const course = res.data.data;
          setTitle(course.title);
          setSlug(course.slug || "");
          setSlugTouched(true);
          setDescription(course.description || "");
          setObjectives(course.objectives || "");
          setTargetAudience(course.target_audience || "");
          setIsPublished(course.is_published);
          setIsPublic(course.is_public || false);
          setCourseStatus((course.status as 'active' | 'archived') || 'active');
          setShortCode(course.short_code || "");
          setCost(course.cost ?? "");
          setDuration(course.duration || "");
          setCategoryIds(course.categories?.map((c: any) => c.id) || []);
          setCityIds(course.cities?.map((c: any) => c.id) || []);
          setAssociationIds(course.associations?.map((c: any) => c.id) || []);
          setDeliveryModeIds(course.delivery_modes?.map((c: any) => c.id) || []);
          setSchedules(course.course_schedules || []);
          setImageUrl(course.image_url || null);
        })
        .catch(console.error);
    }
  }, [id, isEdit]);

  const handleSelectMultiple = (e: React.ChangeEvent<HTMLSelectElement>, setter: (val: string[]) => void) => {
    const options = Array.from(e.target.selectedOptions);
    setter(options.map(o => o.value));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "image/jpeg") {
      setImageError("Only JPG images are allowed.");
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      setImageError("Image size must be less than 1MB.");
      return;
    }
    
    setImageError(null);
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImageUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const addSchedule = () => {
    setSchedules([...schedules, { start_date: "", end_date: "", location: "", method: "", status: "open" }]);
  };

  const updateSchedule = (index: number, field: keyof CourseSchedule, value: string) => {
    const updated = [...schedules];
    updated[index] = { ...updated[index], [field]: value };
    setSchedules(updated);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageUploadError(null);
    const payload = {
      title,
      slug: slug || undefined,
      description,
      objectives,
      target_audience: targetAudience,
      is_published: isPublished,
      is_public: isPublic,
      status: courseStatus,
      cost: cost === "" ? null : Number(cost),
      duration: duration || null,
      category_ids: categoryIds,
      city_ids: cityIds,
      association_ids: associationIds,
      delivery_mode_ids: deliveryModeIds,
      schedules,
    };

    try {
      let savedCourse;
      if (isEdit) {
        savedCourse = await updateCourse(id as string, payload);
      } else {
        savedCourse = await createCourse(payload);
      }

      if (imageFile && savedCourse.short_code) {
        const { supabase } = await import("../lib/supabase");
        const filename = `${savedCourse.short_code.toLowerCase()}.jpg`;
        
        const { error: uploadError } = await supabase.storage
          .from("course-images")
          .upload(filename, imageFile, { upsert: true, contentType: "image/jpeg" });
          
        if (uploadError) {
          throw new Error("Image upload failed: " + uploadError.message);
        }
        
        const { data: publicUrlData } = supabase.storage
          .from("course-images")
          .getPublicUrl(filename);
          
        // Re-update course with the image URL if it's the first time
        if (savedCourse.image_url !== publicUrlData.publicUrl) {
          await updateCourse(savedCourse.id, { ...payload, image_url: publicUrlData.publicUrl });
        }
      }

      navigate("/courses");
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Image upload failed")) {
        setImageUploadError("Image upload failed: " + err.message);
      } else {
        alert("Failed to save course: " + (err.message || ""));
      }
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
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded-lg p-6 space-y-8">
        <section className="space-y-4">
          <h4 className="font-medium text-lg border-b pb-2">Basic Info</h4>
          {isEdit && shortCode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Code (read-only)
              </label>
              <input readOnly value={shortCode}
                     className="w-full border border-gray-200 bg-gray-50 rounded-md p-2
                                font-mono text-sm text-gray-500 cursor-not-allowed" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              required
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!isEdit && !slugTouched) {
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
                }
              }}
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug (URL)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder="Auto-generated if left blank"
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Image
            </label>
            <div className="flex items-start space-x-4">
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/jpeg"
                  onChange={handleImageChange}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">Only JPG format. Max size 1MB.</p>
                {imageError && (
                  <p className="mt-1 text-sm text-red-600">{imageError}</p>
                )}
                {imageUploadError && (
                  <p className="mt-1 text-sm text-red-600">{imageUploadError}</p>
                )}
              </div>
              {imageUrl && (
                <div className="w-32 h-24 relative rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex-shrink-0">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Objectives
              </label>
              <textarea
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience
              </label>
              <textarea
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={2}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
              <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value ? Number(e.target.value) : "")} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. 500.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full border border-gray-300 rounded-md p-2" placeholder="e.g. 3 Months" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h4 className="font-medium text-lg border-b pb-2">Taxonomies (Hold Cmd/Ctrl to select multiple)</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
              <select multiple value={categoryIds} onChange={e => handleSelectMultiple(e, setCategoryIds)} className="w-full h-32 border border-gray-300 rounded-md p-2">
                {taxonomies.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cities</label>
              <select multiple value={cityIds} onChange={e => handleSelectMultiple(e, setCityIds)} className="w-full h-32 border border-gray-300 rounded-md p-2">
                {taxonomies.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Associations</label>
              <select multiple value={associationIds} onChange={e => handleSelectMultiple(e, setAssociationIds)} className="w-full h-32 border border-gray-300 rounded-md p-2">
                {taxonomies.associations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Modes</label>
              <select multiple value={deliveryModeIds} onChange={e => handleSelectMultiple(e, setDeliveryModeIds)} className="w-full h-32 border border-gray-300 rounded-md p-2">
                {taxonomies.delivery_modes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h4 className="font-medium text-lg">Schedules</h4>
            <button type="button" onClick={addSchedule} className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">+ Add Schedule</button>
          </div>
          {schedules.length === 0 ? (
            <p className="text-gray-500 text-sm">No schedules added.</p>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule, i) => (
                <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded">
                  <input type="date" required value={schedule.start_date.split('T')[0]} onChange={e => updateSchedule(i, "start_date", e.target.value)} className="border p-1 rounded text-sm w-full" placeholder="Start Date" />
                  <input type="date" value={schedule.end_date?.split('T')[0] || ""} onChange={e => updateSchedule(i, "end_date", e.target.value)} className="border p-1 rounded text-sm w-full" placeholder="End Date" />
                  <input type="text" value={schedule.location || ""} onChange={e => updateSchedule(i, "location", e.target.value)} className="border p-1 rounded text-sm w-full" placeholder="Location" />
                  <input type="text" value={schedule.method || ""} onChange={e => updateSchedule(i, "method", e.target.value)} className="border p-1 rounded text-sm w-full" placeholder="Method" />
                  <select value={schedule.status} onChange={e => updateSchedule(i, "status", e.target.value)} className="border p-1 rounded text-sm w-full">
                    <option value="open">Open</option>
                    <option value="guaranteed">Guaranteed</option>
                    <option value="filling_fast">Filling Fast</option>
                    <option value="closed">Closed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="button" onClick={() => removeSchedule(i)} className="text-red-500 hover:text-red-700 px-2">&times;</button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="flex flex-col space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="published"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label
                htmlFor="published"
                className="ml-2 block text-sm text-gray-900"
              >
                Published
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_public"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label
                htmlFor="is_public"
                className="ml-2 block text-sm text-gray-900"
              >
                Public (visible on homepage)
              </label>
            </div>
          </div>

          {isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course Status
              </label>
              <select
                value={courseStatus}
                onChange={e => setCourseStatus(e.target.value as 'active' | 'archived')}
                className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
