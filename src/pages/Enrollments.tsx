import { useState, useEffect } from "react";
import {
  getEnrollments,
  updateEnrollmentStatus,
  resendCertificate,
} from "../lib/api";
import type { PaginatedResponse } from "../lib/api";
import { ChevronUp, ChevronDown, Download } from "lucide-react";
import Pagination from "../components/Pagination";
import ConfirmationModal from "../components/ConfirmationModal";

export interface Enrollment {
  id: string;
  status: string;
  created_at: string;
  course_interests: {
    name: string;
    email: string;
    courses: {
      title: string;
    } | null;
  };
}

export default function Enrollments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [confirmAchieveEnrollment, setConfirmAchieveEnrollment] =
    useState<Enrollment | null>(null);
  const [resendingCert, setResendingCert] = useState<Record<string, boolean>>(
    {},
  );
  const [resendCertSuccess, setResendCertSuccess] = useState<
    Record<string, string>
  >({});
  const [resendCertError, setResendCertError] = useState<
    Record<string, string>
  >({});

  // Filters and Sorting State
  const [page, setPage] = useState(1);
  const limit = 20;
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortField, setSortField] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit, sort: `${sortField}:${sortOrder}` };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;

      const data: PaginatedResponse<Enrollment> = await getEnrollments(params);
      setEnrollments(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnrollments();
  }, [page, limit, searchQuery, statusFilter, sortField, sortOrder]);

  const executeUpdateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await updateEnrollmentStatus(id, status);
      await loadEnrollments();
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateStatus = (enrollment: Enrollment, status: string) => {
    if (status === "achieved") {
      setConfirmAchieveEnrollment(enrollment);
    } else {
      executeUpdateStatus(enrollment.id, status);
    }
  };

  const handleResendCertificate = async (id: string) => {
    setResendingCert((prev) => ({ ...prev, [id]: true }));
    setResendCertSuccess((prev) => ({ ...prev, [id]: "" }));
    setResendCertError((prev) => ({ ...prev, [id]: "" }));
    try {
      await resendCertificate(id);
      setResendCertSuccess((prev) => ({ ...prev, [id]: "Certificate sent!" }));
    } catch (err: any) {
      console.error(err);
      setResendCertError((prev) => ({
        ...prev,
        [id]: err.response?.data?.message || "Failed to resend",
      }));
    } finally {
      setResendingCert((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "achieved":
        return "bg-green-100 text-green-800";
      case "dropped":
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
      const params: any = { limit: 10000, sort: `${sortField}:${sortOrder}` };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;

      const res: PaginatedResponse<Enrollment> = await getEnrollments(params);

      if (res.data.length === 0) {
        alert("No data to download.");
        return;
      }

      const headers = ["Date", "Name", "Email", "Course", "Status"];
      const csvContent = [
        headers.join(","),
        ...res.data.map((i: any) => {
          const date = new Date(i.created_at).toLocaleDateString();
          const escapeCSV = (str: string) =>
            `"${(str || "").replace(/"/g, '""')}"`;

          return [
            date,
            escapeCSV(i.course_interests?.name),
            escapeCSV(i.course_interests?.email),
            escapeCSV(i.course_interests?.courses?.title),
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
        `enrollments_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
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
          placeholder="Search name or email..."
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
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="achieved">Achieved</option>
          <option value="dropped">Dropped</option>
        </select>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 flex flex-col">
        {loading ? (
          <div className="text-center py-10 text-gray-500">
            Loading enrollments...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 select-none">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("status")}
                    >
                      Status <SortIcon field="status" />
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("created_at")}
                    >
                      Created <SortIcon field="created_at" />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {enrollments.map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {enrollment.course_interests?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {enrollment.course_interests?.email || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {enrollment.course_interests?.courses?.title || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(enrollment.status)}`}
                        >
                          {enrollment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(enrollment.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <select
                          value={enrollment.status}
                          onChange={(e) =>
                            handleUpdateStatus(enrollment, e.target.value)
                          }
                          disabled={
                            updating === enrollment.id ||
                            enrollment.status === "achieved"
                          }
                          className="border-gray-300 rounded-md text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:opacity-50 inline-block align-top"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="achieved">Achieved</option>
                          <option value="dropped">Dropped</option>
                        </select>
                        {updating === enrollment.id && (
                          <span className="text-gray-500 ml-2 text-xs">
                            Updating...
                          </span>
                        )}

                        {enrollment.status === "achieved" && (
                          <div className="inline-block flex-col align-top text-left ml-2">
                            <button
                              onClick={() =>
                                handleResendCertificate(enrollment.id)
                              }
                              disabled={resendingCert[enrollment.id]}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {resendingCert[enrollment.id]
                                ? "Resending..."
                                : "Resend Certificate"}
                            </button>
                            {resendCertSuccess[enrollment.id] && (
                              <div className="text-green-600 text-xs mt-1 block">
                                {resendCertSuccess[enrollment.id]}
                              </div>
                            )}
                            {resendCertError[enrollment.id] && (
                              <div className="text-red-500 text-xs mt-1 block">
                                {resendCertError[enrollment.id]}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {enrollments.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No enrollments found matching your filters.
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
        isOpen={!!confirmAchieveEnrollment}
        title="Mark Course Achieved"
        message={
          <>
            Are you sure you want to mark{" "}
            <strong>
              {confirmAchieveEnrollment?.course_interests?.name ||
                "this candidate"}
            </strong>
            's enrollment in{" "}
            <strong>
              {confirmAchieveEnrollment?.course_interests?.courses?.title ||
                "this course"}
            </strong>{" "}
            as achieved?
            <br />
            <br />
            This will issue a certificate and lock the enrollment from further
            changes.
          </>
        }
        confirmText="Mark Achieved"
        cancelText="Cancel"
        onConfirm={() => {
          if (confirmAchieveEnrollment) {
            executeUpdateStatus(confirmAchieveEnrollment.id, "achieved");
            setConfirmAchieveEnrollment(null);
          }
        }}
        onCancel={() => setConfirmAchieveEnrollment(null)}
        isDestructive={false}
      />
    </div>
  );
}
