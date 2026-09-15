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
  const [cost, setCost] = useState<number | "">("");
  const [duration, setDuration] = useState("");

  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [associationIds, setAssociationIds] = useState<string[]>([]);
  const [deliveryModeIds, setDeliveryModeIds] = useState<string[]>([]);

  const [schedules, setSchedules] = useState<CourseSchedule[]>([]);

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
          setCost(course.cost ?? "");
          setDuration(course.duration || "");
          setCategoryIds(course.categories?.map((c: any) => c.id) || []);
          setCityIds(course.cities?.map((c: any) => c.id) || []);
          setAssociationIds(course.associations?.map((c: any) => c.id) || []);
          setDeliveryModeIds(course.delivery_modes?.map((c: any) => c.id) || []);
          setSchedules(course.course_schedules || []);
        })
        .catch(console.error);
    }
  }, [id, isEdit]);

  const handleSelectMultiple = (e: React.ChangeEvent<HTMLSelectElement>, setter: (val: string[]) => void) => {
    const options = Array.from(e.target.selectedOptions);
    setter(options.map(o => o.value));
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
    const payload = {
      title,
      slug: slug || undefined,
      description,
      objectives,
      target_audience: targetAudience,
      is_published: isPublished,
      cost: cost === "" ? null : Number(cost),
      duration: duration || null,
      category_ids: categoryIds,
      city_ids: cityIds,
      association_ids: associationIds,
      delivery_mode_ids: deliveryModeIds,
      schedules,
    };

    try {
      if (isEdit) {
        await updateCourse(id as string, payload);
      } else {
        await createCourse(payload);
      }
      navigate("/courses");
    } catch (err) {
      console.error(err);
      alert("Failed to save course");
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
        className="bg-white shadow rounded-lg p-6 space-y-8"
      >
        <section className="space-y-4">
          <h4 className="font-medium text-lg border-b pb-2">Basic Info</h4>
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

        <div className="flex items-center pt-4 border-t">
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
