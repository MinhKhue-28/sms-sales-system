// Giai đoạn DEVELOP (và chuyển stage đến PROPOSE/CLOSE, LOST).
import { all, get, run, tx } from "../db";
import { assert, DEVELOP_CHECKLIST, type ChecklistKey } from "../domain";
import { requestApproval } from "./approvals";
import { actorUserId, audit, notify, setting, type Actor } from "./core";

export type Opportunity = {
  id: number;
  code: string;
  name: string;
  account_id: number;
  account_name: string;
  primary_contact_id: number | null;
  contact_name: string | null;
  owner_id: number | null;
  owner_name: string | null;
  presales_id: number | null;
  presales_name: string | null;
  lead_id: number | null;
  stage: "DEVELOP" | "PROPOSE" | "CLOSE" | "WON" | "LOST";
  amount: number;
  close_date: string | null;
  price_list_id: number | null;
  price_list_name: string | null;
  customer_need: string | null;
  need_confirmed: number;
  proposed_solution: string | null;
  solution_confirmed: number;
  stakeholders_confirmed: number;
  competitors_confirmed: number;
  importance: "LOW" | "MEDIUM" | "HIGH" | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

const SELECT = `SELECT o.*, a.name AS account_name, c.full_name AS contact_name, u.name AS owner_name,
  p.name AS presales_name, pl.name AS price_list_name
  FROM opportunities o JOIN accounts a ON a.id = o.account_id
  LEFT JOIN contacts c ON c.id = o.primary_contact_id
  LEFT JOIN users u ON u.id = o.owner_id
  LEFT JOIN users p ON p.id = o.presales_id
  LEFT JOIN price_lists pl ON pl.id = o.price_list_id`;

export function listOpportunities(filter: { stage?: string; ownerId?: number; accountId?: number } = {}) {
  const where: string[] = [];
  const params: (string | number)[] = [];
  if (filter.stage) {
    where.push("o.stage = ?");
    params.push(filter.stage);
  }
  if (filter.ownerId) {
    where.push("o.owner_id = ?");
    params.push(filter.ownerId);
  }
  if (filter.accountId) {
    where.push("o.account_id = ?");
    params.push(filter.accountId);
  }
  return all<Opportunity>(`${SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY o.updated_at DESC`, ...params);
}

export function getOpportunity(id: number) {
  return get<Opportunity>(`${SELECT} WHERE o.id = ?`, id);
}

function mustOpen(id: number) {
  const o = getOpportunity(id);
  assert(o, "Không tìm thấy Opportunity");
  assert(o.stage !== "WON" && o.stage !== "LOST", "Opportunity đã đóng");
  return o;
}

export function stakeholdersOf(id: number) {
  return all<{ id: number; name: string; role: string; notes: string | null; contact_id: number | null }>(
    "SELECT * FROM stakeholders WHERE opportunity_id = ? ORDER BY id",
    id,
  );
}

export function competitorsOf(id: number) {
  return all<{ id: number; competitor_id: number; name: string; notes: string | null; strengths: string | null; weaknesses: string | null }>(
    `SELECT oc.id, oc.competitor_id, c.name, oc.notes, c.strengths, c.weaknesses
     FROM opportunity_competitors oc JOIN competitors c ON c.id = oc.competitor_id WHERE oc.opportunity_id = ?`,
    id,
  );
}

export function risksOf(id: number) {
  return all<{ id: number; description: string; severity: string; status: string; source: string; resolution: string | null; created_at: string }>(
    "SELECT * FROM opportunity_risks WHERE opportunity_id = ? ORDER BY status, id DESC",
    id,
  );
}

export function researchOf(id: number) {
  return all<{
    id: number;
    run_id: number | null;
    importance: string;
    summary: string;
    risks_json: string;
    next_actions_json: string;
    sources_json: string;
    status: string;
    reviewed_by_name: string | null;
    reviewed_at: string | null;
    created_at: string;
  }>(
    `SELECT r.*, u.name AS reviewed_by_name FROM opportunity_research r LEFT JOIN users u ON u.id = r.reviewed_by
     WHERE r.opportunity_id = ? ORDER BY r.id DESC`,
    id,
  );
}

export function updateOpportunity(
  actor: Actor,
  id: number,
  input: { name?: string; amount?: number; close_date?: string | null; customer_need?: string | null; price_list_id?: number | null; primary_contact_id?: number | null; presales_id?: number | null },
) {
  // Trường trọng yếu (revenue, close date, stage, price list) chỉ do con người cập nhật.
  assert(actor.type === "USER", "Chỉ nhân viên được cập nhật hồ sơ Opportunity");
  const o = mustOpen(id);
  const keys = Object.keys(input).filter((k) => input[k as keyof typeof input] !== undefined) as (keyof typeof input)[];
  if (!keys.length) return;
  if (input.amount !== undefined) assert(input.amount >= 0, "Giá trị dự kiến không hợp lệ");
  if (input.price_list_id !== undefined && input.price_list_id !== o.price_list_id) {
    assert(o.stage === "DEVELOP", "Chỉ đổi bảng giá ở giai đoạn Develop");
  }
  tx(() => {
    run(
      `UPDATE opportunities SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      ...keys.map((k) => (input[k] ?? null) as string | number | null),
      id,
    );
    // Nhu cầu thay đổi thì phải xác nhận lại.
    if (input.customer_need !== undefined && input.customer_need !== o.customer_need) {
      run("UPDATE opportunities SET need_confirmed = 0 WHERE id = ?", id);
    }
    audit(actor, "opportunity", id, "UPDATE", { details: input });
  });
}

export function setProposedSolution(actor: Actor, id: number, solution: string) {
  assert(actor.type === "USER" && (actor.role === "PRESALES" || actor.role === "SALES_MANAGER"), "Presales quyết định giải pháp");
  const o = mustOpen(id);
  tx(() => {
    run(
      "UPDATE opportunities SET proposed_solution = ?, solution_confirmed = 0, presales_id = COALESCE(presales_id, ?), updated_at = datetime('now') WHERE id = ?",
      solution.trim() || null,
      actor.id,
      id,
    );
    audit(actor, "opportunity", id, "SOLUTION_UPDATE");
    notify(o.owner_id, `Presales đã cập nhật Proposed Solution cho ${o.code}`, `/opportunities/${id}`);
  });
}

export function setChecklist(actor: Actor, id: number, key: ChecklistKey, value: boolean) {
  assert(actor.type === "USER", "Agent không được tự hoàn thành checklist");
  assert(DEVELOP_CHECKLIST.some((c) => c.key === key), "Mục checklist không hợp lệ");
  const o = mustOpen(id);
  assert(o.stage === "DEVELOP", "Checklist chỉ cập nhật ở giai đoạn Develop");
  if (value) {
    if (key === "need_confirmed") assert(o.customer_need?.trim(), "Cần nhập Customer Need trước");
    if (key === "solution_confirmed") {
      assert(actor.role === "PRESALES" || actor.role === "SALES_MANAGER", "Chỉ Presales xác nhận giải pháp");
      assert(o.proposed_solution?.trim(), "Chưa có Proposed Solution");
    }
    if (key === "stakeholders_confirmed") {
      assert(stakeholdersOf(id).some((s) => s.role === "DECISION_MAKER"), "Cần ít nhất một stakeholder là Người quyết định");
    }
    if (key === "competitors_confirmed") assert(competitorsOf(id).length > 0, "Cần ghi nhận ít nhất một đối thủ");
  }
  tx(() => {
    run(`UPDATE opportunities SET ${key} = ?, updated_at = datetime('now') WHERE id = ?`, value ? 1 : 0, id);
    audit(actor, "opportunity", id, value ? "CHECKLIST_DONE" : "CHECKLIST_UNDO", { details: { key } });
  });
}

export function addStakeholder(actor: Actor, id: number, input: { name: string; role: string; notes?: string | null; contact_id?: number | null }) {
  mustOpen(id);
  assert(input.name?.trim(), "Thiếu tên stakeholder");
  run(
    "INSERT INTO stakeholders (opportunity_id, contact_id, name, role, notes) VALUES (?,?,?,?,?)",
    id, input.contact_id ?? null, input.name.trim(), input.role, input.notes ?? null,
  );
  audit(actor, "opportunity", id, "STAKEHOLDER_ADD", { details: input });
}

export function removeStakeholder(actor: Actor, id: number, stakeholderId: number) {
  mustOpen(id);
  run("DELETE FROM stakeholders WHERE id = ? AND opportunity_id = ?", stakeholderId, id);
  if (!stakeholdersOf(id).some((s) => s.role === "DECISION_MAKER")) {
    run("UPDATE opportunities SET stakeholders_confirmed = 0 WHERE id = ?", id);
  }
  audit(actor, "opportunity", id, "STAKEHOLDER_REMOVE", { details: { stakeholderId } });
}

export function addCompetitor(actor: Actor, id: number, competitorId: number, notes: string | null) {
  mustOpen(id);
  assert(get("SELECT id FROM competitors WHERE id = ?", competitorId), "Đối thủ không tồn tại");
  run("INSERT OR IGNORE INTO opportunity_competitors (opportunity_id, competitor_id, notes) VALUES (?,?,?)", id, competitorId, notes);
  audit(actor, "opportunity", id, "COMPETITOR_ADD", { details: { competitorId } });
}

export function removeCompetitor(actor: Actor, id: number, linkId: number) {
  mustOpen(id);
  run("DELETE FROM opportunity_competitors WHERE id = ? AND opportunity_id = ?", linkId, id);
  if (!competitorsOf(id).length) run("UPDATE opportunities SET competitors_confirmed = 0 WHERE id = ?", id);
  audit(actor, "opportunity", id, "COMPETITOR_REMOVE", { details: { linkId } });
}

export function addRisk(actor: Actor, id: number, description: string, severity: string, source: "USER" | "AI" = "USER") {
  mustOpen(id);
  assert(description?.trim(), "Thiếu mô tả rủi ro");
  run(
    "INSERT INTO opportunity_risks (opportunity_id, description, severity, source, created_by) VALUES (?,?,?,?,?)",
    id, description.trim(), severity, source, actorUserId(actor),
  );
  audit(actor, "opportunity", id, "RISK_ADD", { details: { description, severity } });
}

export function resolveRisk(actor: Actor, id: number, riskId: number, resolution: string) {
  assert(resolution?.trim(), "Cần ghi cách xử lý rủi ro");
  run(
    "UPDATE opportunity_risks SET status='RESOLVED', resolution=?, resolved_by=?, resolved_at=datetime('now') WHERE id=? AND opportunity_id=?",
    resolution.trim(), actorUserId(actor), riskId, id,
  );
  audit(actor, "opportunity", id, "RISK_RESOLVE", { details: { riskId, resolution } });
}

export function checklistStatus(o: Opportunity) {
  return DEVELOP_CHECKLIST.map((c) => ({ ...c, done: Boolean(o[c.key]) }));
}

/** ADR-05 (tạm theo đề xuất brief): gate có điều kiện trước khi rời Develop. */
export function managerGate(o: Opportunity): { required: boolean; reasons: string[] } {
  const mode = setting("manager_gate_mode");
  if (mode === "NEVER") return { required: false, reasons: [] };
  if (mode === "ALWAYS") return { required: true, reasons: ["Chính sách: mọi Opportunity cần Manager rà soát"] };
  const reasons: string[] = [];
  if (o.importance === "HIGH") reasons.push("Mức quan trọng Cao");
  const open = risksOf(o.id).filter((r) => r.status === "OPEN").length;
  if (open) reasons.push(`${open} rủi ro chưa xử lý`);
  return { required: reasons.length > 0, reasons };
}

function latestGateApproval(id: number) {
  return get<{ id: number; status: string; created_at: string }>(
    "SELECT id, status, created_at FROM approvals WHERE kind='OPP_STAGE_GATE' AND entity_id = ? ORDER BY id DESC LIMIT 1",
    id,
  );
}

export function gateState(o: Opportunity) {
  const gate = managerGate(o);
  const approval = latestGateApproval(o.id);
  return { ...gate, approval: approval ?? null };
}

/** Thực hiện chuyển stage (dùng chung cho AE và khi Manager duyệt gate). */
export function moveStage(actor: Actor, id: number, to: Opportunity["stage"], reason?: string) {
  const o = getOpportunity(id);
  assert(o, "Không tìm thấy Opportunity");
  tx(() => {
    run(
      `UPDATE opportunities SET stage = ?, updated_at = datetime('now'), closed_at = CASE WHEN ? IN ('WON','LOST') THEN datetime('now') ELSE closed_at END WHERE id = ?`,
      to, to, id,
    );
    audit(actor, "opportunity", id, "STAGE_CHANGE", { from: o.stage, to, reason });
  });
}

export function advanceStage(actor: Actor, id: number): { moved: boolean; message: string } {
  assert(actor.type === "USER", "Agent không được tự chuyển stage");
  const o = mustOpen(id);
  if (o.stage === "DEVELOP") {
    const missing = checklistStatus(o).filter((c) => !c.done);
    assert(!missing.length, `Chưa hoàn tất checklist: ${missing.map((m) => m.label).join("; ")}`);
    assert(o.price_list_id, "Chưa chọn bảng giá");
    const gate = gateState(o);
    if (gate.required && gate.approval?.status !== "APPROVED") {
      if (gate.approval?.status === "PENDING") return { moved: false, message: "Đang chờ Sales Manager rà soát" };
      requestApproval(actor, {
        kind: "OPP_STAGE_GATE",
        entityType: "opportunity",
        entityId: id,
        reason: gate.reasons.join("; "),
      });
      return { moved: false, message: `Cần Sales Manager rà soát (${gate.reasons.join("; ")}). Đã gửi yêu cầu.` };
    }
    moveStage(actor, id, "PROPOSE");
    return { moved: true, message: "Đã chuyển sang Propose" };
  }
  if (o.stage === "PROPOSE") {
    assert(get("SELECT id FROM quotes WHERE opportunity_id = ? AND status = 'ACCEPTED'", id), "Cần báo giá được khách chấp thuận");
    moveStage(actor, id, "CLOSE");
    return { moved: true, message: "Đã chuyển sang Close" };
  }
  throw new Error("Ở giai đoạn Close, tạo Order để ghi nhận Won");
}

export function markLost(actor: Actor, id: number, reason: string) {
  assert(actor.type === "USER", "Agent không được đóng Opportunity");
  assert(reason?.trim(), "Phải nhập lý do Lost");
  mustOpen(id);
  tx(() => {
    run("UPDATE opportunities SET lost_reason = ? WHERE id = ?", reason.trim(), id);
    moveStage(actor, id, "LOST", reason);
    run("UPDATE quotes SET status='SUPERSEDED', updated_at=datetime('now') WHERE opportunity_id=? AND status IN ('DRAFT','PENDING_APPROVAL','APPROVED','SENT')", id);
  });
}

/** AE xác minh nghiên cứu của Agent rồi mới cập nhật hồ sơ (importance, rủi ro). */
export function verifyResearch(actor: Actor, researchId: number, opts: { applyImportance: boolean; riskIndexes: number[] }) {
  assert(actor.type === "USER", "Chỉ nhân viên xác minh nghiên cứu");
  const r = get<{ id: number; opportunity_id: number; importance: string; risks_json: string; status: string }>(
    "SELECT * FROM opportunity_research WHERE id = ?",
    researchId,
  );
  assert(r, "Không tìm thấy nghiên cứu");
  assert(r.status === "PENDING_REVIEW", "Nghiên cứu đã được xử lý");
  const o = mustOpen(r.opportunity_id);
  const risks = JSON.parse(r.risks_json) as { description: string; severity: string }[];
  tx(() => {
    run("UPDATE opportunity_research SET status='VERIFIED', reviewed_by=?, reviewed_at=datetime('now') WHERE id=?", actorUserId(actor), researchId);
    if (opts.applyImportance) {
      run("UPDATE opportunities SET importance = ?, updated_at = datetime('now') WHERE id = ?", r.importance, o.id);
    }
    for (const i of opts.riskIndexes) {
      const risk = risks[i];
      if (risk) addRisk(actor, o.id, risk.description, risk.severity ?? "MEDIUM", "AI");
    }
    audit(actor, "opportunity_research", researchId, "VERIFY", {
      from: "PENDING_REVIEW",
      to: "VERIFIED",
      details: { applyImportance: opts.applyImportance, risks: opts.riskIndexes.length },
    });
  });
}

export function dismissResearch(actor: Actor, researchId: number) {
  run("UPDATE opportunity_research SET status='DISMISSED', reviewed_by=?, reviewed_at=datetime('now') WHERE id=? AND status='PENDING_REVIEW'", actorUserId(actor), researchId);
  audit(actor, "opportunity_research", researchId, "DISMISS", { from: "PENDING_REVIEW", to: "DISMISSED" });
}
