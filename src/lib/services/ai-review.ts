// Workspace kiểm duyệt AI: mọi đề xuất của Agent ở trạng thái PENDING_REVIEW cho tới khi con người xử lý.
import { all, get, run, tx } from "../db";
import { assert, BANT_KEYS, type BantKey } from "../domain";
import { email } from "../integrations";
import { actorUserId, addActivity, audit, notify, type Actor } from "./core";
import { disqualifyLead, getLead, updateBant } from "./leads";

export type Suggestion = {
  id: number;
  run_id: number | null;
  agent: "QUALIFICATION" | "OPPORTUNITY";
  kind: "ENRICHMENT" | "BANT_SCORE" | "EMAIL_DRAFT" | "DISQUALIFY" | "CONVERSION";
  entity_type: string;
  entity_id: number;
  title: string;
  payload_json: string;
  evidence_json: string;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  entity_label: string | null;
};

const SELECT = `SELECT s.*, u.name AS reviewed_by_name,
  CASE WHEN s.entity_type = 'lead' THEN (SELECT company_name || ' – ' || contact_name FROM leads WHERE id = s.entity_id) END AS entity_label
  FROM ai_suggestions s LEFT JOIN users u ON u.id = s.reviewed_by`;

export function listSuggestions(filter: { status?: string; entityType?: string; entityId?: number } = {}) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.status) {
    where.push("s.status = ?");
    params.push(filter.status);
  }
  if (filter.entityType && filter.entityId) {
    where.push("s.entity_type = ? AND s.entity_id = ?");
    params.push(filter.entityType, filter.entityId);
  }
  return all<Suggestion>(`${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY s.id DESC`, ...params);
}

export function createSuggestion(input: {
  runId: number;
  agent: Suggestion["agent"];
  kind: Suggestion["kind"];
  entityType: string;
  entityId: number;
  title: string;
  payload: unknown;
  evidence: unknown[];
}) {
  // Không tạo đề xuất trùng loại khi đề xuất cũ chưa được xử lý — thay bằng bản mới nhất.
  run(
    "UPDATE ai_suggestions SET status='REJECTED', review_note='Được thay bằng đề xuất mới hơn', reviewed_at=datetime('now') WHERE entity_type=? AND entity_id=? AND kind=? AND status='PENDING_REVIEW'",
    input.entityType, input.entityId, input.kind,
  );
  return run(
    `INSERT INTO ai_suggestions (run_id, agent, kind, entity_type, entity_id, title, payload_json, evidence_json) VALUES (?,?,?,?,?,?,?,?)`,
    input.runId, input.agent, input.kind, input.entityType, input.entityId, input.title,
    JSON.stringify(input.payload), JSON.stringify(input.evidence),
  ).id;
}

const ENRICHABLE = ["industry", "address", "contact_title", "notes"] as const;
type EnrichmentPayload ={ fields: Partial<Record<"industry" | "address" | "contact_title" | "notes", string>> };
type BantPayload = { scores: Record<BantKey, number>; rationale: string };
type EmailPayload = { to: string; subject: string; body: string };
type DisqualifyPayload = { reason: string };

/**
 * Duyệt một đề xuất. Người duyệt có thể chỉnh nội dung (edits) trước khi áp dụng.
 * Quy tắc: không ghi đè dữ liệu đã nhập tay — làm giàu chỉ điền trường đang trống.
 */
