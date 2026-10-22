// CLOSE (tạo Order, khóa giá, ghi Won) và FULFILL (Delivery, Invoice, Payment).
// Lưu ý brief ADR-08: Closed-Won (Opportunity), Order Active/Fulfilled, Invoice Paid là các trạng thái KHÁC NHAU.
import { all, get, nextCode, run, tx } from "../db";
import { assert } from "../domain";
import { erp, provisioning } from "../integrations";
import { actorUserId, audit, notify, notifyRole, settingBool, type Actor } from "./core";
import { getOpportunity, moveStage } from "./opportunities";
import { getQuote, quoteLines } from "./quotes";

export type Order = {
  id: number;
  code: string;
  quote_id: number | null;
  quote_code: string | null;
  quote_revision: number | null;
  opportunity_id: number;
  opportunity_code: string;
  account_id: number;
  account_name: string;
  status: "ACTIVE" | "IN_FULFILLMENT" | "FULFILLED" | "CANCELLED";
  total: number;
  currency: string;
  price_locked_at: string;
  created_by_name: string | null;
  created_at: string;
  fulfilled_at: string | null;
  invoiced: number;
  paid: number;
};

const SELECT = `SELECT o.*, q.code AS quote_code, q.revision AS quote_revision, op.code AS opportunity_code, a.name AS account_name,
  u.name AS created_by_name,
  COALESCE((SELECT SUM(amount) FROM invoices i WHERE i.order_id = o.id AND i.status != 'CANCELLED'), 0) AS invoiced,
  COALESCE((SELECT SUM(paid_amount) FROM invoices i WHERE i.order_id = o.id AND i.status != 'CANCELLED'), 0) AS paid
  FROM orders o JOIN opportunities op ON op.id = o.opportunity_id JOIN accounts a ON a.id = o.account_id
  LEFT JOIN quotes q ON q.id = o.quote_id LEFT JOIN users u ON u.id = o.created_by`;

export function listOrders(filter: { status?: string } = {}) {
  return filter.status
    ? all<Order>(`${SELECT} WHERE o.status = ? ORDER BY o.id DESC`, filter.status)
    : all<Order>(`${SELECT} ORDER BY o.id DESC`);
}

export function getOrder(id: number) {
  return get<Order>(`${SELECT} WHERE o.id = ?`, id);
}

export function orderLines(orderId: number) {
  return all<{ id: number; product_name: string; product_code: string; unit: string; quantity: number; unit_price: number; discount_pct: number; line_total: number }>(
    `SELECT ol.*, p.name AS product_name, p.code AS product_code, p.unit FROM order_lines ol JOIN products p ON p.id = ol.product_id WHERE ol.order_id = ?`,
    orderId,
  );
}

export function fulfillmentTasks(orderId: number) {
  return all<{ id: number; type: string; description: string; status: string; assignee_name: string | null; note: string | null; updated_at: string }>(
    `SELECT t.*, u.name AS assignee_name FROM fulfillment_tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE t.order_id = ? ORDER BY t.id`,
    orderId,
  );
}

/**
 * ADR-07 (tạm): Order chỉ tạo từ Quote đã được khách chấp thuận; chưa yêu cầu Contract ký;
 * nhánh tạo trực tiếp bị tắt (allow_direct_order=false). Giá được khóa tại thời điểm tạo Order.
 * ADR-08 (tạm): trigger Delivery = Order được tạo.
 */
