"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth";
import { get } from "@/lib/db";

// Đăng nhập demo: chọn người dùng mẫu theo vai trò (môi trường đồ án). Bản triển khai thật dùng SSO doanh nghiệp.
export async function loginAction(fd: FormData) {
  const id = Number(fd.get("userId"));
  if (!get("SELECT id FROM users WHERE id = ? AND active = 1", id)) redirect("/login");
  await signIn(id);
  redirect("/");
}

export async function logoutAction() {
  await signOut();
  redirect("/login");
}
