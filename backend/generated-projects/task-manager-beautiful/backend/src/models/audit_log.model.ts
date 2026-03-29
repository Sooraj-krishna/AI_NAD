export interface AuditLog { id: string; user_id: string; action: string; timestamp: Date; }

export interface AuditLogsModel {
  create(data: AuditLog): Promise<AuditLog>
  readAll(): Promise<AuditLog[]>
  readById(id: string): Promise<AuditLog | null>
  update(id: string, data: Partial<AuditLog>): Promise<AuditLog | null>
  deleteById(id: string): Promise<void>
}