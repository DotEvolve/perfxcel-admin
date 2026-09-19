import { useState, useEffect } from "react";
import {
  getInterests,
  updateInterestStatus,
  createEnrollment,
  getCourses,
} from "../lib/api";
import type { PaginatedResponse } from "../lib/api";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import Pagination from "../components/Pagination";
import ConfirmationModal from "../components/ConfirmationModal";

export default function Interests() {
  const [interests, setInterests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const [confirmConvertId, setConfirmConvertId] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<Record<string, string>>({});

  // Filters and Sorting State
  const [page, setPage] = useState(1);
  const limit = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    // We only need the course titles for the filter dropdown
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
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
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
      console.error(err);
      setConvertError((prev) => ({
        ...prev,
        [id]: err.response?.data?.message || "Failed to convert",
      }));
    } finally {
      setConverting(null);
    }
  };

  const handleConvertToEnrollment = (id: string) => {
    setConfirmConvertId(id);
  };

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
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
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

  const handleDownloadCSV = async () => {
    try {
      // Fetch all matching filters without pagination for CSV export
      const params: any = { limit: 10000, sort: `${sortField}:${sortOrder}` };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (courseFilter !== "all") params.course_id = courseFilter;

      const res: PaginatedResponse<any> = await getInterests(params);

      if (res.data.length === 0) {
        alert("No data to download.");
        return;
      }

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
      alert("Failed to download CSV");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Registered Interests
        </h1>
        <button
          onClick={handleDownloadCSV}
          disabled={total === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
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
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("created_at")}
                    >
                      Date <SortIcon field="created_at" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("name")}
                    >
                      Name & Contact <SortIcon field="name" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                      Course
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("company")}
                    >
                      Company <SortIcon field="company" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("status")}
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(interest.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {interest.name}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <select
                          value={interest.status}
                          onChange={(e) =>
                            handleUpdateStatus(interest.id, e.target.value)
                          }
                          disabled={
                            updating === interest.id ||
                            converting === interest.id ||
                            interest.status === "enrolled"
                          }
                          className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 inline-block mr-2"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="enrolled">Enrolled</option>
                          <option value="rejected">Rejected</option>
                        </select>

                        {interest.status === "enrolled" && (
                          <div className="inline-block flex-col align-top">
                            <button
                              onClick={() =>
                                handleConvertToEnrollment(interest.id)
                              }
                              disabled={converting === interest.id}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              {converting === interest.id
                                ? "Converting..."
                                : "Convert to Enrollment"}
                            </button>
                            {convertError[interest.id] && (
                              <div className="text-red-500 text-xs mt-1 block">
                                {convertError[interest.id]}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {interests.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
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

      <ConfirmationModal
        isOpen={!!confirmConvertId}
        title="Convert to Enrollment"
        message="Are you sure you want to convert this enquiry into an enrollment? This will create an active training record and update the enquiry status."
        confirmText="Convert"
        cancelText="Cancel"
        onConfirm={() => confirmConvertId && executeConversion(confirmConvertId)}
        onCancel={() => setConfirmConvertId(null)}
        isDestructive={false}
      />
    </div>
  );
}
