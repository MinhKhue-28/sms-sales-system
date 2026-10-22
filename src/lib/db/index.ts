import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";
import { seed } from "./seed";

export type Row = Record<string, unknown>;
type Param = SQLInputValue;

declare global {
  var __smsDb: DatabaseSync | undefined;
}

function open(): DatabaseSync {
  const file = process.env.SMS_DB_PATH ?? path.join(process.cwd(), "data", "sms.db");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA_SQL);
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (n === 0) seed(db);
  return db;
}

export function db(): DatabaseSync {
  globalThis.__smsDb ??= open();
  return globalThis.__smsDb;
}

// node:sqlite trả về object null-prototype; sao chép thành object thường để
// có thể truyền sang Client Components.
export function all<T = Row>(sql: string, ...params: Param[]): T[] {
  return db().prepare(sql).all(...params).map((r) => ({ ...r }) as T);
}

export function get<T = Row>(sql: string, ...params: Param[]): T | undefined {
  const r = db().prepare(sql).get(...params);
  return r ? ({ ...r } as T) : undefined;
}

export function run(sql: string, ...params: Param[]): { id: number; changes: number } {
  const r = db().prepare(sql).run(...params);
  return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
}

let depth = 0;
export function tx<T>(fn: () => T): T {
  const d = db();
  if (depth > 0) return fn();
  depth++;
  d.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    d.exec("COMMIT");
    return out;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  } finally {
    depth--;
  }
}

/** Sinh mã nghiệp vụ dạng PREFIX-YYYY-0001 */
export function nextCode(table: "opportunities" | "quotes" | "orders" | "invoices", prefix: string): string {
  const year = new Date().getFullYear();
  const like = `${prefix}-${year}-%`;
  const r = get<{ code: string }>(`SELECT code FROM ${table} WHERE code LIKE ? ORDER BY code DESC LIMIT 1`, like);
  const n = r ? Number(r.code.split("-").pop()) + 1 : 1;
  return `${prefix}-${year}-${String(n).padStart(4, "0")}`;
}
