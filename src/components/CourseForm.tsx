import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTaxonomies, api } from "../api";
import type { TaxonomyItem } from "../api";

export default function CourseForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const [categoryId, setCategoryId] = useState("");
  const [cityId, setCityId] = useState("");
  const [associationId, setAssociationId] = useState("");
  const [deliveryModeId, setDeliveryModeId] = useState("");

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
          setDescription(course.description || "");
          setObjectives(course.objectives || "");
          setTargetAudience(course.target_audience || "");
          setIsPublished(course.is_published);
          setCategoryId(course.category_id || "");
          setCityId(course.city_id || "");
          setAssociationId(course.association_id || "");
          setDeliveryModeId(course.delivery_mode_id || "");
        })
        .catch(console.error);
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title,
      description,
      objectives,
      target_audience: targetAudience,
      is_published: isPublished,
      category_id: categoryId || null,
      city_id: cityId || null,
      association_id: associationId || null,
      delivery_mode_id: deliveryModeId || null,
    };

    try {
      if (isEdit) {
        await api.put(`/courses/${id}`, payload);
      } else {
        await api.post("/courses", payload);
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
        className="bg-white shadow rounded-lg p-6 space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            required
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="">None</option>
              {taxonomies.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="">None</option>
              {taxonomies.cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Association
            </label>
            <select
              value={associationId}
              onChange={(e) => setAssociationId(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="">None</option>
              {taxonomies.associations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Mode
            </label>
            <select
              value={deliveryModeId}
              onChange={(e) => setDeliveryModeId(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="">None</option>
              {taxonomies.delivery_modes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

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
