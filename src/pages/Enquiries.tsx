import { useState, useEffect } from "react";
import { getEnquiries, updateEnquiryStatus } from "../lib/api";
import Pagination from "../components/Pagination";

export default function Enquiries() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEnquiries = async () => {
    try {
      setLoading(true);
      const res = await getEnquiries({ page, limit: 10 });
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
  }, [page]);

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "new" ? "responded" : "new";
    try {
      await updateEnquiryStatus(id, newStatus);
      fetchEnquiries();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  if (loading && enquiries.length === 0) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Enquiries</h2>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
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
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleStatusChange(enq.id, enq.status)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    Mark {enq.status === "new" ? "Responded" : "New"}
                  </button>
                  <div className="mt-1 max-w-xs text-left text-xs text-gray-500 whitespace-normal">
                    {enq.message}
                  </div>
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
