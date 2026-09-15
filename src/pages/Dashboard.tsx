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
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
        <span className="text-indigo-400">{icon}</span>
      </div>
      {children}
    </Card>
  );
};

export default function Dashboard() {
  const { metrics, loading, error, refresh } = useMetrics();

  return (
    <div className="space-y-6">
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Courses" icon={<BookOpen className="w-5 h-5" />}>
            <p className="text-3xl font-bold text-gray-900">{metrics.courses.total}</p>
            <p className="text-sm text-gray-500 mt-1">Total courses</p>
          </MetricCard>

          <MetricCard title="Taxonomies" icon={<Tags className="w-5 h-5" />}>
            {[
              ["Categories", metrics.taxonomies.categories],
              ["Cities", metrics.taxonomies.cities],
              ["Associations", metrics.taxonomies.associations],
              ["Delivery Modes", metrics.taxonomies.delivery_modes],
            ].map(([label, count]) => (
              <div key={label as string} className="flex items-center justify-between py-1 text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{count}</span>
              </div>
            ))}
          </MetricCard>

          <MetricCard title="Interests" icon={<Users className="w-5 h-5" />}>
            {[
              ["new", metrics.interests.new, "indigo"],
              ["contacted", metrics.interests.contacted, "amber"],
              ["enrolled", metrics.interests.enrolled, "green"],
              ["rejected", metrics.interests.rejected, "rose"],
            ].map(([status, count, color]) => (
              <div key={status as string} className="flex items-center justify-between py-1">
                <Badge label={status as string} color={color as any} />
                <span className="font-semibold text-gray-900">{count as number}</span>
              </div>
            ))}
          </MetricCard>

          <MetricCard title="Enrollments" icon={<GraduationCap className="w-5 h-5" />}>
            {[
              ["pending", metrics.enrollments.pending, "gray"],
              ["in_progress", metrics.enrollments.in_progress, "green"],
              ["achieved", metrics.enrollments.achieved, "green"],
              ["dropped", metrics.enrollments.dropped, "rose"],
            ].map(([status, count, color]) => (
              <div key={status as string} className="flex items-center justify-between py-1">
                <Badge label={status as string} color={color as any} />
                <span className="font-semibold text-gray-900">{count as number}</span>
              </div>
            ))}
          </MetricCard>
        </div>
      ) : null}
    </div>
  );
}
