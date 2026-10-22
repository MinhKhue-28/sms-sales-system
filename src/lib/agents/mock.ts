// Chế độ mô phỏng (không cần API key): Agent đi theo kịch bản cố định, dùng ĐÚNG các công cụ
// và kiểm tra quyền như khi chạy bằng Claude, nên luồng kiểm duyệt/log giống hệt bản thật.
import { stripAccents } from "../domain";
import { invokeTool, type ToolCallLog, type ToolContext } from "./tools";

type Research = { untrusted_data: true; data: { title: string; snippet: string; source: string }[] };
type Wrapped<T> = { data: T };

const has = (text: string, ...words: string[]) => words.some((w) => text.includes(w));

function industryFrom(text: string): string | null {
  if (has(text, "thep")) return "Sản xuất – Thép";
  if (has(text, "duoc")) return "Dược phẩm – Phân phối";
  if (has(text, "logistics", "van tai")) return "Logistics – Vận tải";
  if (has(text, "cntt", "digital", "cong nghe")) return "Dịch vụ CNTT";
  return null;
}

export function mockQualificationAgent(ctx: ToolContext, log: ToolCallLog[]): string {
  const call = (name: string, input: unknown = {}) => invokeTool(ctx, name, input, log);

  const lead = call("get_lead") as {
    company_name: string; contact_title: string | null; email: string | null; industry: string | null;
    address: string | null; notes: Wrapped<string | null>;
  };
  const criteria = call("get_admin_criteria") as { bant_threshold: number };
  const activities = call("list_lead_activities") as Wrapped<{ subject: string; body: string | null; ref: string }[]>;
  const dups = call("find_duplicates") as { kind: string; label: string; reason: string }[];
  const addr = call("normalize_address") as { normalized: string | null; confidence: number };
  const web = (call("web_research", { query: lead.company_name }) as Research).data;

  const notes = stripAccents((lead.notes.data ?? "").toLowerCase());
  const acts = stripAccents(activities.data.map((a) => `${a.subject} ${a.body ?? ""}`).join(" ").toLowerCase());
  const webText = stripAccents(web.map((w) => w.snippet).join(" ").toLowerCase());
  const title = stripAccents((lead.contact_title ?? "").toLowerCase());
  const all = `${notes} ${acts} ${webText}`;
  const evidence: { source: string; detail: string }[] = [];
  const negative = has(webText, "cat giam", "tam dung");

  // --- Need
  let need = 8;
  if (has(all, "crm", "pipeline", "quan ly ban hang", "doi sales", "doi kinh doanh", "nhan vien kinh doanh", "trinh duoc vien", "bang tinh")) {
    need = 20;
    evidence.push({ source: lead.notes.data ? "lead.notes" : "web_research", detail: "Có nhu cầu quản lý bán hàng / đội sales" });
  }
  // --- Budget
  let budget = 8;
  if (has(all, "ngan sach", "budget", "trieu", "ty dong", "goi von", "mo rong")) {
    budget = 18;
    evidence.push({ source: web[0]?.source ?? "lead.notes", detail: "Tín hiệu có ngân sách / đang mở rộng" });
  }
  if (negative) {
    budget = 3;
    evidence.push({ source: web[0]?.source ?? "web_research", detail: "Đang cắt giảm chi phí / tạm dừng dự án CNTT" });
  }
  // --- Authority
  let authority = 6;
  if (has(title, "giam doc", "ceo", "cio", "cto", "director", "founder", "chu tich", "pho tong")) authority = 22;
  else if (has(title, "truong", "head", "manager", "quan ly")) authority = 14;
  if (lead.contact_title) evidence.push({ source: "lead.contact_title", detail: `Chức danh: ${lead.contact_title}` });
  // --- Timeline
  let timeline = 8;
  if (has(all, "q1", "q2", "quy 1", "quy 2", "2027", "trong thang", "ngay")) {
    timeline = 17;
    evidence.push({ source: "lead.notes/web", detail: "Có mốc thời gian triển khai" });
  }
  if (negative) timeline = 3;

  // --- Làm giàu dữ liệu (chỉ đề xuất trường trống)
  const fields: Record<string, string> = {};
  const ind = industryFrom(`${notes} ${webText} ${stripAccents(lead.company_name.toLowerCase())}`);
  if (!lead.industry && ind) fields.industry = ind;
  if (addr.normalized && addr.normalized !== lead.address && addr.confidence >= 0.8) fields.address = addr.normalized;
  if (web.length) fields.notes = `Nghiên cứu: ${web[0].snippet}`;
  if (Object.keys(fields).length) {
    call("propose_enrichment", { fields, evidence: web.map((w) => ({ source: w.source, detail: w.title })) });
  }

  const rationale =
    `Need ${need}/25, Budget ${budget}/25, Authority ${authority}/25, Timeline ${timeline}/25. ` +
    (web.length ? `Nguồn web: ${web[0].title}. ` : "Không tìm thấy thông tin công khai. ") +
    (dups.length ? `Cảnh báo trùng: ${dups.map((d) => `${d.label} (${d.reason})`).join("; ")}.` : "");
  const scored = call("propose_bant_score", { budget, authority, need, timeline, rationale, evidence }) as { total: number };
  const total = scored.total;

  let next: string;
  if (total >= criteria.bant_threshold) {
    call("propose_conversion", {
      handoff_summary: `${lead.company_name}: ${rationale}`,
      evidence,
    });
    next = "đề xuất chuyển đổi";
  } else if (negative || total < 35) {
    call("propose_disqualify", {
      reason: negative ? "Doanh nghiệp đang cắt giảm chi phí, tạm dừng dự án CNTT (không có ngân sách)" : "BANT thấp, chưa thấy nhu cầu và ngân sách rõ ràng",
      evidence,
    });
    next = "đề xuất loại Lead";
  } else {
    const missing = [budget < 15 && "ngân sách dự kiến", authority < 15 && "người ra quyết định", timeline < 15 && "thời điểm dự kiến triển khai"].filter(Boolean);
    if (lead.email) {
      call("draft_email", {
        subject: `Trao đổi thêm về nhu cầu quản lý bán hàng của ${lead.company_name}`,
        body: `Kính gửi Anh/Chị,\n\nCảm ơn Anh/Chị đã quan tâm đến giải pháp Sales Cloud. Để đề xuất phương án phù hợp, Anh/Chị có thể chia sẻ thêm về ${missing.join(", ") || "kế hoạch triển khai"} không ạ?\n\nNếu thuận tiện, chúng tôi xin hẹn một cuộc gọi 20 phút trong tuần này.\n\nTrân trọng.`,
        purpose: "Bổ sung thông tin BANT còn thiếu",
      });
    }
    next = "soạn email hỏi thêm thông tin";
  }
  if (dups.length) call("create_follow_up_task", { title: "Kiểm tra bản ghi có thể trùng trước khi chuyển đổi", due_in_days: 1 });

  return `Đã đánh giá ${lead.company_name}: BANT đề xuất ${total}/100 (ngưỡng ${criteria.bant_threshold}); ${next}.` +
    (dups.length ? ` Phát hiện ${dups.length} bản ghi có thể trùng (chỉ cảnh báo, không gộp).` : "");
}

