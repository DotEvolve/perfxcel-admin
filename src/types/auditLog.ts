export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  userId: string;
  userEmail?: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export interface AuditLogResponse {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}