export function approveSuggestion(actor: Actor, id: number, edits: Record<string, string> = {}, note: string | null = null) {
  assert(actor.type === "USER", "Chỉ nhân viên được duyệt đề xuất AI");
  const s = get<Suggestion>(`${SELECT} WHERE s.id = ?`, id);
  assert(s, "Không tìm thấy đề xuất");
  assert(s.status === "PENDING_REVIEW", "Đề xuất đã được xử lý");
  const payload = JSON.parse(s.payload_json);
  let result = "";

  tx(() => {
    switch (s.kind) {
      case "ENRICHMENT": {
        const lead = getLead(s.entity_id);
        assert(lead && lead.status !== "CONVERTED", "Lead không còn mở");
        const fields = (payload as EnrichmentPayload).fields;
        const applied: string[] = [];
        const skipped: string[] = [];
        for (const [k, v] of Object.entries(fields)) {
          if (!ENRICHABLE.includes(k as (typeof ENRICHABLE)[number])) continue; // tên cột chỉ lấy từ whitelist
          const current = lead[k as keyof typeof lead];
          if (current === null || current === "" || current === undefined) {
            run(`UPDATE leads SET ${k} = ?, updated_at = datetime('now') WHERE id = ?`, String(v), lead.id);
            applied.push(k);
          } else skipped.push(k);
        }
        result = `Đã điền ${applied.length} trường${skipped.length ? `, giữ nguyên ${skipped.length} trường đã nhập tay` : ""}`;
        audit(actor, "lead", lead.id, "AI_ENRICHMENT_APPLIED", { details: { applied, skipped, suggestionId: id } });
        break;
      }
      case "BANT_SCORE": {
        const p = payload as BantPayload;
        const scores = Object.fromEntries(
          BANT_KEYS.map((k) => [k, edits[`bant_${k}`] !== undefined ? Number(edits[`bant_${k}`]) : p.scores[k]]),
        ) as Record<BantKey, number>;
        const total = updateBant(actor, s.entity_id, scores, edits.rationale ?? p.rationale);
        result = `Đã cập nhật BANT = ${total}/100`;
        break;
      }
      case "EMAIL_DRAFT": {
        const p = payload as EmailPayload;
        const msg = { to: edits.to ?? p.to, subject: edits.subject ?? p.subject, body: edits.body ?? p.body };
        assert(msg.to && msg.subject && msg.body, "Email thiếu thông tin");
        const { providerRef } = email.send(msg);
        run(
          "INSERT INTO email_messages (entity_type, entity_id, to_email, subject, body, suggestion_id, approved_by, provider_ref) VALUES (?,?,?,?,?,?,?,?)",
          s.entity_type, s.entity_id, msg.to, msg.subject, msg.body, id, actorUserId(actor), providerRef,
        );
        addActivity({ entityType: s.entity_type, entityId: s.entity_id, type: "EMAIL", direction: "OUT", subject: msg.subject, body: msg.body, createdBy: actorUserId(actor) });
        result = `Đã gửi email tới ${msg.to}`;
        break;
      }
      case "DISQUALIFY": {
        disqualifyLead(actor, s.entity_id, edits.reason ?? (payload as DisqualifyPayload).reason);
        result = "Đã loại Lead theo đề xuất";
        break;
      }
      case "CONVERSION": {
        // Đề xuất chuyển đổi chỉ là tín hiệu; việc chuyển đổi thực hiện trên form Lead (chọn Account/Contact/AE).
        result = "Đã ghi nhận — thực hiện chuyển đổi trên trang Lead";
        break;
      }
    }
    run(
      "UPDATE ai_suggestions SET status='APPROVED', reviewed_by=?, reviewed_at=datetime('now'), review_note=? WHERE id=?",
      actorUserId(actor), note ?? (Object.keys(edits).length ? "Đã chỉnh sửa trước khi duyệt" : null), id,
    );
    audit(actor, "ai_suggestion", id, "APPROVE", { from: "PENDING_REVIEW", to: "APPROVED", details: { edits: Object.keys(edits), result } });
  });
  return result;
}

export function rejectSuggestion(actor: Actor, id: number, note: string | null) {
  assert(actor.type === "USER", "Chỉ nhân viên được xử lý đề xuất AI");
  const s = get<{ status: string }>("SELECT status FROM ai_suggestions WHERE id = ?", id);
  assert(s?.status === "PENDING_REVIEW", "Đề xuất đã được xử lý");
  run("UPDATE ai_suggestions SET status='REJECTED', reviewed_by=?, reviewed_at=datetime('now'), review_note=? WHERE id=?", actorUserId(actor), note, id);
  audit(actor, "ai_suggestion", id, "REJECT", { from: "PENDING_REVIEW", to: "REJECTED", reason: note });
}

export function listRuns(filter: { entityType?: string; entityId?: number; limit?: number } = {}) {
  const lim = filter.limit ?? 50;
  const sql = `SELECT r.*, u.name AS triggered_by_name FROM ai_runs r LEFT JOIN users u ON u.id = r.triggered_by`;
  type RunRow = {
    id: number; agent: string; trigger: string; entity_type: string; entity_id: number; model: string; status: string;
    tool_calls_json: string; summary: string | null; stop_reason: string | null; error: string | null;
    triggered_by_name: string | null; started_at: string; finished_at: string | null;
  };
  return filter.entityType && filter.entityId
    ? all<RunRow>(`${sql} WHERE r.entity_type = ? AND r.entity_id = ? ORDER BY r.id DESC LIMIT ?`, filter.entityType, filter.entityId, lim)
    : all<RunRow>(`${sql} ORDER BY r.id DESC LIMIT ?`, lim);
}

export function notifyOwnerOfSuggestions(ownerId: number | null, count: number, link: string) {
  if (count > 0) notify(ownerId, `Agent tạo ${count} đề xuất mới cần kiểm duyệt`, link);
}
