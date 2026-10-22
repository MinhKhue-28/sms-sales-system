import type { Role } from "./domain";

// Ma trận phân quyền theo vai trò (brief mục 3). Kiểm tra ở server trong mọi Server Action/API.
const MATRIX = {
  "lead.write": ["SALES", "SALES_MANAGER"],
  "lead.convert": ["SALES", "SALES_MANAGER"],
  "lead.disqualify": ["SALES", "SALES_MANAGER"],
  "account.write": ["SALES", "SALES_MANAGER"],
  "opp.write": ["SALES", "SALES_MANAGER"],
  "opp.solution": ["PRESALES", "SALES_MANAGER"],
  "opp.stage": ["SALES", "SALES_MANAGER"],
  "quote.write": ["SALES", "SALES_MANAGER"],
  "order.create": ["SALES", "SALES_MANAGER"],
  "fulfillment.update": ["DELIVERY"],
  "invoice.create": ["SALES", "FINANCE"],
  "invoice.finance": ["FINANCE"],
  "approval.manager": ["SALES_MANAGER"],
  "approval.legal": ["LEGAL"],
  "ai.run": ["SALES", "SALES_MANAGER"],
  "ai.review": ["SALES", "SALES_MANAGER"],
  "admin.settings": ["ADMIN"],
  "admin.logs": ["ADMIN", "SALES_MANAGER"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof MATRIX;

export function can(role: Role, permission: Permission): boolean {
  return (MATRIX[permission] as readonly Role[]).includes(role);
}

export const PERMISSION_MATRIX = MATRIX;
