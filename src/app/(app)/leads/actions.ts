"use server";

import { after } from "next/server";
import { act, id, num, optStr, str } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { runAgent } from "@/lib/agents/runtime";
import { DomainError, type BantKey } from "@/lib/domain";
import { addActivity, settingBool, userActor } from "@/lib/services/core";
import { bulkConvert, convertLead, createLead, disqualifyLead, reactivateLead, updateBant, updateLead } from "@/lib/services/leads";

function leadInput(fd: FormData) {
  return {
    company_name: str(fd, "company_name"),
    contact_name: str(fd, "contact_name"),
    contact_title: optStr(fd, "contact_title"),
    email: optStr(fd, "email"),
    phone: optStr(fd, "phone"),
    address: optStr(fd, "address"),
    industry: optStr(fd, "industry"),
    notes: optStr(fd, "notes"),
  };
}

export async function createLeadAction(fd: FormData) {
  let newId = 0;
  await act(
    "/leads/new",
    async () => {
      const u = await requirePermission("lead.write");
      newId = createLead(userActor(u), { ...leadInput(fd), source: str(fd, "source") || "MANUAL", owner_id: Number(fd.get("owner_id")) || u.id });
      // Trigger: Lead mới → Sales Qualification Agent nghiên cứu nền (chạy sau khi phản hồi).
      if (fd.get("run_agent") === "on" && settingBool("agent_qualification_enabled")) {
        after(() => runAgent("QUALIFICATION", { type: "lead", id: newId }, "LEAD_CREATED", u.id).catch(console.error));
      }
      return { redirectTo: `/leads/${newId}` };
    },
    "Đã tạo Lead",
  );
}

export async function updateLeadAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}`, async () => {
    const u = await requirePermission("lead.write");
    updateLead(userActor(u), leadId, { ...leadInput(fd), owner_id: Number(fd.get("owner_id")) || null });
  }, "Đã lưu Lead");
}

export async function bantAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}`, async () => {
    const u = await requirePermission("lead.write");
    const scores = Object.fromEntries((["budget", "authority", "need", "timeline"] as BantKey[]).map((k) => [k, num(fd, k)])) as Record<BantKey, number>;
    const total = updateBant(userActor(u), leadId, scores, optStr(fd, "bant_notes"));
    return total;
  }, (t) => `Đã cập nhật BANT: ${t}/100`);
}

export async function disqualifyAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}`, async () => {
    const u = await requirePermission("lead.disqualify");
    const reason = [str(fd, "reason"), optStr(fd, "reason_note")].filter(Boolean).join(" – ");
    disqualifyLead(userActor(u), leadId, reason);
  }, "Đã loại Lead (lịch sử được giữ nguyên)");
}

export async function reactivateAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}`, async () => {
    const u = await requirePermission("lead.write");
    reactivateLead(userActor(u), leadId, "Tái kích hoạt");
  }, "Đã tái kích hoạt Lead");
}

export async function convertAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}`, async () => {
    const u = await requirePermission("lead.convert");
    const account = str(fd, "account");
    const contact = str(fd, "contact");
    const r = convertLead(userActor(u), leadId, {
      accountId: account && account !== "new" ? Number(account) : null,
      contactId: contact && contact !== "new" ? Number(contact) : null,
      ownerId: Number(fd.get("owner_id")),
      opportunityName: optStr(fd, "opportunity_name") ?? undefined,
      amount: str(fd, "amount") ? num(fd, "amount") : 0,
      closeDate: optStr(fd, "close_date"),
    });
    return { redirectTo: `/opportunities/${r.opportunityId}` };
  }, "Đã chuyển đổi Lead và tạo Opportunity ở giai đoạn Develop");
}

export async function bulkConvertAction(fd: FormData) {
  await act("/leads", async () => {
    const u = await requirePermission("lead.convert");
    const ids = fd.getAll("ids").map(Number).filter(Boolean);
    if (!ids.length) throw new DomainError("Chưa chọn Lead nào");
    const results = bulkConvert(userActor(u), ids, Number(fd.get("owner_id")) || u.id);
    const ok = results.filter((r) => r.ok).length;
    const fail = results.filter((r) => !r.ok);
    return `Chuyển đổi ${ok}/${results.length} Lead.${fail.length ? " Không đạt: " + fail.map((f) => `#${f.id} (${f.message})`).join("; ") : ""}`;
  }, (m) => m);
}

export async function runQualificationAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}?tab=agent`, async () => {
    const u = await requirePermission("ai.run");
    const r = await runAgent("QUALIFICATION", { type: "lead", id: leadId }, "MANUAL_RUN", u.id);
    if (r.status === "FAILED") throw new DomainError(`Agent lỗi: ${r.summary}`);
    return r.summary;
  }, (s) => s);
}

export async function addLeadActivityAction(fd: FormData) {
  const leadId = id(fd);
  await act(`/leads/${leadId}?tab=activities`, async () => {
    const u = await requirePermission("lead.write");
    const type = str(fd, "type") as "NOTE" | "CALL" | "EMAIL" | "MEETING";
    if (!["NOTE", "CALL", "EMAIL", "MEETING"].includes(type)) throw new DomainError("Loại hoạt động không hợp lệ");
    const subject = str(fd, "subject");
    if (!subject) throw new DomainError("Thiếu tiêu đề hoạt động");
    addActivity({ entityType: "lead", entityId: leadId, type, subject, body: optStr(fd, "body"), direction: type === "EMAIL" ? "IN" : null, createdBy: u.id });
    // Trigger: phản hồi email → Agent đánh giá lại
    if (type === "EMAIL" && fd.get("run_agent") === "on") {
      after(() => runAgent("QUALIFICATION", { type: "lead", id: leadId }, "EMAIL_REPLY", u.id).catch(console.error));
    }
  }, "Đã ghi nhận hoạt động");
}
