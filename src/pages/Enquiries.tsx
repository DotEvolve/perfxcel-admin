import { useState, useEffect } from "react";
import { getEnquiries, updateEnquiryStatus } from "../lib/api";
import Pagination from "../components/Pagination";
import { Download } from "lucide-react";
import FilterBar from "../components/FilterBar";

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const res = await getEnquiries({
        search,
        page,
        limit: 10,
        status: status !== "all" ? status : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setEnquiries(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [page, search, status, dateFrom, dateTo]);

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "new" ? "responded" : "new";
    try {
      await updateEnquiryStatus(id, newStatus);
      fetchEnquiries();
    } catch (err) {
      console.error(err);
    }
  };

  // handleSearch removed

  const handleDownloadCSV = async () => {
    try {
      const res = await getEnquiries({ search, limit: 10000 });
      if (res.data.length === 0) {
        alert("No data to download.");
        return;
      }

      const headers = ["Date", "Name", "Email", "Course", "Status", "Message"];
      const csvContent = [
        headers.join(","),
        ...res.data.map((enq: any) => {
          const date = new Date(enq.created_at).toLocaleDateString();
          const escapeCSV = (str: string) =>
            `"${(str || "").replace(/"/g, '""')}"`;

          return [
            date,
            escapeCSV(enq.name + (enq.company ? ` (${enq.company})` : "")),
            escapeCSV(enq.email),
            escapeCSV(enq.courses?.title || "General Enquiry"),
            escapeCSV(enq.status),
            escapeCSV(enq.message),
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `enquiries_${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && enquiries.length === 0) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Enquiries</h2>
        <button
          onClick={handleDownloadCSV}
          disabled={total === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <FilterBar
          search={search}
          onSearchChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          statusOptions={[
            { label: "New", value: "new" },
            { label: "Contacted", value: "contacted" },
            { label: "Closed", value: "closed" },
          ]}
          status={status}
          onStatusChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          dateFrom={dateFrom}
          onDateFromChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
          dateTo={dateTo}
          onDateToChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
          onClear={() => {
            setSearch("");
            setStatus("all");
            setDateFrom("");
            setDateTo("");
            setPage(1);
          }}
        />

        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Course
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Message
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {enquiries.map((enq) => (
              <tr key={enq.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(enq.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {enq.name}
                  {enq.company && (
                    <div className="text-xs text-gray-500">{enq.company}</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {enq.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {enq.courses?.title || "General Enquiry"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      enq.status === "new"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {enq.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 whitespace-normal max-w-xs">
                  {enq.message}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleStatusChange(enq.id, enq.status)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Mark {enq.status === "new" ? "Responded" : "New"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {total > 0 && (
          <Pagination
            page={page}
            total={total}
            limit={10}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  );
}
