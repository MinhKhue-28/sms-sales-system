import { all, get, run } from "../db";
import { assert } from "../domain";
import { SETTING_DEFAULTS } from "../settings-defaults";
import { audit, type Actor } from "./core";

export function listSettings() {
  return all<{ key: string; value: string; description: string | null }>("SELECT * FROM settings ORDER BY key");
}

const VALIDATORS: Record<string, (v: string) => boolean> = {
  bant_threshold: (v) => /^\d+$/.test(v) && Number(v) <= 100,
  discount_threshold_pct: (v) => /^\d+(\.\d+)?$/.test(v) && Number(v) <= 100,
  manager_gate_mode: (v) => ["HIGH_OR_OPEN_RISK", "ALWAYS", "NEVER"].includes(v),
  ai_auto_convert: (v) => v === "false", // ADR-03 chưa chốt: khóa ở false cho tới khi nhóm quyết định
  allow_direct_order: (v) => v === "false", // ADR-07 chưa chốt
  agent_qualification_enabled: (v) => v === "true" || v === "false",
  agent_opportunity_enabled: (v) => v === "true" || v === "false",
  opp_refresh_hours: (v) => /^\d+$/.test(v) && Number(v) >= 1,
  email_window_days: (v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 365,
  qualification_tcp: (v) => v.trim().length >= 10,
};

export function setSetting(actor: Actor, key: string, value: string) {
  assert(key in SETTING_DEFAULTS, "Tham số không tồn tại");
  assert(VALIDATORS[key]?.(value.trim()) ?? true, `Giá trị không hợp lệ cho ${key}`);
  const old = get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key)?.value;
  if (old === value.trim()) return;
  run("INSERT INTO settings (key, value, description) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value.trim(), SETTING_DEFAULTS[key].description);
  audit(actor, "setting", 0, "UPDATE", { from: old ?? null, to: value.trim(), reason: key });
}

export function recentAudit(limit = 100) {
  return all<{
    id: number; entity_type: string; entity_id: number; action: string; from_status: string | null; to_status: string | null;
    actor_type: string; actor_label: string; reason: string | null; created_at: string;
  }>("SELECT * FROM audit_log ORDER BY id DESC LIMIT ?", limit);
}

export function dashboard(userId: number) {
  const pipeline = all<{ stage: string; n: number; amount: number }>(
    "SELECT stage, COUNT(*) AS n, COALESCE(SUM(amount),0) AS amount FROM opportunities GROUP BY stage",
  );
  const leads = all<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM leads GROUP BY status");
  const orders = all<{ status: string; n: number; amount: number }>("SELECT status, COUNT(*) AS n, COALESCE(SUM(total),0) AS amount FROM orders GROUP BY status");
  const ar = get<{ issued: number; paid: number }>(
    "SELECT COALESCE(SUM(amount),0) AS issued, COALESCE(SUM(paid_amount),0) AS paid FROM invoices WHERE status IN ('ISSUED','PARTIALLY_PAID','PAID')",
  ) ?? { issued: 0, paid: 0 };
  const pendingApprovals = get<{ n: number }>("SELECT COUNT(*) AS n FROM approvals WHERE status='PENDING'")?.n ?? 0;
  const pendingAi = get<{ n: number }>(
    "SELECT (SELECT COUNT(*) FROM ai_suggestions WHERE status='PENDING_REVIEW') + (SELECT COUNT(*) FROM opportunity_research WHERE status='PENDING_REVIEW') AS n",
  )?.n ?? 0;
  const tasks = all<{ id: number; title: string; entity_type: string | null; entity_id: number | null; due_date: string | null; source: string }>(
    "SELECT * FROM tasks WHERE assignee_id = ? AND status = 'OPEN' ORDER BY due_date LIMIT 10",
    userId,
  );
  const notifications = all<{ id: number; message: string; link: string | null; is_read: number; created_at: string }>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 8",
    userId,
  );
  const atRisk = all<{ id: number; code: string; name: string; account_name: string; stage: string; importance: string | null; open_risks: number }>(
    `SELECT o.id, o.code, o.name, a.name AS account_name, o.stage, o.importance,
       (SELECT COUNT(*) FROM opportunity_risks r WHERE r.opportunity_id = o.id AND r.status='OPEN') AS open_risks
     FROM opportunities o JOIN accounts a ON a.id = o.account_id
     WHERE o.stage NOT IN ('WON','LOST') ORDER BY open_risks DESC, o.amount DESC LIMIT 5`,
  );
  return { pipeline, leads, orders, ar, pendingApprovals, pendingAi, tasks, notifications, atRisk };
}

export function unreadCount(userId: number) {
  return get<{ n: number }>("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0", userId)?.n ?? 0;
}

export function markNotificationsRead(userId: number) {
  run("UPDATE notifications SET is_read = 1 WHERE user_id = ?", userId);
}

export function completeTask(userId: number, taskId: number) {
  run("UPDATE tasks SET status='DONE' WHERE id = ? AND assignee_id = ?", taskId, userId);
}
