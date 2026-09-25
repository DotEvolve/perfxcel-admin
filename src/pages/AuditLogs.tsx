import { RefreshCw, Search } from "lucide-react";
import { Badge, Spinner, Alert } from "@dotevolve/ui-kit";
import { useAuditLogs } from "../hooks/useAuditLogs";

export default function AuditLogs() {
  const { logs, total, loading, error, filters, setFilters, refresh } =
    useAuditLogs();

  const limit = filters.limit ?? 20;
  const currentPage = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track user activity and system events
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw
            className={`w-5 h-5 ${loading ? "animate-spin text-indigo-600" : ""}`}
          />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative max-w-sm flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by action..."
                value={filters.action || ""}
                onChange={(e) =>
                  setFilters({ action: e.target.value || undefined })
                }
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="relative">
              <select
                value={filters.entityType || ""}
                onChange={(e) =>
                  setFilters({ entityType: e.target.value || undefined })
                }
                className="w-full py-2 pl-3 pr-8 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                <option value="">All Entities</option>
                <option value="course">Course</option>
                <option value="course_interest">Interest</option>
                <option value="enrollments">Enrollment</option>
                <option value="training_plan_requests">Training Plan</option>
                <option value="enquiries">Enquiry</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.from || ""}
                onChange={(e) =>
                  setFilters({ from: e.target.value || undefined })
                }
                className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={filters.to || ""}
                onChange={(e) =>
                  setFilters({ to: e.target.value || undefined })
                }
                className="text-sm border border-gray-300 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={() =>
              setFilters({ action: undefined, from: undefined, to: undefined })
            }
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Clear Filters
          </button>
        </div>

        {error && (
          <div className="p-4 border-b border-gray-200">
            <Alert variant="error" title="Error" message={error} />
          </div>
        )}

        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resource ID
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Spinner size="lg" className="text-indigo-600 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {log.userEmail || "Unknown User"}
                      </div>
                      <div className="text-xs text-gray-500">{log.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge label={log.action} color="indigo" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {log.resourceId || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.metadata && Object.keys(log.metadata).length > 0 ? (
                        <details className="group">
                          <summary className="cursor-pointer text-indigo-600 hover:text-indigo-800 font-medium list-none flex items-center gap-1">
                            <span className="group-open:hidden">
                              View Details
                            </span>
                            <span className="hidden group-open:inline">
                              Hide Details
                            </span>
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded border text-xs overflow-x-auto max-w-sm whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {loading && logs.length > 0 && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
              <Spinner size="lg" className="text-indigo-600" />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-xl">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium">{logs.length}</span> of{" "}
            <span className="font-medium">{total}</span> results
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setFilters({ page: currentPage - 1 })}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setFilters({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages || loading}
              className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
