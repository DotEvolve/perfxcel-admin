import { useState, useEffect } from "react";
import {
  getTrainingPlanRequests,
  createTrainingPlanManual,
  resendTrainingPlan,
  deleteTrainingPlans,
  hardDeleteTrainingPlan,
} from "../lib/api";
import {
  Trash2,
  Send,
  ShieldX,
  ShieldOff,
  Plus,
  Download,
} from "lucide-react";
import ConfirmationModal from "../components/ConfirmationModal";
import FilterBar from "../components/FilterBar";

function ManualTrainingPlanModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createTrainingPlanManual({
        name,
        email,
        mobile,
        company,
        designation,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Failed to add request: " + (err.message || ""));
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
            Add Training Plan Request
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                Mobile *
              </label>
              <input
                required
                type="text"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
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
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Designation
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full border rounded p-2 text-sm mt-1"
              />
            </div>
            <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 sm:col-start-2 sm:text-sm"
              >
                {loading ? "Adding..." : "Add Request"}
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

export default function TrainingPlanRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [resendingIds, setResendingIds] = useState<Set<string>>(new Set());
  const [resendResults, setResendResults] = useState<Record<string, string>>(
    {},
  );

  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(
    null,
  );
  const [confirmEraseId, setConfirmEraseId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [page, search, dateFrom, dateTo]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getTrainingPlanRequests({
        search,
        page,
        limit,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setRequests(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to load training plan requests");
    } finally {
      setLoading(false);
    }
  };

  // removed handleSearch

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(requests.map((r) => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleResend = async (id: string) => {
    setResendingIds((prev) => new Set(prev).add(id));
    try {
      const res = await resendTrainingPlan(id);
      setResendResults((prev) => ({
        ...prev,
        [id]: res.regenerated ? "Link regenerated & sent" : "Link resent",
      }));
    } catch (err: any) {
      setResendResults((prev) => ({ ...prev, [id]: "Failed to resend" }));
    } finally {
      setResendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setTimeout(() => {
        setResendResults((prev) => {
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
      await deleteTrainingPlans(confirmDeleteIds);
      setSelectedIds(new Set());
      fetchRequests();
    } catch (err) {
      alert("Failed to delete.");
    } finally {
      setConfirmDeleteIds(null);
    }
  };

  const handleEraseConfirm = async () => {
    if (!confirmEraseId) return;
    try {
      await hardDeleteTrainingPlan(confirmEraseId);
      fetchRequests();
    } catch (err) {
      alert("Failed to erase data.");
    } finally {
      setConfirmEraseId(null);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await getTrainingPlanRequests({ search, limit: 10000 });
      if (res.data.length === 0) {
        alert("No data to download.");
        return;
      }

      const headers = [
        "Date",
        "Name",
        "Email",
        "Mobile",
        "Company",
        "Designation",
        "Status",
        "Expiration",
      ];
      const csvContent = [
        headers.join(","),
        ...res.data.map((req: any) => {
          const date = new Date(req.created_at).toLocaleDateString();
          const escapeCSV = (str: string) =>
            `"${(str || "").replace(/"/g, '""')}"`;
          const status = req.is_hard_deleted ? "Erased" : "Active";
          const expiration =
            new Date(req.expires_at) < new Date() ? "Expired" : "Valid";

          return [
            date,
            escapeCSV(req.is_hard_deleted ? "Erased" : req.name),
            escapeCSV(req.email),
            escapeCSV(req.mobile),
            escapeCSV(req.company),
            escapeCSV(req.designation),
            status,
            expiration,
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `training_plan_requests_${new Date().toISOString().split("T")[0]}.csv`,
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
          Training Plan Requests
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
            Add Request
          </button>
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <FilterBar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          dateFrom={dateFrom}
          onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
          dateTo={dateTo}
          onDateToChange={(v) => { setDateTo(v); setPage(1); }}
          onClear={() => {
            setSearch("");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        />

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    onChange={toggleSelectAll}
                    checked={
                      requests.length > 0 &&
                      selectedIds.size === requests.length
                    }
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Professional Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Expiration
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Loading requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    No requests found.
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(request.id)}
                        onChange={() => toggleSelect(request.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {request.is_hard_deleted && (
                          <ShieldOff size={14} className="text-gray-400" />
                        )}
                        {request.is_hard_deleted ? (
                          <span className="italic text-gray-500">Erased</span>
                        ) : (
                          request.name
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.mobile}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {request.company || "-"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {request.designation || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.expires_at) < new Date() ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Expired
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Valid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2 flex justify-end items-center">
                      {resendResults[request.id] && (
                        <span className="text-xs text-green-600 mr-2">
                          {resendResults[request.id]}
                        </span>
                      )}
                      {!request.is_hard_deleted && (
                        <button
                          onClick={() => handleResend(request.id)}
                          disabled={resendingIds.has(request.id)}
                          className="text-indigo-600 hover:text-indigo-900 px-1"
                          title="Resend Link"
                        >
                          <Send size={18} />
                        </button>
                      )}
                      {!request.is_hard_deleted && (
                        <button
                          onClick={() => setConfirmEraseId(request.id)}
                          className="text-orange-600 hover:text-orange-900 px-1"
                          title="Erase PII (GDPR)"
                        >
                          <ShieldX size={18} />
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDeleteIds([request.id])}
                        className="text-red-600 hover:text-red-900 px-1"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ManualTrainingPlanModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchRequests();
        }}
      />

      {confirmDeleteIds && (
        <ConfirmationModal
          isOpen={true}
          title="Delete Requests"
          message={`Are you sure you want to delete ${confirmDeleteIds.length} request(s)? This action will hide them from the view.`}
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
          message="This will permanently erase all personal data associated with this request. This cannot be undone. Are you sure?"
          onConfirm={handleEraseConfirm}
          onCancel={() => setConfirmEraseId(null)}
          confirmText="Erase Data"
          isDestructive={true}
        />
      )}
    </div>
  );
}
