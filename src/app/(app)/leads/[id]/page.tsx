import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { BANT_KEYS, BANT_LABEL, DISQUALIFY_REASONS, formatDate, LEAD_SOURCE, LEAD_STATUS } from "@/lib/domain";
import { can } from "@/lib/rbac";
import { listRuns, listSuggestions } from "@/lib/services/ai-review";
import { activitiesFor, auditTrail, settingNumber, users } from "@/lib/services/core";
import { conversionCandidates, findDuplicates, getLead } from "@/lib/services/leads";
import { SubmitButton } from "@/components/client";
import { AgentRuns, AuditTrail, SALES_STAGES, SuggestionSummary, Timeline } from "@/components/record";
import {
  Card, CommandAction, CommandBar, CommandLink, CommandSep, Flash, FormField, HeaderField, MessageBar, PageTitle, Persona, ProcessFlow, StatusBadge, Tabs, cx,
} from "@/components/ui";
import {
  addLeadActivityAction, bantAction, convertAction, disqualifyAction, reactivateAction, runQualificationAction, updateLeadAction,
} from "../actions";

export async function generateMetadata({ params }: PageProps<"/leads/[id]">): Promise<Metadata> {
  const lead = getLead(Number((await params).id));
  return { title: lead?.company_name ?? "Lead" };
}

