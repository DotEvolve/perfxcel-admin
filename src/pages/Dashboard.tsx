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
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              {title}
            </h3>
            <span className="text-indigo-400">{icon}</span>
          </div>
          <div className="flex-1 flex flex-col">{children}</div>
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

      {error !== null && <Alert variant="error" message={error} />}

      {metrics === null && loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" className="text-indigo-600" />
        </div>
      ) : metrics !== null ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 pb-6">
          {/* Column 1: Courses & Taxonomies */}
          <div className="flex flex-col gap-6 h-full">
            <div className="flex-1 min-h-0">
              <MetricCard
                title="Courses & Catalog"
                icon={<BookOpen className="w-5 h-5" />}
              >
                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <p className="text-4xl font-extrabold text-indigo-600 mb-1">
                      {metrics.courses.total}
                    </p>
                    <p className="text-sm text-gray-500 font-medium">
                      Total Published Courses
                    </p>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-2">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Top Categories
                    </h4>
                    <div className="space-y-3">
                      {metrics.detailed.topCategories.map((cat) => (
                        <div
                          key={cat.name}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm font-medium text-gray-700 truncate pr-4">
                            {cat.name}
                          </span>
                          <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded-full">
                            {cat.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </MetricCard>
            </div>

            <div className="flex-1 min-h-0">
              <MetricCard
                title="System Taxonomies"
                icon={<Tags className="w-5 h-5" />}
              >
                <div className="flex-1 flex flex-col justify-center space-y-3 px-2">
                  {[
                    ["Categories", metrics.taxonomies.categories],
                    ["Cities", metrics.taxonomies.cities],
                    ["Associations", metrics.taxonomies.associations],
                    ["Delivery Modes", metrics.taxonomies.delivery_modes],
                  ].map(([label, count]) => (
                    <div
                      key={label as string}
                      className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-gray-600 text-sm">{label}</span>
                      <span className="font-bold text-gray-900 text-base">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </MetricCard>
            </div>
          </div>

          {/* Column 2: Interests */}
          <MetricCard
            title="Candidate Interests"
            icon={<Users className="w-5 h-5" />}
          >
            <div className="flex flex-col h-full">
              <div className="mb-6 flex items-baseline gap-3">
                <p className="text-4xl font-bold text-gray-900">
                  {metrics.interests.total}
                </p>
                <p className="text-sm text-gray-500 font-medium">
                  Total Inquiries
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  ["new", metrics.interests.new, "indigo"],
                  ["contacted", metrics.interests.contacted, "amber"],
                  ["enrolled", metrics.interests.enrolled, "green"],
                  ["rejected", metrics.interests.rejected, "rose"],
                ].map(([status, count, color]) => (
                  <div
                    key={status as string}
                    className="bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge label={status as string} color={color as any} />
                    </div>
                    <span className="font-semibold text-gray-900 text-xl">
                      {count as number}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto pr-2 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Most Demanded Courses
                </h4>
                <div className="space-y-4">
                  {metrics.detailed.mostDemanded.map((course) => (
                    <div
                      key={course.title}
                      className="flex items-start justify-between group"
                    >
                      <span
                        className="text-sm font-medium text-gray-700 truncate pr-4"
                        title={course.title}
                      >
                        {course.title}
                      </span>
                      <span className="flex-shrink-0 text-sm font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                        {course.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MetricCard>

          {/* Column 3: Enrollments */}
          <MetricCard
            title="Enrollments & Certificates"
            icon={<GraduationCap className="w-5 h-5" />}
          >
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-4xl font-bold text-gray-900">
                    {metrics.enrollments.total}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">
                    Enrollments
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-green-600">
                    {metrics.certificates.total}
                  </p>
                  <p className="text-sm text-gray-500 font-medium">
                    Certificates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  ["pending", metrics.enrollments.pending, "gray"],
                  ["in_progress", metrics.enrollments.in_progress, "blue"],
                  ["achieved", metrics.enrollments.achieved, "green"],
                  ["dropped", metrics.enrollments.dropped, "rose"],
                ].map(([status, count, color]) => (
                  <div
                    key={status as string}
                    className="bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge label={status as string} color={color as any} />
                    </div>
                    <span className="font-semibold text-gray-900 text-xl">
                      {count as number}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 border-t border-gray-100 pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Highest Completion Numbers
                </h4>
                <div className="space-y-4">
                  {metrics.detailed.topCompletions.map((course) => (
                    <div
                      key={course.title}
                      className="flex items-center justify-between"
                    >
                      <div className="flex flex-col truncate pr-4">
                        <span
                          className="text-sm font-medium text-gray-700 truncate"
                          title={course.title}
                        >
                          {course.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-md"
                          title="Achieved"
                        >
                          {course.achieved} ✓
                        </span>
                        <span
                          className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md"
                          title="In Progress"
                        >
                          {course.in_progress} ⋯
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </MetricCard>
        </div>
      ) : null}
    </div>
  );
}