export function createOrderFromQuote(actor: Actor, quoteId: number) {
  assert(actor.type === "USER", "Chỉ nhân viên được tạo Order");
  const q = getQuote(quoteId);
  assert(q, "Không tìm thấy báo giá");
  assert(q.status === "ACCEPTED", "Chỉ tạo Order từ báo giá được khách chấp thuận");
  assert(!get("SELECT id FROM orders WHERE quote_id = ?", quoteId), "Báo giá này đã có Order");
  const o = getOpportunity(q.opportunity_id)!;
  assert(o.stage === "CLOSE" || o.stage === "PROPOSE", "Opportunity không ở giai đoạn có thể chốt");
  const lines = quoteLines(quoteId);
  const delivery = get<{ id: number }>("SELECT id FROM users WHERE role = 'DELIVERY' AND active = 1 ORDER BY id LIMIT 1");

  return tx(() => {
    const code = nextCode("orders", "SO");
    const orderId = run(
      `INSERT INTO orders (code, quote_id, opportunity_id, account_id, total, currency, price_locked_at, created_by)
       VALUES (?,?,?,?,?,?, datetime('now'), ?)`,
      code, quoteId, o.id, o.account_id, q.total, q.currency, actorUserId(actor),
    ).id;
    for (const l of lines) {
      const lineId = run(
        "INSERT INTO order_lines (order_id, product_id, quantity, unit_price, discount_pct, line_total) VALUES (?,?,?,?,?,?)",
        orderId, l.product_id, l.quantity, l.unit_price, l.discount_pct, l.line_total,
      ).id;
      const type = l.product_type === "SUBSCRIPTION" ? "LICENSE" : l.product_type === "TRAINING" ? "TRAINING" : "DEPLOYMENT";
      run(
        "INSERT INTO fulfillment_tasks (order_id, order_line_id, type, description, assignee_id) VALUES (?,?,?,?,?)",
        orderId, lineId, type, `${l.product_name} × ${l.quantity} ${l.unit}`, delivery?.id ?? null,
      );
    }
    const { ticket } = provisioning.requestFulfillment({
      code,
      lines: lines.map((l) => ({ product: l.product_code, quantity: l.quantity })),
    });
    if (o.stage === "PROPOSE") moveStage(actor, o.id, "CLOSE", "Khách chấp thuận báo giá");
    moveStage(actor, o.id, "WON", `Tạo Order ${code}`);
    run("UPDATE opportunities SET amount = ? WHERE id = ?", q.total, o.id);
    audit(actor, "order", orderId, "CREATE", { to: "ACTIVE", details: { quoteId, provisioningTicket: ticket, priceLocked: true } });
    notifyRole("DELIVERY", `Order mới ${code} (${o.account_name}) cần triển khai`, `/orders/${orderId}`);
    notifyRole("FINANCE", `Order mới ${code} – ${q.total.toLocaleString("vi-VN")} ${q.currency}`, `/orders/${orderId}`);
    return orderId;
  });
}

export function directOrderAllowed() {
  return settingBool("allow_direct_order");
}

export function updateFulfillmentTask(actor: Actor, orderId: number, taskId: number, status: "PENDING" | "IN_PROGRESS" | "DONE", note: string | null) {
  const order = getOrder(orderId);
  assert(order, "Không tìm thấy Order");
  assert(order.status !== "CANCELLED" && order.status !== "FULFILLED", "Order đã kết thúc");
  const t = get<{ id: number; status: string }>("SELECT id, status FROM fulfillment_tasks WHERE id = ? AND order_id = ?", taskId, orderId);
  assert(t, "Không tìm thấy công việc");
  tx(() => {
    run("UPDATE fulfillment_tasks SET status=?, note=COALESCE(?, note), updated_at=datetime('now') WHERE id=?", status, note, taskId);
    audit(actor, "fulfillment_task", taskId, "STATUS", { from: t.status, to: status, reason: note });
    const tasks = fulfillmentTasks(orderId);
    const allDone = tasks.every((x) => x.status === "DONE");
    const anyStarted = tasks.some((x) => x.status !== "PENDING");
    const next = allDone ? "FULFILLED" : anyStarted ? "IN_FULFILLMENT" : "ACTIVE";
    if (next !== order.status) {
      run("UPDATE orders SET status=?, fulfilled_at = CASE WHEN ?='FULFILLED' THEN datetime('now') ELSE NULL END WHERE id=?", next, next, orderId);
      audit(actor, "order", orderId, "STATUS", { from: order.status, to: next });
      const opp = getOpportunity(order.opportunity_id);
      if (next === "FULFILLED") notify(opp?.owner_id, `Order ${order.code} đã hoàn tất bàn giao`, `/orders/${orderId}`);
    }
  });
}

// ===== Invoice & Payment =====
export type Invoice = {
  id: number;
  code: string;
  order_id: number;
  order_code: string;
  account_name: string;
  milestone: string;
  amount: number;
  due_date: string | null;
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "CANCELLED";
  paid_amount: number;
  erp_ref: string | null;
  issued_at: string | null;
  created_at: string;
};

const INV_SELECT = `SELECT i.*, o.code AS order_code, a.name AS account_name FROM invoices i
  JOIN orders o ON o.id = i.order_id JOIN accounts a ON a.id = o.account_id`;

export function listInvoices(filter: { status?: string; orderId?: number } = {}) {
  if (filter.orderId) return all<Invoice>(`${INV_SELECT} WHERE i.order_id = ? ORDER BY i.id`, filter.orderId);
  if (filter.status) return all<Invoice>(`${INV_SELECT} WHERE i.status = ? ORDER BY i.id DESC`, filter.status);
  return all<Invoice>(`${INV_SELECT} ORDER BY i.id DESC`);
}

export function getInvoice(id: number) {
  return get<Invoice>(`${INV_SELECT} WHERE i.id = ?`, id);
}

