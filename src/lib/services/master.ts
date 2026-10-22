// Master data: Account, Contact, Product, Price List, Competitor.
import { all, get, run, tx } from "../db";
import { assert, emailDomain, normalizeCompany, normalizeEmail, normalizePhone } from "../domain";
import { audit, type Actor } from "./core";

export type Account = {
  id: number;
  name: string;
  industry: string | null;
  website: string | null;
  email_domain: string | null;
  address: string | null;
  employee_size: string | null;
  owner_name: string | null;
  created_at: string;
  open_opps: number;
  contacts: number;
};

export function listAccounts(q?: string) {
  const base = `SELECT a.*, u.name AS owner_name,
    (SELECT COUNT(*) FROM opportunities o WHERE o.account_id = a.id AND o.stage NOT IN ('WON','LOST')) AS open_opps,
    (SELECT COUNT(*) FROM contacts c WHERE c.account_id = a.id) AS contacts
    FROM accounts a LEFT JOIN users u ON u.id = a.owner_id`;
  return q
    ? all<Account>(`${base} WHERE a.name_norm LIKE ? ORDER BY a.name`, `%${normalizeCompany(q)}%`)
    : all<Account>(`${base} ORDER BY a.name`);
}

export function getAccount(id: number) {
  return get<Account>(
    `SELECT a.*, u.name AS owner_name, 0 AS open_opps, 0 AS contacts FROM accounts a LEFT JOIN users u ON u.id = a.owner_id WHERE a.id = ?`,
    id,
  );
}

export function contactsOf(accountId: number) {
  return all<{ id: number; full_name: string; title: string | null; email: string | null; phone: string | null; is_primary: number }>(
    "SELECT * FROM contacts WHERE account_id = ? ORDER BY is_primary DESC, full_name",
    accountId,
  );
}

export function updateAccount(actor: Actor, id: number, input: { industry?: string | null; website?: string | null; address?: string | null; employee_size?: string | null }) {
  assert(getAccount(id), "Không tìm thấy Account");
  run(
    "UPDATE accounts SET industry=?, website=?, address=?, employee_size=?, updated_at=datetime('now') WHERE id=?",
    input.industry ?? null, input.website ?? null, input.address ?? null, input.employee_size ?? null, id,
  );
  audit(actor, "account", id, "UPDATE", { details: input });
}

export function addContact(actor: Actor, accountId: number, input: { full_name: string; title?: string | null; email?: string | null; phone?: string | null }) {
  assert(getAccount(accountId), "Không tìm thấy Account");
  assert(input.full_name?.trim(), "Thiếu họ tên");
  const mail = normalizeEmail(input.email);
  if (mail) assert(!get("SELECT id FROM contacts WHERE email = ?", mail), "Email liên hệ đã tồn tại");
  return tx(() => {
    const { id } = run(
      "INSERT INTO contacts (account_id, full_name, title, email, phone) VALUES (?,?,?,?,?)",
      accountId, input.full_name.trim(), input.title ?? null, mail, normalizePhone(input.phone),
    );
    if (mail && !getAccount(accountId)?.email_domain) {
      run("UPDATE accounts SET email_domain = ? WHERE id = ?", emailDomain(mail), accountId);
    }
    audit(actor, "account", accountId, "CONTACT_ADD", { details: { contactId: id } });
    return id;
  });
}

export function listProducts() {
  return all<{ id: number; code: string; name: string; type: string; unit: string; description: string | null; active: number }>(
    "SELECT * FROM products ORDER BY type, code",
  );
}

export function listPriceLists() {
  return all<{ id: number; name: string; currency: string; active: number }>("SELECT * FROM price_lists ORDER BY id");
}

export function priceListItems(priceListId: number) {
  return all<{ product_id: number; code: string; name: string; type: string; unit: string; unit_price: number }>(
    `SELECT pli.product_id, p.code, p.name, p.type, p.unit, pli.unit_price FROM price_list_items pli
     JOIN products p ON p.id = pli.product_id WHERE pli.price_list_id = ? AND p.active = 1 ORDER BY p.type, p.code`,
    priceListId,
  );
}

export function listCompetitors() {
  return all<{ id: number; name: string; website: string | null; strengths: string | null; weaknesses: string | null }>(
    "SELECT * FROM competitors ORDER BY name",
  );
}
