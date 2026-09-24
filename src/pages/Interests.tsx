import { useState, useEffect } from "react";
import {
  getInterests,
  updateInterestStatus,
  createEnrollment,
  getCourses,
  createInterestManual,
  resendBrochure,
  deleteInterests,
  hardDeleteInterest,
} from "../lib/api";
import type { PaginatedResponse } from "../lib/api";
import {
  ChevronUp,
  ChevronDown,
  Download,
  Trash2,
  ShieldX,
  ShieldOff,
  FileText,
  Plus,
  Send,
} from "lucide-react";
import Pagination from "../components/Pagination";
import ConfirmationModal from "../components/ConfirmationModal";

function ManualInterestModal({
  isOpen,
  onClose,
  onSuccess,
  courses,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  courses: any[];
}) {
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [requestBrochure, setRequestBrochure] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const selectedCourse = courses.find((c) => c.id === courseId);
  const showBrochureCheckbox = !!selectedCourse?.brochure_url;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInterestManual({
        course_id: courseId,
        name,
        email,
        phone,
        company,
        request_brochure: requestBrochure,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Failed to add interest: " + (err.message || ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        <div className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            Add Interest
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Course *
              </label>
              <select
                required
                value={courseId}
                onChange={(e) => {
                  setCourseId(e.target.value);
                  setRequestBrochure(false);
                }}
                className="w-full border rounded p-2 text-sm mt-1"
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded p-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded p-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded p-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border rounded p-2 text-sm mt-1"
              />
            </div>
            {showBrochureCheckbox && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={requestBrochure}
                  onChange={(e) => setRequestBrochure(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Send Brochure
                </label>
              </div>
            )}
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
              >
                {loading ? "Adding..." : "Add Interest"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:col-start-1 sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function Interests() {
  const [interests, setInterests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<Record<string, string>>({});

  const [page, setPage] = useState(1);
  const limit = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [courses, setCourses] = useState<any[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [resendingBrochureIds, setResendingBrochureIds] = useState<Set<string>>(
    new Set(),
  );
  const [resendBrochureResults, setResendBrochureResults] = useState<
    Record<string, string>
  >({});

  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(
    null,
  );
  const [confirmEraseId, setConfirmEraseId] = useState<string | null>(null);

  useEffect(() => {
    getCourses({ limit: 1000 })
      .then((res) => setCourses(res.data))
      .catch(console.error);
  }, []);

  const loadInterests = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sort: `${sortField}:${sortOrder}` };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (courseFilter !== "all") params.course_id = courseFilter;

      const data: PaginatedResponse<any> = await getInterests(params);
      setInterests(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterests();
  }, [
    page,
    limit,
    searchQuery,
    statusFilter,
    courseFilter,
    sortField,
    sortOrder,
  ]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await updateInterestStatus(id, status);
      await loadInterests();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setConvertError((prev) => ({
        ...prev,
        [id]: axiosErr.response?.data?.message ?? "Failed to update status",
      }));
    } finally {
      setUpdating(null);
    }
  };

  const executeConversion = async (id: string) => {
    setConverting(id);
    setConvertError((prev) => ({ ...prev, [id]: "" }));
    setConfirmConvertId(null);
    try {
      await createEnrollment(id);
      await loadInterests();
    } catch (err: any) {
      setConvertError((prev) => ({
        ...prev,
        [id]: err.response?.data?.message || "Failed to convert",
      }));
    } finally {
      setConverting(null);
    }
  };

  const handleConvertToEnrollment = (id: string) => setConfirmConvertId(id);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "contacted":
        return "bg-yellow-100 text-yellow-800";
      case "enrolled":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4 inline-block ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline-block ml-1" />
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedIds(new Set(interests.map((r) => r.id)));
    else setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDownloadCSV = async () => {
    try {
      const params: any = { limit: 10000, sort: `${sortField}:${sortOrder}` };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (courseFilter !== "all") params.course_id = courseFilter;
      const res: PaginatedResponse<any> = await getInterests(params);
      if (res.data.length === 0) return alert("No data to download.");

      const headers = [
        "Date",
        "Name",
        "Email",
        "Phone",
        "Course",
        "Company",
        "Status",
      ];
      const csvContent = [
        headers.join(","),
        ...res.data.map((i: any) => {
          const date = new Date(i.created_at).toLocaleDateString();
          const escapeCSV = (str: string) =>
            `"${(str || "").replace(/"/g, '""')}"`;
          return [
            date,
            escapeCSV(i.name),
            escapeCSV(i.email),
            escapeCSV(i.phone),
            escapeCSV(i.courses?.title),
            escapeCSV(i.company),
            escapeCSV(i.status),
          ].join(",");
        }),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `registered_interests_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleResendBrochure = async (id: string) => {
    setResendingBrochureIds((prev) => new Set(prev).add(id));
    try {
      const res = await resendBrochure(id);
      setResendBrochureResults((prev) => ({
        ...prev,
        [id]: res.regenerated ? "Link regenerated & sent" : "Link resent",
      }));
    } catch (err: any) {
      setResendBrochureResults((prev) => ({
        ...prev,
        [id]: "Failed to resend",
      }));
    } finally {
      setResendingBrochureIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setTimeout(() => {
        setResendBrochureResults((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 3000);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteIds) return;
    try {
      await deleteInterests(confirmDeleteIds);
      setSelectedIds(new Set());
      loadInterests();
    } catch (err) {
      alert("Failed to delete.");
    } finally {
      setConfirmDeleteIds(null);
    }
  };

  const handleEraseConfirm = async () => {
    if (!confirmEraseId) return;
    try {
      await hardDeleteInterest(confirmEraseId);
      loadInterests();
    } catch (err) {
      alert("Failed to erase data.");
    } finally {
      setConfirmEraseId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Registered Interests
        </h1>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmDeleteIds(Array.from(selectedIds))}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Interest
          </button>
          <button
            onClick={handleDownloadCSV}
            disabled={total === 0}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input
          type="text"
          placeholder="Search name, email, company..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="enrolled">Enrolled</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2 px-3 border bg-white max-w-xs"
        >
          <option value="all">All Courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 flex flex-col">
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading interests...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 select-none">
                  <tr>
                    <th className="px-6 py-3 text-left w-12">
                      <input
                        type="checkbox"
                        onChange={toggleSelectAll}
                        checked={
                          interests.length > 0 &&
                          selectedIds.size === interests.length
                        }
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("created_at")}
                    >
                      Date <SortIcon field="created_at" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      Name & Contact <SortIcon field="name" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Course
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("company")}
                    >
                      Company <SortIcon field="company" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("status")}
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {interests.map((interest) => (
                    <tr
                      key={interest.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(interest.id)}
                          onChange={() => toggleSelect(interest.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(interest.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                          {interest.is_hard_deleted && (
                            <ShieldOff size={14} className="text-gray-400" />
                          )}
                          {interest.is_hard_deleted ? (
                            <span className="italic text-gray-500">Erased</span>
                          ) : (
                            interest.name
                          )}
                          {!interest.is_hard_deleted &&
                            interest.brochure_token && (
                              <span title="Brochure Requested">
                                <FileText
                                  size={14}
                                  className="text-indigo-500 ml-1"
                                />
                              </span>
                            )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {interest.email}
                        </div>
                        {interest.phone && (
                          <div className="text-sm text-gray-500">
                            {interest.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {interest.courses?.title || "Unknown Course"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {interest.company || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(interest.status)}`}
                        >
                          {interest.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={interest.status}
                              onChange={(e) => {
                                if (e.target.value === "enrolled")
                                  handleConvertToEnrollment(interest.id);
                                else
                                  handleUpdateStatus(
                                    interest.id,
                                    e.target.value,
                                  );
                              }}
                              disabled={
                                updating === interest.id ||
                                converting === interest.id ||
                                interest.status === "enrolled" ||
                                interest.is_hard_deleted
                              }
                              className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
                            >
                              <option value="new">New</option>
                              <option value="contacted">Contacted</option>
                              <option value="enrolled">Enrolled</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <button
                              onClick={() =>
                                handleConvertToEnrollment(interest.id)
                              }
                              disabled={
                                converting === interest.id ||
                                interest.status === "enrolled" ||
                                interest.is_hard_deleted
                              }
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              {converting === interest.id
                                ? "Converting..."
                                : interest.status === "enrolled"
                                  ? "Converted"
                                  : "Convert to Enrollment"}
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            {resendBrochureResults[interest.id] && (
                              <span className="text-xs text-green-600">
                                {resendBrochureResults[interest.id]}
                              </span>
                            )}
                            {!interest.is_hard_deleted &&
                              interest.brochure_token && (
                                <button
                                  onClick={() =>
                                    handleResendBrochure(interest.id)
                                  }
                                  disabled={resendingBrochureIds.has(
                                    interest.id,
                                  )}
                                  className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                  title="Resend Brochure"
                                >
                                  <Send size={16} />{" "}
                                  <span className="text-xs">Resend</span>
                                </button>
                              )}
                            {!interest.is_hard_deleted && (
                              <button
                                onClick={() => setConfirmEraseId(interest.id)}
                                className="text-orange-600 hover:text-orange-900 flex items-center gap-1"
                                title="Erase PII (GDPR)"
                              >
                                <ShieldX size={16} />{" "}
                                <span className="text-xs">Erase</span>
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteIds([interest.id])}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          {convertError[interest.id] && (
                            <div className="text-red-500 text-xs">
                              {convertError[interest.id]}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {interests.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No registered interests match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ManualInterestModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          loadInterests();
        }}
        courses={courses}
      />

      <ConfirmationModal
        isOpen={!!confirmConvertId}
        title="Convert to Enrollment"
        message="Are you sure you want to convert this enquiry into an enrollment? This will create an active training record and update the enquiry status."
        confirmText="Convert"
        cancelText="Cancel"
        onConfirm={() =>
          confirmConvertId && executeConversion(confirmConvertId)
        }
        onCancel={() => setConfirmConvertId(null)}
        isDestructive={false}
      />

      {confirmDeleteIds && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Interests"
          message={`Are you sure you want to delete ${confirmDeleteIds.length} interest(s)?`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmDeleteIds(null)}
          confirmText="Delete"
          isDestructive={true}
        />
      )}

      {confirmEraseId && (
        <ConfirmationModal
          isOpen={true}
          title="Erase PII (GDPR Erasure)"
          message="This will permanently erase all personal data. This cannot be undone. Are you sure?"
          onConfirm={handleEraseConfirm}
          onCancel={() => setConfirmEraseId(null)}
          confirmText="Erase Data"
          isDestructive={true}
        />
      )}
    </div>
  );
}