export function paymentsOf(invoiceId: number) {
  return all<{ id: number; amount: number; paid_at: string; method: string | null; reference: string | null; source: string }>(
    "SELECT * FROM payments WHERE invoice_id = ? ORDER BY paid_at",
    invoiceId,
  );
}

/** Sales lập hóa đơn nháp theo mốc thanh toán; Finance phát hành chính thức (ADR-08 tạm). */
export function createInvoice(actor: Actor, orderId: number, input: { milestone: string; amount: number; dueDate: string | null }) {
  const order = getOrder(orderId);
  assert(order, "Không tìm thấy Order");
  assert(order.status !== "CANCELLED", "Order đã hủy");
  assert(input.milestone?.trim(), "Thiếu tên mốc thanh toán");
  assert(Number.isInteger(input.amount) && input.amount > 0, "Số tiền không hợp lệ");
  assert(order.invoiced + input.amount <= order.total, `Vượt giá trị Order (còn có thể lập ${(order.total - order.invoiced).toLocaleString("vi-VN")})`);
  return tx(() => {
    const id = run(
      "INSERT INTO invoices (code, order_id, milestone, amount, due_date, created_by) VALUES (?,?,?,?,?,?)",
      nextCode("invoices", "INV"), orderId, input.milestone.trim(), input.amount, input.dueDate, actorUserId(actor),
    ).id;
    audit(actor, "invoice", id, "CREATE", { to: "DRAFT", details: input });
    notifyRole("FINANCE", `Hóa đơn nháp mới cho ${order.code} cần phát hành`, "/invoices");
    return id;
  });
}

export function issueInvoice(actor: Actor, id: number) {
  const inv = getInvoice(id);
  assert(inv, "Không tìm thấy hóa đơn");
  assert(inv.status === "DRAFT", "Chỉ phát hành hóa đơn nháp");
  tx(() => {
    const { erpRef } = erp.pushInvoice({ code: inv.code, amount: inv.amount, orderCode: inv.order_code });
    run("UPDATE invoices SET status='ISSUED', erp_ref=?, issued_by=?, issued_at=datetime('now') WHERE id=?", erpRef, actorUserId(actor), id);
    audit(actor, "invoice", id, "ISSUE", { from: "DRAFT", to: "ISSUED", details: { erpRef } });
  });
}

export function cancelInvoice(actor: Actor, id: number, reason: string) {
  const inv = getInvoice(id);
  assert(inv, "Không tìm thấy hóa đơn");
  assert(inv.paid_amount === 0, "Hóa đơn đã có thanh toán, không hủy được");
  assert(reason?.trim(), "Cần lý do hủy");
  run("UPDATE invoices SET status='CANCELLED' WHERE id=?", id);
  audit(actor, "invoice", id, "CANCEL", { from: inv.status, to: "CANCELLED", reason });
}

export function recordPayment(
  actor: Actor,
  invoiceId: number,
  input: { amount: number; paidAt: string; method?: string | null; reference?: string | null; source?: "USER" | "ERP" },
) {
  const inv = getInvoice(invoiceId);
  assert(inv, "Không tìm thấy hóa đơn");
  assert(inv.status === "ISSUED" || inv.status === "PARTIALLY_PAID", "Hóa đơn chưa phát hành hoặc đã thanh toán đủ");
  assert(Number.isInteger(input.amount) && input.amount > 0, "Số tiền không hợp lệ");
  assert(inv.paid_amount + input.amount <= inv.amount, "Số tiền vượt giá trị hóa đơn");
  if (input.reference) {
    assert(!get("SELECT id FROM payments WHERE invoice_id = ? AND reference = ?", invoiceId, input.reference), "Mã tham chiếu thanh toán đã được ghi nhận");
  }
  tx(() => {
    run(
      "INSERT INTO payments (invoice_id, amount, paid_at, method, reference, source, recorded_by) VALUES (?,?,?,?,?,?,?)",
      invoiceId, input.amount, input.paidAt, input.method ?? null, input.reference ?? null, input.source ?? "USER", actorUserId(actor),
    );
    const paid = inv.paid_amount + input.amount;
    const to = paid >= inv.amount ? "PAID" : "PARTIALLY_PAID";
    run("UPDATE invoices SET paid_amount=?, status=? WHERE id=?", paid, to, invoiceId);
    audit(actor, "invoice", invoiceId, "PAYMENT", { from: inv.status, to, details: input });
    const order = getOrder(inv.order_id);
    const opp = order ? getOpportunity(order.opportunity_id) : undefined;
    notify(opp?.owner_id, `${inv.code}: đã nhận ${input.amount.toLocaleString("vi-VN")} ₫ (${to === "PAID" ? "đủ" : "một phần"})`, "/invoices");
  });
}
