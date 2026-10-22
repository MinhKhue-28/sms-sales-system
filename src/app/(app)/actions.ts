"use server";

import { act, id } from "@/lib/action";
import { requireUser } from "@/lib/auth";
import { completeTask, markNotificationsRead } from "@/lib/services/admin";

export async function markReadAction() {
  const u = await requireUser();
  await act("/", () => markNotificationsRead(u.id));
}

export async function completeTaskAction(fd: FormData) {
  const u = await requireUser();
  await act("/", () => completeTask(u.id, id(fd)), "Đã hoàn thành công việc");
}
