// Giai đoạn QUALIFY: tạo/chuẩn hóa Lead, kiểm tra trùng, BANT, chuyển đổi hoặc loại có lý do.
import { all, get, nextCode, run, tx } from "../db";
import {
  assert,
  bantScore,
  clampBant,
  emailDomain,
  normalizeCompany,
  normalizeEmail,
  normalizePhone,
  type BantKey,
} from "../domain";
import { maps } from "../integrations";
import { actorUserId, addActivity, audit, notify, settingBool, settingNumber, type Actor } from "./core";

export type Lead = {
  id: number;
  company_name: string;
  company_norm: string;
  contact_name: string;
  contact_title: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  address_normalized: string | null;
  source: string;
  industry: string | null;
  notes: string | null;
  status: "OPEN" | "WORKING" | "CONVERTED" | "DISQUALIFIED";
  bant_budget: number;
  bant_authority: number;
  bant_need: number;
  bant_timeline: number;
  bant_score: number;
  bant_notes: string | null;
  duplicate_flag: number;
  disqualify_reason: string | null;
  owner_id: number | null;
  owner_name?: string | null;
  converted_account_id: number | null;
  converted_contact_id: number | null;
  converted_opportunity_id: number | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadInput = {
  company_name: string;
  contact_name: string;
  contact_title?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  source?: string;
  industry?: string | null;
  notes?: string | null;
  owner_id?: number | null;
};

export function listLeads(filter: { status?: string; q?: string } = {}) {
  const where: string[] = [];
  const params: string[] = [];
  if (filter.status) {
    where.push("l.status = ?");
    params.push(filter.status);
  }
  if (filter.q) {
    where.push("(l.company_norm LIKE ? OR l.contact_name LIKE ? OR l.email LIKE ?)");
    params.push(`%${normalizeCompany(filter.q)}%`, `%${filter.q}%`, `%${filter.q}%`);
  }
  return all<Lead>(
    `SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id = l.owner_id
     ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY l.updated_at DESC, l.id DESC`,
    ...params,
  );
}

export function getLead(id: number) {
  return get<Lead>(
    "SELECT l.*, u.name AS owner_name FROM leads l LEFT JOIN users u ON u.id = l.owner_id WHERE l.id = ?",
    id,
  );
}

export type DuplicateHit = { kind: "LEAD" | "ACCOUNT" | "CONTACT"; id: number; label: string; reason: string };

/** Phát hiện trùng — chỉ gắn cờ, không bao giờ tự gộp bản ghi. */
export function findDuplicates(input: { company_name: string; email?: string | null; phone?: string | null }, excludeLeadId?: number) {
  const hits: DuplicateHit[] = [];
  const norm = normalizeCompany(input.company_name);
  const mail = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const domain = emailDomain(input.email);

  for (const l of all<{ id: number; company_name: string; contact_name: string; email: string | null; phone: string | null; company_norm: string }>(
    "SELECT id, company_name, contact_name, email, phone, company_norm FROM leads WHERE id != ?",
    excludeLeadId ?? 0,
  )) {
    const reasons: string[] = [];
    if (mail && l.email === mail) reasons.push("trùng email");
    if (phone && l.phone === phone) reasons.push("trùng số điện thoại");
    if (norm && l.company_norm === norm) reasons.push("trùng tên công ty");
    if (reasons.length) hits.push({ kind: "LEAD", id: l.id, label: `${l.company_name} – ${l.contact_name}`, reason: reasons.join(", ") });
  }
  for (const a of all<{ id: number; name: string; name_norm: string; email_domain: string | null }>(
    "SELECT id, name, name_norm, email_domain FROM accounts",
  )) {
    const reasons: string[] = [];
    if (norm && a.name_norm === norm) reasons.push("trùng tên công ty");
    if (domain && a.email_domain === domain) reasons.push("trùng tên miền email");
    if (reasons.length) hits.push({ kind: "ACCOUNT", id: a.id, label: a.name, reason: reasons.join(", ") });
  }
  if (mail || phone) {
    for (const c of all<{ id: number; full_name: string; email: string | null; phone: string | null; account_name: string }>(
      "SELECT c.id, c.full_name, c.email, c.phone, a.name AS account_name FROM contacts c JOIN accounts a ON a.id = c.account_id",
    )) {
      if ((mail && c.email === mail) || (phone && normalizePhone(c.phone) === phone)) {
        hits.push({ kind: "CONTACT", id: c.id, label: `${c.full_name} (${c.account_name})`, reason: "trùng email/SĐT liên hệ" });
      }
    }
  }
  return hits;
}

export function createLead(actor: Actor, input: LeadInput): number {
  assert(input.company_name?.trim(), "Thiếu tên công ty");
  assert(input.contact_name?.trim(), "Thiếu tên người liên hệ");
  const email = normalizeEmail(input.email);
  assert(!email || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), "Email không hợp lệ");
  const addr = input.address?.trim() ? maps.normalizeAddress(input.address) : null;
  const dups = findDuplicates({ company_name: input.company_name, email, phone: input.phone });

  return tx(() => {
    const { id } = run(
      `INSERT INTO leads (company_name, company_norm, contact_name, contact_title, email, phone, address, address_normalized,
         source, industry, notes, owner_id, duplicate_flag, created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      input.company_name.trim(),
      normalizeCompany(input.company_name),
      input.contact_name.trim(),
      input.contact_title?.trim() || null,
      email,
      normalizePhone(input.phone),
      input.address?.trim() || null,
      addr?.normalized ?? null,
      input.source ?? "MANUAL",
      input.industry?.trim() || null,
      input.notes?.trim() || null,
      input.owner_id ?? actorUserId(actor),
      dups.length ? 1 : 0,
      actorUserId(actor),
    );
    audit(actor, "lead", id, "CREATE", { to: "OPEN", details: { duplicates: dups } });
    return id;
  });
}

const EDITABLE = ["company_name", "contact_name", "contact_title", "email", "phone", "address", "industry", "notes", "owner_id"] as const;

export function updateLead(actor: Actor, id: number, input: Partial<LeadInput>) {
  const lead = getLead(id);
  assert(lead, "Không tìm thấy Lead");
  assert(lead.status !== "CONVERTED", "Lead đã chuyển đổi, không sửa được");
  const next: Record<string, unknown> = {};
  for (const k of EDITABLE) if (k in input) next[k] = input[k as keyof LeadInput] ?? null;
  if ("email" in next) next.email = normalizeEmail(next.email as string);
  if ("phone" in next) next.phone = normalizePhone(next.phone as string);
  if ("company_name" in next) next.company_norm = normalizeCompany(String(next.company_name));
  if ("address" in next) next.address_normalized = next.address ? maps.normalizeAddress(String(next.address)).normalized : null;
  const keys = Object.keys(next);
  if (!keys.length) return;
  tx(() => {
    run(
      `UPDATE leads SET ${keys.map((k) => `${k} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      ...keys.map((k) => next[k] as string | number | null),
      id,
    );
    const dups = findDuplicates({ company_name: String(next.company_name ?? lead.company_name), email: (next.email as string) ?? lead.email, phone: (next.phone as string) ?? lead.phone }, id);
    run("UPDATE leads SET duplicate_flag = ? WHERE id = ?", dups.length ? 1 : 0, id);
    audit(actor, "lead", id, "UPDATE", { details: { fields: keys } });
  });
}

export function updateBant(actor: Actor, id: number, scores: Record<BantKey, number>, notes: string | null) {
  const lead = getLead(id);
  assert(lead, "Không tìm thấy Lead");
  assert(lead.status === "OPEN" || lead.status === "WORKING", "Chỉ cập nhật BANT cho Lead đang mở");
  const s = { budget: clampBant(scores.budget), authority: clampBant(scores.authority), need: clampBant(scores.need), timeline: clampBant(scores.timeline) };
  const total = bantScore(s);
  tx(() => {
    run(
      `UPDATE leads SET bant_budget=?, bant_authority=?, bant_need=?, bant_timeline=?, bant_score=?, bant_notes=?,
         status = CASE WHEN status = 'OPEN' THEN 'WORKING' ELSE status END, updated_at = datetime('now') WHERE id = ?`,
      s.budget, s.authority, s.need, s.timeline, total, notes, id,
    );
    audit(actor, "lead", id, "BANT_UPDATE", { from: lead.status, to: lead.status === "OPEN" ? "WORKING" : lead.status, details: { ...s, total } });
  });
  return total;
}

export function disqualifyLead(actor: Actor, id: number, reason: string) {
  // Human gate: chỉ con người được loại Lead (Agent chỉ đề xuất).
  assert(actor.type === "USER", "Chỉ nhân viên mới được loại Lead");
  assert(reason?.trim(), "Phải nhập lý do loại Lead");
  const lead = getLead(id);
  assert(lead, "Không tìm thấy Lead");
  assert(lead.status === "OPEN" || lead.status === "WORKING", "Lead không ở trạng thái mở");
  tx(() => {
    run("UPDATE leads SET status='DISQUALIFIED', disqualify_reason=?, updated_at=datetime('now') WHERE id=?", reason.trim(), id);
    audit(actor, "lead", id, "DISQUALIFY", { from: lead.status, to: "DISQUALIFIED", reason });
  });
}

export function reactivateLead(actor: Actor, id: number, reason: string) {
  const lead = getLead(id);
  assert(lead, "Không tìm thấy Lead");
  assert(lead.status === "DISQUALIFIED", "Chỉ tái kích hoạt Lead đã loại");
  tx(() => {
    run("UPDATE leads SET status='WORKING', updated_at=datetime('now') WHERE id=?", id);
    audit(actor, "lead", id, "REACTIVATE", { from: "DISQUALIFIED", to: "WORKING", reason });
  });
}

export function conversionCandidates(lead: Lead) {
  const domain = emailDomain(lead.email);
  const accounts = all<{ id: number; name: string; reason: string }>(
    `SELECT id, name, CASE WHEN name_norm = ? THEN 'trùng tên' ELSE 'trùng tên miền email' END AS reason
     FROM accounts WHERE name_norm = ? OR (? IS NOT NULL AND email_domain = ?)`,
    lead.company_norm, lead.company_norm, domain, domain,
  );
  const contacts = all<{ id: number; full_name: string; account_id: number; account_name: string }>(
    `SELECT c.id, c.full_name, c.account_id, a.name AS account_name FROM contacts c JOIN accounts a ON a.id = c.account_id
     WHERE (? IS NOT NULL AND c.email = ?) OR (? IS NOT NULL AND c.phone = ?)`,
    lead.email, lead.email, lead.phone, lead.phone,
  );
  return { accounts, contacts };
}

export type ConvertInput = {
  accountId?: number | null; // dùng lại Account có sẵn; null = tạo mới
  contactId?: number | null; // dùng lại Contact có sẵn; null = tạo mới
  ownerId: number; // AE nhận Opportunity
  opportunityName?: string;
  amount?: number;
  closeDate?: string | null;
};

/**
 * ADR-04 (tạm theo đề xuất brief): chuyển đổi là MỘT transaction ở cuối Qualify,
 * tạo/dùng lại Account + Contact và tạo Opportunity ở stage DEVELOP.
 * ADR-03: mặc định chỉ con người được chuyển đổi; AI chỉ đề xuất (cờ ai_auto_convert).
 */
export function convertLead(actor: Actor, id: number, input: ConvertInput) {
  if (actor.type === "AI") assert(settingBool("ai_auto_convert"), "AI không được tự chuyển đổi Lead (ADR-03)");
  const lead = getLead(id);
  assert(lead, "Không tìm thấy Lead");
  assert(lead.status === "OPEN" || lead.status === "WORKING", "Lead không ở trạng thái mở");
  const threshold = settingNumber("bant_threshold");
  assert(lead.bant_score >= threshold, `Điểm BANT ${lead.bant_score} chưa đạt ngưỡng ${threshold}`);
  assert(get("SELECT id FROM users WHERE id = ? AND role IN ('SALES','SALES_MANAGER')", input.ownerId), "AE nhận Opportunity không hợp lệ");

  return tx(() => {
    let accountId = input.accountId ?? null;
    if (accountId) {
      assert(get("SELECT id FROM accounts WHERE id = ?", accountId), "Account không tồn tại");
    } else {
      accountId = run(
        `INSERT INTO accounts (name, name_norm, industry, email_domain, address, owner_id) VALUES (?,?,?,?,?,?)`,
        lead.company_name, lead.company_norm, lead.industry, emailDomain(lead.email), lead.address_normalized ?? lead.address, input.ownerId,
      ).id;
      audit(actor, "account", accountId, "CREATE", { reason: `Chuyển đổi từ Lead #${id}` });
    }

    let contactId = input.contactId ?? null;
    if (contactId) {
      const c = get<{ account_id: number }>("SELECT account_id FROM contacts WHERE id = ?", contactId);
      assert(c && c.account_id === accountId, "Contact không thuộc Account đã chọn");
    } else {
      const hasPrimary = get("SELECT id FROM contacts WHERE account_id = ? AND is_primary = 1", accountId);
      contactId = run(
        "INSERT INTO contacts (account_id, full_name, title, email, phone, is_primary) VALUES (?,?,?,?,?,?)",
        accountId, lead.contact_name, lead.contact_title, lead.email, lead.phone, hasPrimary ? 0 : 1,
      ).id;
    }

    const priceList = get<{ id: number }>("SELECT id FROM price_lists WHERE active = 1 ORDER BY id LIMIT 1");
    const code = nextCode("opportunities", "OPP");
    const oppId = run(
      `INSERT INTO opportunities (code, name, account_id, primary_contact_id, owner_id, lead_id, stage, amount, close_date, price_list_id, customer_need)
       VALUES (?,?,?,?,?,?, 'DEVELOP', ?,?,?,?)`,
      code,
      input.opportunityName?.trim() || `${lead.company_name} – Sales Cloud`,
      accountId,
      contactId,
      input.ownerId,
      id,
      input.amount ?? 0,
      input.closeDate ?? null,
      priceList?.id ?? null,
      lead.bant_notes,
    ).id;

    run(
      `UPDATE leads SET status='CONVERTED', converted_account_id=?, converted_contact_id=?, converted_opportunity_id=?,
         converted_at=datetime('now'), updated_at=datetime('now') WHERE id=?`,
      accountId, contactId, oppId, id,
    );
    // Bảo toàn lịch sử tương tác: liên kết hoạt động của Lead sang Opportunity bằng ghi chú bàn giao.
    addActivity({
      entityType: "opportunity",
      entityId: oppId,
      type: "NOTE",
      subject: `Bàn giao từ Lead #${id} (BANT ${lead.bant_score}/100)`,
      body: lead.bant_notes,
      createdBy: actorUserId(actor),
    });
    audit(actor, "lead", id, "CONVERT", { from: lead.status, to: "CONVERTED", details: { accountId, contactId, opportunityId: oppId } });
    audit(actor, "opportunity", oppId, "CREATE", { to: "DEVELOP", reason: `Chuyển đổi từ Lead #${id}` });
    notify(input.ownerId, `Bạn được giao Opportunity ${code} (${lead.company_name})`, `/opportunities/${oppId}`);
    return { accountId, contactId, opportunityId: oppId };
  });
}

/** Chuyển đổi hàng loạt — do nhân viên kích hoạt. Tự dùng lại Account trùng tên/tên miền nếu có. */
export function bulkConvert(actor: Actor, ids: number[], ownerId: number) {
  assert(actor.type === "USER", "Chuyển đổi hàng loạt phải do nhân viên kích hoạt");
  const results: { id: number; ok: boolean; message: string }[] = [];
  for (const id of ids) {
    try {
      const lead = getLead(id);
      assert(lead, "Không tìm thấy");
      const cand = conversionCandidates(lead);
      const accountId = cand.accounts[0]?.id ?? null;
      const contactId = cand.contacts.find((c) => c.account_id === accountId)?.id ?? null;
      const r = convertLead(actor, id, { accountId, contactId, ownerId });
      results.push({ id, ok: true, message: `Đã tạo Opportunity #${r.opportunityId}` });
    } catch (e) {
      results.push({ id, ok: false, message: e instanceof Error ? e.message : String(e) });
    }
  }
  return results;
}