export default async function LeadPage({ params, searchParams }: PageProps<"/leads/[id]">) {
  const user = await requireUser();
  const leadId = Number((await params).id);
  const sp = (await searchParams) as { tab?: string; ok?: string; error?: string };
  const lead = getLead(leadId);
  if (!lead) notFound();

  const tab = sp.tab ?? "summary";
  const open = lead.status === "OPEN" || lead.status === "WORKING";
  const canWrite = can(user.role, "lead.write");
  const threshold = settingNumber("bant_threshold");
  const dups = findDuplicates(lead, lead.id);
  const suggestions = listSuggestions({ entityType: "lead", entityId: lead.id });
  const pending = suggestions.filter((s) => s.status === "PENDING_REVIEW");
  const owners = [...users("SALES"), ...users("SALES_MANAGER")];
  const cand = conversionCandidates(lead);
  const activities = activitiesFor("lead", lead.id);
  const base = `/leads/${lead.id}`;

  return (
    <>
      <CommandBar>
        {open && canWrite && (
          <button type="submit" form="lead-form" className="cmd">
            Lưu
          </button>
        )}
        <CommandLink href="/leads" icon="arrowLeft">Danh sách</CommandLink>
        <CommandSep />
        {open && can(user.role, "ai.run") && (
          <CommandAction action={runQualificationAction} fields={{ id: lead.id }} icon="sparkle">
            Chạy Qualification Agent
          </CommandAction>
        )}
        {open && canWrite && <CommandLink href={`${base}?tab=summary#qualify`} icon="arrowRight">Chuyển đổi / Loại</CommandLink>}
        {lead.status === "DISQUALIFIED" && canWrite && (
          <CommandAction action={reactivateAction} fields={{ id: lead.id }} icon="refresh">Tái kích hoạt</CommandAction>
        )}
        {lead.converted_opportunity_id && (
          <CommandLink href={`/opportunities/${lead.converted_opportunity_id}`} icon="opportunity">Mở Opportunity</CommandLink>
        )}
      </CommandBar>
      <Flash sp={sp} />
      <PageTitle
        icon="lead"
        title={lead.company_name}
        subtitle={`Lead · ${lead.contact_name}${lead.contact_title ? ` – ${lead.contact_title}` : ""}`}
        right={
          <>
            <HeaderField label="Điểm BANT">
              <span className={lead.bant_score >= threshold ? "text-success" : ""}>{lead.bant_score}</span>
              <span className="text-sm font-normal text-ink-3">/100</span>
            </HeaderField>
            <HeaderField label="Trạng thái"><StatusBadge status={lead.status} labels={LEAD_STATUS} /></HeaderField>
            <HeaderField label="Nguồn">{LEAD_SOURCE[lead.source] ?? lead.source}</HeaderField>
            <HeaderField label="Phụ trách"><Persona name={lead.owner_name} size={24} /></HeaderField>
          </>
        }
      />
      <ProcessFlow stages={SALES_STAGES} current={lead.status === "CONVERTED" ? "DEVELOP" : "QUALIFY"} lost={lead.status === "DISQUALIFIED"} />

      <div className="space-y-2 px-6">
        {dups.length > 0 && (
          <MessageBar intent="warning" title="Có thể trùng:">
            {dups.map((d, i) => (
              <span key={i}>
                {i > 0 && "; "}
                {d.kind === "LEAD" ? <Link className="link" href={`/leads/${d.id}`}>{d.label}</Link> : d.kind === "ACCOUNT" ? <Link className="link" href={`/accounts/${d.id}`}>{d.label}</Link> : d.label} ({d.reason})
              </span>
            ))}
            . Hệ thống không tự gộp — hãy kiểm tra trước khi chuyển đổi.
          </MessageBar>
        )}
        {pending.length > 0 && (
          <MessageBar intent="info" title={`${pending.length} đề xuất từ Agent đang chờ duyệt.`} action={<Link className="link whitespace-nowrap text-sm" href="/ai-review">Mở Kiểm duyệt AI</Link>}>
            {pending.map((p) => p.title).join(" · ")}
          </MessageBar>
        )}
        {lead.status === "DISQUALIFIED" && <MessageBar intent="warning" title="Lead đã bị loại:">{lead.disqualify_reason}</MessageBar>}
      </div>

      <Tabs
        base={base}
        current={tab}
        tabs={[
          { key: "summary", label: "Tóm tắt" },
          { key: "activities", label: "Hoạt động", count: activities.length },
          { key: "agent", label: "Agent & nhật ký", count: suggestions.length },
        ]}
      />

      <div className="px-6 py-4 pb-10">
        {tab === "summary" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Thông tin Lead">
              <form id="lead-form" action={updateLeadAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={lead.id} />
                <fieldset disabled={!open || !canWrite} className="contents">
                  <FormField label="Tên công ty" required><input name="company_name" defaultValue={lead.company_name} className="input" required /></FormField>
                  <FormField label="Ngành"><input name="industry" defaultValue={lead.industry ?? ""} className="input" /></FormField>
                  <FormField label="Người liên hệ" required><input name="contact_name" defaultValue={lead.contact_name} className="input" required /></FormField>
                  <FormField label="Chức danh"><input name="contact_title" defaultValue={lead.contact_title ?? ""} className="input" /></FormField>
                  <FormField label="Email"><input name="email" type="email" defaultValue={lead.email ?? ""} className="input" /></FormField>
                  <FormField label="Điện thoại"><input name="phone" defaultValue={lead.phone ?? ""} className="input" /></FormField>
                  <FormField label="Địa chỉ" className="md:col-span-2" hint={lead.address_normalized && lead.address_normalized !== lead.address ? `Chuẩn hóa: ${lead.address_normalized}` : undefined}>
                    <input name="address" defaultValue={lead.address ?? ""} className="input" />
                  </FormField>
                  <FormField label="Người phụ trách">
                    <select name="owner_id" defaultValue={lead.owner_id ?? ""} className="select">
                      {owners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Tạo lúc"><input disabled value={formatDate(lead.created_at, true)} className="input" /></FormField>
                  <FormField label="Ghi chú" className="md:col-span-2"><textarea name="notes" defaultValue={lead.notes ?? ""} className="textarea" /></FormField>
                </fieldset>
                {open && canWrite && (
                  <div className="md:col-span-2">
                    <SubmitButton icon="save">Lưu thông tin</SubmitButton>
                  </div>
                )}
              </form>
            </Card>

            <div className="space-y-4">
              <Card title={`BANT — ngưỡng đạt chuẩn ${threshold}/100`}>
                <form action={bantAction} className="space-y-3">
                  <input type="hidden" name="id" value={lead.id} />
                  <fieldset disabled={!open || !canWrite} className="space-y-3">
                    {BANT_KEYS.map((k) => {
                      const v = lead[`bant_${k}` as const];
                      return (
                        <div key={k} className="grid grid-cols-[170px_1fr_70px] items-center gap-3">
                          <span className="text-sm">{BANT_LABEL[k]}</span>
                          <span className="h-2 rounded-full bg-[#f0f0f0]">
                            <span className="block h-2 rounded-full bg-brand" style={{ width: `${(v / 25) * 100}%` }} />
                          </span>
                          <input name={k} type="number" min={0} max={25} defaultValue={v} className="input !min-h-7 !py-0.5 text-right" aria-label={BANT_LABEL[k]} />
                        </div>
                      );
                    })}
                    <FormField label="Bằng chứng / ghi chú BANT">
                      <textarea name="bant_notes" defaultValue={lead.bant_notes ?? ""} className="textarea" />
                    </FormField>
                    {open && canWrite && <SubmitButton icon="save">Cập nhật BANT</SubmitButton>}
                  </fieldset>
                </form>
              </Card>

              {open && can(user.role, "lead.convert") && (
                <Card title="Chuyển đổi (Qualify → Develop)">
                  <div id="qualify" />
                  {lead.bant_score < threshold && (
                    <div className="mb-3">
                      <MessageBar intent="warning">BANT {lead.bant_score}/100 chưa đạt ngưỡng {threshold} — chưa thể chuyển đổi.</MessageBar>
                    </div>
                  )}
                  <form action={convertAction} className="space-y-3">
                    <input type="hidden" name="id" value={lead.id} />
                    <fieldset className="space-y-1.5">
                      <legend className="label">Account</legend>
                      {cand.accounts.map((a, i) => (
                        <label key={a.id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="account" value={a.id} defaultChecked={i === 0} className="accent-[var(--brand)]" />
                          Dùng lại <Link className="link" href={`/accounts/${a.id}`}>{a.name}</Link> <span className="text-xs text-ink-3">({a.reason})</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="account" value="new" defaultChecked={!cand.accounts.length} className="accent-[var(--brand)]" />
                        Tạo Account mới “{lead.company_name}”
                      </label>
                    </fieldset>
                    <fieldset className="space-y-1.5">
                      <legend className="label">Contact</legend>
                      {cand.contacts.map((c, i) => (
                        <label key={c.id} className="flex items-center gap-2 text-sm">
                          <input type="radio" name="contact" value={c.id} defaultChecked={i === 0} className="accent-[var(--brand)]" />
                          Dùng lại {c.full_name} <span className="text-xs text-ink-3">({c.account_name})</span>
                        </label>
                      ))}
                      <label className="flex items-center gap-2 text-sm">
                        <input type="radio" name="contact" value="new" defaultChecked={!cand.contacts.length} className="accent-[var(--brand)]" />
                        Tạo Contact mới “{lead.contact_name}”
                      </label>
                    </fieldset>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <FormField label="Tên Opportunity" className="md:col-span-2">
                        <input name="opportunity_name" defaultValue={`${lead.company_name} – Sales Cloud`} className="input" />
                      </FormField>
                      <FormField label="AE nhận Opportunity" required>
                        <select name="owner_id" className="select" defaultValue={owners.find((o) => o.id !== lead.owner_id)?.id}>
                          {owners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Giá trị dự kiến (₫)"><input name="amount" inputMode="numeric" className="input" placeholder="0" /></FormField>
                      <FormField label="Ngày dự kiến chốt"><input name="close_date" type="date" className="input" /></FormField>
                    </div>
                    <SubmitButton variant="primary" icon="arrowRight">Chuyển đổi</SubmitButton>
                  </form>
                </Card>
              )}

              {open && can(user.role, "lead.disqualify") && (
                <Card title="Loại Lead (Disqualify)">
                  <form action={disqualifyAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input type="hidden" name="id" value={lead.id} />
                    <FormField label="Lý do" required>
                      <select name="reason" required className="select" defaultValue="">
                        <option value="" disabled>Chọn lý do…</option>
                        {DISQUALIFY_REASONS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Diễn giải"><input name="reason_note" className="input" /></FormField>
                    <div className="md:col-span-2">
                      <SubmitButton variant="danger" icon="dismissCircle">Loại Lead</SubmitButton>
                      <span className="ml-3 text-xs text-ink-3">Lịch sử được giữ nguyên; có thể tái kích hoạt.</span>
                    </div>
                  </form>
                </Card>
              )}
            </div>
          </div>
        )}

        {tab === "activities" && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card title="Ghi nhận hoạt động">
              <form action={addLeadActivityAction} className="space-y-3">
                <input type="hidden" name="id" value={lead.id} />
                <FormField label="Loại">
                  <select name="type" className="select">
                    <option value="NOTE">Ghi chú</option>
                    <option value="CALL">Cuộc gọi</option>
                    <option value="EMAIL">Email phản hồi từ khách</option>
                    <option value="MEETING">Cuộc họp</option>
                  </select>
                </FormField>
                <FormField label="Tiêu đề" required><input name="subject" required className="input" /></FormField>
                <FormField label="Nội dung"><textarea name="body" className="textarea" /></FormField>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="run_agent" defaultChecked /> Nếu là email phản hồi: kích hoạt Agent đánh giá lại
                </label>
                <SubmitButton variant="primary" icon="add" className={cx(!canWrite && "hidden")}>Thêm</SubmitButton>
              </form>
            </Card>
            <Card title="Dòng thời gian" className="xl:col-span-2">
              <Timeline items={activities} />
            </Card>
          </div>
        )}

        {tab === "agent" && (
          <div className="space-y-4">
            <Card title="Đề xuất của Sales Qualification Agent" pad={false}>
              <SuggestionSummary items={suggestions} />
            </Card>
            <AgentRuns runs={listRuns({ entityType: "lead", entityId: lead.id })} />
            <AuditTrail rows={auditTrail("lead", lead.id)} />
          </div>
        )}
      </div>
    </>
  );
}
