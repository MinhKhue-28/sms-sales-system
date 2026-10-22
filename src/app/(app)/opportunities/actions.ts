"use server";

import { act, id, num, optStr, str } from "@/lib/action";
import { requirePermission } from "@/lib/auth";
import { runAgent } from "@/lib/agents/runtime";
import { DomainError, type ChecklistKey } from "@/lib/domain";
import { addActivity, userActor } from "@/lib/services/core";
import {
  addCompetitor, addRisk, addStakeholder, advanceStage, dismissResearch, markLost, removeCompetitor, removeStakeholder, resolveRisk,
  setChecklist, setProposedSolution, updateOpportunity, verifyResearch,
} from "@/lib/services/opportunities";
import { createQuote } from "@/lib/services/quotes";

const back = (oppId: number, tab = "summary") => `/opportunities/${oppId}?tab=${tab}`;

export async function updateOppAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId), async () => {
    const u = await requirePermission("opp.write");
    updateOpportunity(userActor(u), oppId, {
      name: str(fd, "name") || undefined,
      amount: num(fd, "amount"),
      close_date: optStr(fd, "close_date"),
      customer_need: optStr(fd, "customer_need"),
      price_list_id: Number(fd.get("price_list_id")) || null,
      primary_contact_id: Number(fd.get("primary_contact_id")) || null,
      presales_id: Number(fd.get("presales_id")) || null,
    });
  }, "Đã lưu Opportunity");
}

export async function solutionAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId), async () => {
    const u = await requirePermission("opp.solution");
    setProposedSolution(userActor(u), oppId, str(fd, "proposed_solution"));
  }, "Đã lưu Proposed Solution");
}

export async function checklistAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId), async () => {
    const key = str(fd, "key") as ChecklistKey;
    const u = await requirePermission(key === "solution_confirmed" ? "opp.solution" : "opp.write");
    setChecklist(userActor(u), oppId, key, str(fd, "value") === "1");
  });
}

export async function stakeholderAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "stakeholders"), async () => {
    const u = await requirePermission("opp.write");
    if (fd.get("remove")) return removeStakeholder(userActor(u), oppId, Number(fd.get("remove")));
    addStakeholder(userActor(u), oppId, { name: str(fd, "name"), role: str(fd, "role"), notes: optStr(fd, "notes") });
  });
}

export async function competitorAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "stakeholders"), async () => {
    const u = await requirePermission("opp.write");
    if (fd.get("remove")) return removeCompetitor(userActor(u), oppId, Number(fd.get("remove")));
    addCompetitor(userActor(u), oppId, Number(fd.get("competitor_id")), optStr(fd, "notes"));
  });
}

export async function riskAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "stakeholders"), async () => {
    const u = await requirePermission("opp.write");
    if (fd.get("resolve")) return resolveRisk(userActor(u), oppId, Number(fd.get("resolve")), str(fd, "resolution"));
    addRisk(userActor(u), oppId, str(fd, "description"), str(fd, "severity") || "MEDIUM");
  });
}

export async function advanceAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId), async () => {
    const u = await requirePermission("opp.stage");
    const r = advanceStage(userActor(u), oppId);
    if (!r.moved) throw new DomainError(r.message);
    return r.message;
  }, (m) => m);
}

export async function lostAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId), async () => {
    const u = await requirePermission("opp.stage");
    markLost(userActor(u), oppId, [str(fd, "reason"), optStr(fd, "reason_note")].filter(Boolean).join(" – "));
  }, "Đã đóng Opportunity: Lost");
}

export async function runOppAgentAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "research"), async () => {
    const u = await requirePermission("ai.run");
    const r = await runAgent("OPPORTUNITY", { type: "opportunity", id: oppId }, "MANUAL_RUN", u.id);
    if (r.status === "FAILED") throw new DomainError(`Agent lỗi: ${r.summary}`);
    return r.summary;
  }, (s) => s);
}

export async function verifyResearchAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "research"), async () => {
    const u = await requirePermission("ai.review");
    const researchId = id(fd, "research_id");
    if (fd.get("dismiss")) return dismissResearch(userActor(u), researchId);
    verifyResearch(userActor(u), researchId, {
      applyImportance: fd.get("apply_importance") === "on",
      riskIndexes: fd.getAll("risk").map(Number),
    });
  }, "Đã xử lý nghiên cứu của Agent");
}

export async function addOppActivityAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "activities"), async () => {
    const u = await requirePermission("opp.write");
    const type = str(fd, "type") as "NOTE" | "CALL" | "EMAIL" | "MEETING";
    if (!["NOTE", "CALL", "EMAIL", "MEETING"].includes(type)) throw new DomainError("Loại hoạt động không hợp lệ");
    if (!str(fd, "subject")) throw new DomainError("Thiếu tiêu đề");
    addActivity({ entityType: "opportunity", entityId: oppId, type, subject: str(fd, "subject"), body: optStr(fd, "body"), direction: type === "EMAIL" ? (str(fd, "direction") as "IN" | "OUT") || "IN" : null, createdBy: u.id });
  }, "Đã ghi nhận hoạt động");
}

export async function createQuoteAction(fd: FormData) {
  const oppId = id(fd);
  await act(back(oppId, "quotes"), async () => {
    const u = await requirePermission("quote.write");
    return { redirectTo: `/quotes/${createQuote(userActor(u), oppId)}` };
  }, "Đã tạo báo giá nháp");
}
