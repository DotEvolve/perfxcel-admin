export interface DashboardMetrics {
  courses: {
    total: number;
  };
  taxonomies: {
    categories: number;
    cities: number;
    associations: number;
    delivery_modes: number;
  };
  interests: {
    new: number;
    contacted: number;
    enrolled: number;
    rejected: number;
  };
  enrollments: {
    pending: number;
    in_progress: number;
    achieved: number;
    dropped: number;
  };
}
