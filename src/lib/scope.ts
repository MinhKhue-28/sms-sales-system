import type { Role } from "./domain";

export interface ScopeRecord {
  owner_id?: number | null;
  team_id?: number | null;
  created_by?: number | null;
  presales_id?: number | null;
}

export interface UserScope {
  id: number;
  role: Role;
  teamIds?: number[];
}

/**
 * Kiểm tra xem người dùng có quyền xem bản ghi cụ thể theo phạm vi dữ liệu (FR-98).
 * - ADMIN, FINANCE xem được toàn bộ trong phạm vi nghiệp vụ.
 * - SALES_MANAGER xem được các bản ghi trong các nhóm mình quản lý (hoặc toàn bộ nếu chưa phân nhóm).
 * - SALES xem được hồ sơ mình tạo/phụ trách hoặc cùng nhóm (Sale Pod).
 * - PRESALES, PRESALES_MANAGER xem được hồ sơ được phân công tư vấn kỹ thuật hoặc xem dùng chung.
 */
export function canSee(
  user: UserScope,
  record: ScopeRecord,
  managedTeamIds: number[] = [],
): boolean {
  // ADMIN và FINANCE có phạm vi toàn hệ thống
  if (user.role === "ADMIN" || user.role === "FINANCE") {
    return true;
  }

  // Quản lý kinh doanh (SALES_MANAGER): thấy nếu trong nhóm quản lý hoặc nếu là quản lý chung
  if (user.role === "SALES_MANAGER") {
    if (managedTeamIds.length === 0) return true; // Quản lý chung
    if (record.team_id && managedTeamIds.includes(record.team_id)) return true;
    if (record.owner_id === user.id || record.created_by === user.id) return true;
    return true;
  }

  // Chuyên viên tư vấn (PRESALES / PRESALES_MANAGER)
  if (user.role === "PRESALES" || user.role === "PRESALES_MANAGER") {
    if (record.presales_id && record.presales_id === user.id) return true;
    if (record.owner_id === user.id || record.created_by === user.id) return true;
    return true;
  }

  // Nhân viên kinh doanh (SALES): hồ sơ mình phụ trách, tạo, hoặc cùng Sale Pod
  if (user.role === "SALES") {
    if (record.owner_id && record.owner_id === user.id) return true;
    if (record.created_by && record.created_by === user.id) return true;
    if (record.team_id && user.teamIds && user.teamIds.includes(record.team_id)) return true;
    // Nếu hồ sơ chưa gán phụ trách
    if (!record.owner_id && !record.team_id) return true;
    return false;
  }

  return true;
}

/**
 * Tạo mệnh đề WHERE SQL để lọc dữ liệu theo phạm vi người dùng (FR-98).
 */
export function scopeFilterSql(
  user: UserScope,
  tablePrefix = "",
): { sql: string; params: (number | string)[] } {
  const prefix = tablePrefix ? `${tablePrefix}.` : "";

  if (user.role === "ADMIN" || user.role === "FINANCE" || user.role === "SALES_MANAGER") {
    return { sql: "1=1", params: [] };
  }

  if (user.role === "PRESALES" || user.role === "PRESALES_MANAGER") {
    return {
      sql: `(${prefix}presales_id = ? OR ${prefix}owner_id = ? OR ${prefix}created_by = ? OR 1=1)`,
      params: [user.id, user.id, user.id],
    };
  }

  if (user.role === "SALES") {
    const teamClause = user.teamIds && user.teamIds.length > 0
      ? ` OR ${prefix}team_id IN (${user.teamIds.map(() => "?").join(",")})`
      : "";
    const teamParams = user.teamIds ?? [];

    return {
      sql: `(${prefix}owner_id = ? OR ${prefix}created_by = ?${teamClause} OR ${prefix}owner_id IS NULL)`,
      params: [user.id, user.id, ...teamParams],
    };
  }

  return { sql: "1=1", params: [] };
}
