import "server-only";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { DomainError } from "./domain";

/**
 * Chạy một thao tác nghiệp vụ trong Server Action rồi quay về trang với thông báo (?ok= / ?error=).
 * Chỉ thông điệp DomainError được hiển thị; lỗi khác ghi log và báo chung chung.
 */
export async function act<T>(back: string, fn: () => T | Promise<T>, ok?: string | ((r: T) => string)): Promise<never> {
  let target = back;
  let message: string | undefined;
  let failed = false;
  try {
    const r = await fn();
    message = typeof ok === "function" ? ok(r) : ok;
    if (r && typeof r === "object" && "redirectTo" in r) target = String((r as { redirectTo: string }).redirectTo);
  } catch (e) {
    unstable_rethrow(e);
    failed = true;
    if (e instanceof DomainError) message = e.message;
    else {
      console.error(e);
      message = "Đã xảy ra lỗi hệ thống. Vui lòng thử lại.";
    }
  }
  revalidatePath("/", "layout");
  const url = new URL(target, "http://local");
  url.searchParams.delete("ok");
  url.searchParams.delete("error");
  if (message) url.searchParams.set(failed ? "error" : "ok", message);
  redirect(url.pathname + url.search);
}

export function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim();
}

export function optStr(fd: FormData, key: string): string | null {
  const v = str(fd, key);
  return v ? v : null;
}

export function num(fd: FormData, key: string): number {
  const v = Number(str(fd, key).replace(/[.,\s]/g, ""));
  if (!Number.isFinite(v)) throw new DomainError(`Giá trị số không hợp lệ: ${key}`);
  return v;
}

export function dec(fd: FormData, key: string): number {
  const v = Number(str(fd, key).replace(",", "."));
  if (!Number.isFinite(v)) throw new DomainError(`Giá trị số không hợp lệ: ${key}`);
  return v;
}

export function id(fd: FormData, key = "id"): number {
  const v = Number(fd.get(key));
  if (!Number.isInteger(v) || v <= 0) throw new DomainError("Thiếu mã bản ghi");
  return v;
}
