// Giai đoạn PROPOSE: báo giá, kiểm tra chiết khấu, phê duyệt khi vượt thẩm quyền, thương lượng, khách phản hồi.
import { all, get, nextCode, run, tx } from "../db";
import { assert, lineTotal } from "../domain";
import { email } from "../integrations";
import { requestApproval } from "./approvals";
import { actorUserId, addActivity, audit, notify, settingNumber, type Actor } from "./core";
import { getOpportunity, moveStage } from "./opportunities";

export type Quote = {
  id: number;
  code: string;
  opportunity_id: number;
  revision: number;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";
  price_list_id: number;
  currency: string;
  subtotal: number;
  discount_total: number;
  total: number;
  max_discount_pct: number;
  valid_until: string | null;
  notes: string | null;
  customer_response_note: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  sent_at: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteLine = {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  product_type: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  line_total: number;
};

export function quotesOf(oppId: number) {
  return all<Quote>(
    `SELECT q.*, u.name AS approved_by_name FROM quotes q LEFT JOIN users u ON u.id = q.approved_by
     WHERE q.opportunity_id = ? ORDER BY q.revision DESC, q.id DESC`,
    oppId,
  );
}

export function getQuote(id: number) {
  return get<Quote>("SELECT q.*, u.name AS approved_by_name FROM quotes q LEFT JOIN users u ON u.id = q.approved_by WHERE q.id = ?", id);
}

export function quoteLines(quoteId: number) {
  return all<QuoteLine>(
    `SELECT ql.*, p.code AS product_code, p.name AS product_name, p.type AS product_type, p.unit
     FROM quote_lines ql JOIN products p ON p.id = ql.product_id WHERE ql.quote_id = ? ORDER BY ql.id`,
    quoteId,
  );
}

function mustDraft(id: number) {
  const q = getQuote(id);
  assert(q, "Không tìm thấy báo giá");
  assert(q.status === "DRAFT", "Chỉ sửa được báo giá ở trạng thái Nháp");
  return q;
}

function recompute(quoteId: number) {
  const lines = quoteLines(quoteId);
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const total = lines.reduce((s, l) => s + l.line_total, 0);
  const maxDiscount = lines.reduce((m, l) => Math.max(m, l.discount_pct), 0);
  run(
    "UPDATE quotes SET subtotal=?, discount_total=?, total=?, max_discount_pct=?, updated_at=datetime('now') WHERE id=?",
    subtotal, subtotal - total, total, maxDiscount, quoteId,
  );
}

export function createQuote(actor: Actor, oppId: number) {
  const o = getOpportunity(oppId);
  assert(o, "Không tìm thấy Opportunity");
  assert(o.stage === "PROPOSE", "Chỉ lập báo giá ở giai đoạn Propose");
  assert(o.price_list_id, "Opportunity chưa chọn bảng giá");
  const active = get("SELECT id FROM quotes WHERE opportunity_id = ? AND status NOT IN ('SUPERSEDED','REJECTED')", oppId);
  assert(!active, "Đã có báo giá đang hiệu lực — hãy tạo phiên bản mới từ báo giá đó");
  return tx(() => {
    const validUntil = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const { id } = run(
      "INSERT INTO quotes (code, opportunity_id, revision, price_list_id, valid_until, created_by) VALUES (?,?,1,?,?,?)",
      nextCode("quotes", "Q"), oppId, o.price_list_id, validUntil, actorUserId(actor),
    );
    audit(actor, "quote", id, "CREATE", { to: "DRAFT" });
    return id;
  });
}

export function addLine(actor: Actor, quoteId: number, productId: number, quantity: number, discountPct: number) {
  const q = mustDraft(quoteId);
  assert(Number.isInteger(quantity) && quantity > 0, "Số lượng phải là số nguyên dương");
  assert(discountPct >= 0 && discountPct <= 100, "Chiết khấu 0–100%");
  // Giá lấy từ bảng giá; Sales chỉ nhập chiết khấu — không sửa đơn giá.
  const price = get<{ unit_price: number }>(
    "SELECT unit_price FROM price_list_items WHERE price_list_id = ? AND product_id = ?",
    q.price_list_id, productId,
  );
  assert(price, "Sản phẩm không có trong bảng giá của báo giá");
  tx(() => {
    run(
      "INSERT INTO quote_lines (quote_id, product_id, quantity, unit_price, discount_pct, line_total) VALUES (?,?,?,?,?,?)",
      quoteId, productId, quantity, price.unit_price, discountPct, lineTotal(quantity, price.unit_price, discountPct),
    );
    recompute(quoteId);
    audit(actor, "quote", quoteId, "LINE_ADD", { details: { productId, quantity, discountPct } });
  });
}

export function updateLine(actor: Actor, quoteId: number, lineId: number, quantity: number, discountPct: number) {
  mustDraft(quoteId);
  assert(Number.isInteger(quantity) && quantity > 0, "Số lượng phải là số nguyên dương");
  assert(discountPct >= 0 && discountPct <= 100, "Chiết khấu 0–100%");
  const line = get<{ unit_price: number }>("SELECT unit_price FROM quote_lines WHERE id = ? AND quote_id = ?", lineId, quoteId);
  assert(line, "Không tìm thấy dòng báo giá");
  tx(() => {
    run(
      "UPDATE quote_lines SET quantity=?, discount_pct=?, line_total=? WHERE id=?",
      quantity, discountPct, lineTotal(quantity, line.unit_price, discountPct), lineId,
    );
    recompute(quoteId);
    audit(actor, "quote", quoteId, "LINE_UPDATE", { details: { lineId, quantity, discountPct } });
  });
}

export function removeLine(actor: Actor, quoteId: number, lineId: number) {
  mustDraft(quoteId);
  tx(() => {
    run("DELETE FROM quote_lines WHERE id = ? AND quote_id = ?", lineId, quoteId);
    recompute(quoteId);
    audit(actor, "quote", quoteId, "LINE_REMOVE", { details: { lineId } });
  });
}

export function updateQuoteNotes(actor: Actor, quoteId: number, notes: string | null, validUntil: string | null) {
  mustDraft(quoteId);
  run("UPDATE quotes SET notes=?, valid_until=?, updated_at=datetime('now') WHERE id=?", notes, validUntil, quoteId);
  audit(actor, "quote", quoteId, "UPDATE");
}

/** Gửi duyệt: chiết khấu vượt thẩm quyền → Sales Manager duyệt; trong thẩm quyền → tự duyệt. */
export function submitQuote(actor: Actor, id: number) {
  const q = mustDraft(id);
  assert(quoteLines(id).length > 0, "Báo giá chưa có dòng sản phẩm");
  const threshold = settingNumber("discount_threshold_pct");
  return tx(() => {
    if (q.max_discount_pct > threshold) {
      run("UPDATE quotes SET status='PENDING_APPROVAL', updated_at=datetime('now') WHERE id=?", id);
      audit(actor, "quote", id, "SUBMIT", { from: "DRAFT", to: "PENDING_APPROVAL" });
      requestApproval(actor, {
        kind: "QUOTE_DISCOUNT",
        entityType: "quote",
        entityId: id,
        reason: `Chiết khấu tối đa ${q.max_discount_pct}% vượt thẩm quyền ${threshold}%`,
      });
      return "Chiết khấu vượt thẩm quyền — đã gửi Sales Manager duyệt";
    }
    run("UPDATE quotes SET status='APPROVED', approved_at=datetime('now'), updated_at=datetime('now') WHERE id=?", id);
    audit(actor, "quote", id, "SUBMIT", { from: "DRAFT", to: "APPROVED", reason: `Chiết khấu trong thẩm quyền (≤ ${threshold}%)` });
    return "Báo giá đã được duyệt (trong thẩm quyền)";
  });
}

/** Gọi từ approvals khi Sales Manager quyết định. */
export function applyDiscountDecision(actor: Actor, id: number, approved: boolean, comment: string | null) {
  const q = getQuote(id);
  assert(q && q.status === "PENDING_APPROVAL", "Báo giá không ở trạng thái chờ duyệt");
  const to = approved ? "APPROVED" : "DRAFT";
  run(
    `UPDATE quotes SET status=?, approved_by=?, approved_at=CASE WHEN ?='APPROVED' THEN datetime('now') ELSE NULL END, updated_at=datetime('now') WHERE id=?`,
    to, approved ? actorUserId(actor) : null, to, id,
  );
  audit(actor, "quote", id, approved ? "APPROVE" : "REJECT_APPROVAL", { from: "PENDING_APPROVAL", to, reason: comment });
}

export function sendQuote(actor: Actor, id: number) {
  assert(actor.type === "USER", "Chỉ nhân viên được gửi báo giá cho khách");
  const q = getQuote(id);
  assert(q, "Không tìm thấy báo giá");
  assert(q.status === "APPROVED", "Báo giá phải được duyệt trước khi gửi");
  const o = getOpportunity(q.opportunity_id)!;
  const contact = get<{ email: string | null; full_name: string }>("SELECT email, full_name FROM contacts WHERE id = ?", o.primary_contact_id ?? 0);
  assert(contact?.email, "Liên hệ chính chưa có email");
  tx(() => {
    const subject = `Báo giá ${q.code} (phiên bản ${q.revision}) – ${o.account_name}`;
    const body = `Kính gửi ${contact.full_name},\n\nChúng tôi gửi báo giá ${q.code} v${q.revision}, tổng giá trị ${q.total.toLocaleString("vi-VN")} ${q.currency}, hiệu lực đến ${q.valid_until ?? "—"}.\n\nTrân trọng.`;
    const { providerRef } = email.send({ to: contact.email!, subject, body });
    run(
      "INSERT INTO email_messages (entity_type, entity_id, to_email, subject, body, approved_by, provider_ref) VALUES ('quote',?,?,?,?,?,?)",
      id, contact.email!, subject, body, actorUserId(actor), providerRef,
    );
    addActivity({ entityType: "opportunity", entityId: o.id, type: "EMAIL", direction: "OUT", subject, body, createdBy: actorUserId(actor) });
    run("UPDATE quotes SET status='SENT', sent_at=datetime('now'), updated_at=datetime('now') WHERE id=?", id);
    audit(actor, "quote", id, "SEND", { from: "APPROVED", to: "SENT", details: { to: contact.email } });
  });
}

export function recordCustomerResponse(actor: Actor, id: number, accepted: boolean, note: string | null) {
  assert(actor.type === "USER", "Chỉ nhân viên ghi nhận phản hồi của khách");
  const q = getQuote(id);
  assert(q, "Không tìm thấy báo giá");
  assert(q.status === "SENT", "Báo giá chưa gửi khách");
  const to = accepted ? "ACCEPTED" : "REJECTED";
  tx(() => {
    run("UPDATE quotes SET status=?, customer_response_note=?, responded_at=datetime('now'), updated_at=datetime('now') WHERE id=?", to, note, id);
    audit(actor, "quote", id, "CUSTOMER_RESPONSE", { from: "SENT", to, reason: note });
    if (accepted) {
      const o = getOpportunity(q.opportunity_id)!;
      if (o.stage === "PROPOSE") moveStage(actor, o.id, "CLOSE", `Khách chấp thuận báo giá ${q.code} v${q.revision}`);
    }
  });
}

/** Thương lượng/chỉnh sửa: tạo phiên bản mới (revision là thuộc tính của Quote — ADR-09 không thêm entity QuoteVersion). */
export function reviseQuote(actor: Actor, id: number) {
  const q = getQuote(id);
  assert(q, "Không tìm thấy báo giá");
  assert(["PENDING_APPROVAL", "APPROVED", "SENT", "REJECTED"].includes(q.status), "Không tạo phiên bản mới từ trạng thái này");
  const o = getOpportunity(q.opportunity_id)!;
  assert(o.stage === "PROPOSE", "Opportunity không còn ở giai đoạn Propose");
  return tx(() => {
    run("UPDATE quotes SET status='SUPERSEDED', updated_at=datetime('now') WHERE id=?", id);
    run("UPDATE approvals SET status='REJECTED', decision_comment='Báo giá đã được thay bằng phiên bản mới', decided_at=datetime('now') WHERE kind='QUOTE_DISCOUNT' AND entity_id=? AND status='PENDING'", id);
    const newId = run(
      "INSERT INTO quotes (code, opportunity_id, revision, price_list_id, valid_until, notes, created_by) VALUES (?,?,?,?,?,?,?)",
      q.code, q.opportunity_id, q.revision + 1, q.price_list_id, q.valid_until, q.notes, actorUserId(actor),
    ).id;
    // Giữ nguyên đơn giá đã báo ở phiên bản trước để thương lượng nhất quán.
    for (const l of quoteLines(id)) {
      run(
        "INSERT INTO quote_lines (quote_id, product_id, quantity, unit_price, discount_pct, line_total) VALUES (?,?,?,?,?,?)",
        newId, l.product_id, l.quantity, l.unit_price, l.discount_pct, l.line_total,
      );
    }
    recompute(newId);
    audit(actor, "quote", id, "SUPERSEDE", { from: q.status, to: "SUPERSEDED", details: { newQuoteId: newId } });
    audit(actor, "quote", newId, "CREATE", { to: "DRAFT", reason: `Phiên bản ${q.revision + 1} của ${q.code}` });
    return newId;
  });
}

export function requestLegalReview(actor: Actor, id: number, note: string) {
  const q = getQuote(id);
  assert(q, "Không tìm thấy báo giá");
  assert(note?.trim(), "Mô tả điều khoản cần rà soát");
  requestApproval(actor, { kind: "LEGAL_REVIEW", entityType: "quote", entityId: id, reason: note.trim() });
  notify(getOpportunity(q.opportunity_id)?.owner_id, `Đã gửi Legal rà soát ${q.code}`, `/quotes/${id}`);
}
