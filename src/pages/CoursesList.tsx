import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { getCourses, getTaxonomies, bulkUpdateCourses, deleteCourse } from "../lib/api";
import type { Course, TaxonomyItem, PaginatedResponse } from "../lib/api";
import Pagination from "../components/Pagination";

export function CoursesList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters, Pagination, Search, Sort state
  const [page, setPage] = useState(1);
  const limit = 20;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("created_at:desc");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [cityIds, setCityIds] = useState<string[]>([]);
  const [associationIds, setAssociationIds] = useState<string[]>([]);
  const [deliveryModeIds, setDeliveryModeIds] = useState<string[]>([]);

  // Selection for bulk edit
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getWebsiteUrl = (course: Course) => {
    const appUrl = import.meta.env.VITE_APP_URL;
    return `${appUrl}/courses/${course.slug || course.id}`;
  };

  // Taxonomies for filters and bulk edit
  const [taxonomies, setTaxonomies] = useState<{
    categories: TaxonomyItem[];
    cities: TaxonomyItem[];
    associations: TaxonomyItem[];
    delivery_modes: TaxonomyItem[];
  } | null>(null);

  useEffect(() => {
    getTaxonomies().then(setTaxonomies).catch(console.error);
  }, []);

  const fetchCourses = () => {
    setLoading(true);
    const params: any = { page, limit, sort };
    if (search) params.search = search;
    if (categoryIds.length > 0) params.category_id = categoryIds;
    if (cityIds.length > 0) params.city_id = cityIds;
    if (associationIds.length > 0) params.association_id = associationIds;
    if (deliveryModeIds.length > 0) params.delivery_mode_id = deliveryModeIds;

    getCourses(params)
      .then((res: PaginatedResponse<Course>) => {
        setCourses(res.data);
        setTotal(res.total);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCourses();
  }, [page, limit, sort, search, categoryIds, cityIds, associationIds, deliveryModeIds]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(courses.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkUpdate = async (updates: Partial<Course>) => {
    try {
      await bulkUpdateCourses(Array.from(selectedIds), updates);
      setIsBulkEditModalOpen(false);
      setSelectedIds(new Set());
      fetchCourses();
    } catch (err) {
      console.error(err);
      alert("Failed to bulk update courses");
    }
  };

  const handleDelete = async (course: Course) => {
    if (!window.confirm(`Delete "${course.title}"? It will be permanently removed after 60 days.`)) return;
    try {
      await deleteCourse(course.id);
      fetchCourses();
    } catch (err) {
      console.error(err);
      alert("Failed to delete course.");
    }
  };

  const handleFilterToggle = (setState: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
    setState(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    setPage(1); // Reset page on filter change
  };

  return (
    <div className="flex h-full gap-6">
      {/* Sidebar Filters */}
      <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow p-4 overflow-y-auto">
        <h4 className="font-medium text-gray-900 mb-4">Filters</h4>
        
        {taxonomies && (
          <div className="space-y-6">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Categories</h5>
              <div className="space-y-2">
                {taxonomies.categories.map(c => (
                  <label key={c.id} className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                           checked={categoryIds.includes(c.id)}
                           onChange={() => handleFilterToggle(setCategoryIds, c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Delivery Modes</h5>
              <div className="space-y-2">
                {taxonomies.delivery_modes.map(c => (
                  <label key={c.id} className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                           checked={deliveryModeIds.includes(c.id)}
                           onChange={() => handleFilterToggle(setDeliveryModeIds, c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Cities</h5>
              <div className="space-y-2">
                {taxonomies.cities.map(c => (
                  <label key={c.id} className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                           checked={cityIds.includes(c.id)}
                           onChange={() => handleFilterToggle(setCityIds, c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Associations</h5>
              <div className="space-y-2">
                {taxonomies.associations.map(c => (
                  <label key={c.id} className="flex items-center text-sm">
                    <input type="checkbox" className="mr-2 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" 
                           checked={associationIds.includes(c.id)}
                           onChange={() => handleFilterToggle(setAssociationIds, c.id)} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold">Courses</h3>
          <div className="flex items-center space-x-3">
            {selectedIds.size > 0 && (
              <button
                onClick={() => setIsBulkEditModalOpen(true)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Bulk Edit ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => navigate("/courses/new")}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Add Course
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4 space-x-4">
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full max-w-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="created_at:desc">Newest First</option>
            <option value="created_at:asc">Oldest First</option>
            <option value="title:asc">Title (A-Z)</option>
            <option value="title:desc">Title (Z-A)</option>
          </select>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-md flex-1 flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center py-10 text-gray-500">
              Loading courses...
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={courses.length > 0 && selectedIds.size === courses.length}
                          onChange={handleSelectAll}
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Course
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery Mode
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {courses.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                          No courses found.
                        </td>
                      </tr>
                    ) : (
                      courses.map((course) => (
                        <React.Fragment key={course.id}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                checked={selectedIds.has(course.id)}
                                onChange={() => handleSelectOne(course.id)}
                              />
                            </td>
                            <td className="px-6 py-4">
                              <h4 className="text-sm font-medium text-gray-900">{course.title}</h4>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500 font-mono">{course.short_code}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {course.categories?.map(c => c.name).join(", ") || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm text-gray-500">
                                {course.delivery_modes?.map(c => c.name).join(", ") || "-"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${course.is_published ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                                {course.is_published ? "Published" : "Draft"}
                              </span>
                              {course.status === 'archived' && (
                                <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  Archived
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button 
                                onClick={() => setExpandedId(expandedId === course.id ? null : course.id)} 
                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                              >
                                {expandedId === course.id ? "Hide" : "Expand"}
                              </button>
                              <button onClick={() => navigate(`/courses/${course.id}/edit`)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                                Edit
                              </button>
                              <a href={getWebsiteUrl(course)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-900 mr-4">
                                View
                              </a>
                              <button
                                onClick={() => handleDelete(course)}
                                className="text-red-500 hover:text-red-700"
                                title="Delete course"
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </td>
                          </tr>
                          {expandedId === course.id && (
                            <tr>
                              <td colSpan={6} className="px-6 py-4 bg-gray-50">
                                <div className="text-sm text-gray-700">
                                  <p><strong>Description:</strong> {course.description}</p>
                                  <p className="mt-2"><strong>Cities:</strong> {course.cities?.map(c => c.name).join(", ") || "None"}</p>
                                  <p className="mt-2"><strong>Associations:</strong> {course.associations?.map(c => c.name).join(", ") || "None"}</p>
                                  <p className="mt-2"><strong>Cost:</strong> {course.cost ? `$${course.cost}` : "N/A"}</p>
                                  <p className="mt-2"><strong>Duration:</strong> {course.duration || "N/A"}</p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} limit={limit} total={total} onPageChange={setPage} />
            </>
          )}
        </div>
      </div>

      {isBulkEditModalOpen && taxonomies && (
        <BulkEditModal
          onClose={() => setIsBulkEditModalOpen(false)}
          onSubmit={handleBulkUpdate}
          count={selectedIds.size}
        />
      )}
    </div>
  );
}

function BulkEditModal({ onClose, onSubmit, count }: any) {
  const [updates, setUpdates] = useState<Partial<Course>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(updates).length === 0) {
      alert("No changes to apply.");
      return;
    }
    onSubmit(updates);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Bulk Edit Courses ({count} selected)</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Publish Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              onChange={(e) => {
                if (e.target.value === "") {
                  const newUpdates = { ...updates };
                  delete newUpdates.is_published;
                  setUpdates(newUpdates);
                } else {
                  setUpdates({ ...updates, is_published: e.target.value === "true" });
                }
              }}
            >
              <option value="">-- No Change --</option>
              <option value="true">Published</option>
              <option value="false">Draft</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Lifecycle Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              onChange={(e) => {
                if (e.target.value === "") {
                  const newUpdates = { ...updates };
                  delete newUpdates.status;
                  setUpdates(newUpdates);
                } else {
                  setUpdates({ ...updates, status: e.target.value as 'active' | 'archived' | 'deleted' });
                }
              }}
            >
              <option value="">-- No Change --</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Apply Changes
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
