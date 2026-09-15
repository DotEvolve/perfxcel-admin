import React from "react";
import { Card, Badge, Spinner, Alert } from "@dotevolve/ui-kit";
import { BookOpen, Tags, Users, GraduationCap, RefreshCw } from "lucide-react";
import { useMetrics } from "../hooks/useMetrics";

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, icon, children }) => {
  return (
    <div className="h-full">
      <Card padding="md">
        <div className="flex flex-col h-full min-h-[250px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
            <span className="text-indigo-400">{icon}</span>
          </div>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default function Dashboard() {
  const { metrics, loading, error, refresh } = useMetrics();

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold text-gray-900">Dashboard</h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error !== null && (
        <Alert variant="error" message={error} />
      )}

      {metrics === null && loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : metrics !== null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0 pb-6">
          <MetricCard title="Courses & Catalog" icon={<BookOpen className="w-5 h-5" />}>
            <div className="flex-1 flex flex-col justify-center items-center">
              <p className="text-6xl font-extrabold text-indigo-600 mb-2">{metrics.courses.total}</p>
              <p className="text-lg text-gray-500 font-medium">Total Published Courses</p>
            </div>
          </MetricCard>

          <MetricCard title="System Taxonomies" icon={<Tags className="w-5 h-5" />}>
            <div className="flex-1 flex flex-col justify-center space-y-4 px-4">
              {[
                ["Categories", metrics.taxonomies.categories],
                ["Cities", metrics.taxonomies.cities],
                ["Associations", metrics.taxonomies.associations],
                ["Delivery Modes", metrics.taxonomies.delivery_modes],
              ].map(([label, count]) => (
                <div key={label as string} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-600 text-lg">{label}</span>
                  <span className="font-bold text-gray-900 text-xl">{count}</span>
                </div>
              ))}
            </div>
          </MetricCard>

          <MetricCard title="Candidate Interests" icon={<Users className="w-5 h-5" />}>
            <div className="flex flex-col h-full">
              <div className="mb-6 flex items-baseline gap-3">
                <p className="text-4xl font-bold text-gray-900">{metrics.interests.total}</p>
                <p className="text-sm text-gray-500 font-medium">Total Inquiries</p>
              </div>
              <div className="space-y-3 flex-1 justify-end flex flex-col">
                {[
                  ["new", metrics.interests.new, "indigo"],
                  ["contacted", metrics.interests.contacted, "amber"],
                  ["enrolled", metrics.interests.enrolled, "green"],
                  ["rejected", metrics.interests.rejected, "rose"],
                ].map(([status, count, color]) => (
                  <div key={status as string} className="flex items-center justify-between py-1">
                    <Badge label={status as string} color={color as any} />
                    <span className="font-semibold text-gray-700 text-lg">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </MetricCard>

          <MetricCard title="Enrollments & Certificates" icon={<GraduationCap className="w-5 h-5" />}>
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-4xl font-bold text-gray-900">{metrics.enrollments.total}</p>
                  <p className="text-sm text-gray-500 font-medium">Total Enrollments</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-green-600">{metrics.certificates.total}</p>
                  <p className="text-sm text-gray-500 font-medium">Certificates Issued</p>
                </div>
              </div>
              <div className="space-y-3 flex-1 justify-end flex flex-col">
                {[
                  ["pending", metrics.enrollments.pending, "gray"],
                  ["in_progress", metrics.enrollments.in_progress, "blue"],
                  ["achieved", metrics.enrollments.achieved, "green"],
                  ["dropped", metrics.enrollments.dropped, "rose"],
                ].map(([status, count, color]) => (
                  <div key={status as string} className="flex items-center justify-between py-1">
                    <Badge label={status as string} color={color as any} />
                    <span className="font-semibold text-gray-700 text-lg">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </MetricCard>
        </div>
      ) : null}
    </div>
  );
}