export function mockOpportunityAgent(ctx: ToolContext, log: ToolCallLog[]): string {
  const call = (name: string, input: unknown = {}) => invokeTool(ctx, name, input, log);

  const o = call("get_opportunity") as {
    code: string; account: string; stage: string; amount_vnd: number; close_date: string | null;
    customer_need: Wrapped<string | null>;
    checklist: Record<string, boolean>;
    stakeholders: { name: string; role: string }[];
    competitors: { name: string; strengths: string | null }[];
  };
  call("get_admin_criteria");
  const emails = (call("get_recent_emails") as Wrapped<{ window_days: number; emails: { subject: string; ref: string }[] }>).data;
  const meetings = (call("get_meeting_notes") as Wrapped<{ subject: string; ref: string }[]>).data;
  const web = (call("web_research", { query: o.account }) as Research).data;
  call("get_win_history");

  const risks: { description: string; severity: "LOW" | "MEDIUM" | "HIGH" }[] = [];
  const actions: string[] = [];
  const sources: { ref: string; detail: string }[] = [];

  if (!o.stakeholders.some((s) => s.role === "DECISION_MAKER")) {
    risks.push({ description: "Chưa xác định/tiếp cận người ra quyết định", severity: "HIGH" });
    actions.push("Đề nghị champion giới thiệu người quyết định và đặt lịch họp với họ");
  }
  if (!o.customer_need.data) {
    risks.push({ description: "Chưa ghi nhận Customer Need", severity: "HIGH" });
    actions.push("Tổ chức buổi khảo sát nhu cầu và ghi vào hồ sơ");
  }
  for (const c of o.competitors) {
    risks.push({ description: `Đang cạnh tranh với ${c.name}${c.strengths ? ` (mạnh: ${c.strengths})` : ""}`, severity: "MEDIUM" });
  }
  if (o.competitors.length) actions.push(`Chuẩn bị bảng so sánh với ${o.competitors[0].name} nhấn vào điểm khác biệt AI Agent`);
  if (!emails.emails.length) {
    risks.push({ description: `Không có email trao đổi trong ${emails.window_days} ngày`, severity: "MEDIUM" });
    actions.push("Gửi follow-up tóm tắt cuộc họp gần nhất và đề xuất bước tiếp theo");
  }
  if (o.close_date && new Date(o.close_date).getTime() - Date.now() < 21 * 86400000 && o.stage === "DEVELOP") {
    risks.push({ description: "Close date còn dưới 3 tuần nhưng vẫn ở Develop", severity: "HIGH" });
  }
  if (!o.checklist.solution_confirmed) actions.push("Phối hợp Presales hoàn thiện và xác nhận Proposed Solution");

  emails.emails.slice(0, 3).forEach((e) => sources.push({ ref: e.ref, detail: e.subject }));
  meetings.slice(0, 3).forEach((m) => sources.push({ ref: m.ref, detail: m.subject }));
  web.forEach((w) => sources.push({ ref: w.source, detail: w.title }));

  let importance: "LOW" | "MEDIUM" | "HIGH" = o.amount_vnd >= 500_000_000 ? "HIGH" : o.amount_vnd >= 150_000_000 ? "MEDIUM" : "LOW";
  if (importance === "MEDIUM" && web.some((w) => /mở rộng|gọi vốn|số hóa/i.test(w.snippet))) importance = "HIGH";

  const summary =
    `${o.account} – giá trị dự kiến ${o.amount_vnd.toLocaleString("vi-VN")} ₫, mức quan trọng ${importance}. ` +
    (web.length ? `Bối cảnh: ${web[0].snippet} ` : "") +
    `Phát hiện ${risks.length} rủi ro; ${emails.emails.length} email và ${meetings.length} ghi chú họp được xem xét.`;

  call("save_opportunity_research", { importance, summary, risks, next_actions: actions.slice(0, 3), sources });
  if (risks.some((r) => r.severity === "HIGH")) call("notify_owner", { message: `Có ${risks.filter((r) => r.severity === "HIGH").length} rủi ro mức Cao cần xử lý` });

  return `Đã cập nhật Opportunity Research cho ${o.code}: mức ${importance}, ${risks.length} rủi ro, ${Math.min(actions.length, 3)} hành động ưu tiên. Chờ AE xác minh.`;
}
