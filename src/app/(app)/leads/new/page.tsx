import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { LEAD_SOURCE } from "@/lib/domain";
import { users } from "@/lib/services/core";
import { SubmitButton } from "@/components/client";
import { Card, CommandBar, CommandLink, Flash, FormField, MessageBar, PageTitle } from "@/components/ui";
import { createLeadAction } from "../actions";

export const metadata: Metadata = { title: "Lead mới" };

export default async function NewLeadPage({ searchParams }: PageProps<"/leads/new">) {
  const user = await requireUser();
  const sp = (await searchParams) as { ok?: string; error?: string };
  const owners = [...users("SALES"), ...users("SALES_MANAGER")];
  return (
    <>
      <CommandBar>
        <button type="submit" form="new-lead" className="cmd">Lưu & đóng</button>
        <CommandLink href="/leads" icon="arrowLeft">Quay lại</CommandLink>
      </CommandBar>
      <Flash sp={sp} />
      <PageTitle title="Lead mới" subtitle="Lead · Qualify" icon="lead" />
      <form id="new-lead" action={createLeadAction} className="grid max-w-5xl gap-4 px-6 pb-8">
        <MessageBar intent="info">
          Hệ thống tự chuẩn hóa email/SĐT/địa chỉ và cảnh báo nếu nghi trùng với Lead, Account hoặc Contact có sẵn. Bản ghi trùng chỉ được gắn cờ, không tự gộp.
        </MessageBar>
        <Card title="Thông tin chung">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField label="Tên công ty" required><input name="company_name" required className="input" /></FormField>
            <FormField label="Ngành"><input name="industry" className="input" placeholder="VD: Sản xuất, Phân phối…" /></FormField>
            <FormField label="Người liên hệ" required><input name="contact_name" required className="input" /></FormField>
            <FormField label="Chức danh"><input name="contact_title" className="input" /></FormField>
            <FormField label="Email"><input name="email" type="email" className="input" /></FormField>
            <FormField label="Điện thoại"><input name="phone" className="input" /></FormField>
            <FormField label="Địa chỉ" className="md:col-span-2"><input name="address" className="input" /></FormField>
            <FormField label="Nguồn">
              <select name="source" className="select" defaultValue="MANUAL">
                {Object.entries(LEAD_SOURCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormField>
            <FormField label="Người phụ trách">
              <select name="owner_id" className="select" defaultValue={user.id}>
                {owners.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </FormField>
            <FormField label="Ghi chú / nhu cầu ban đầu" className="md:col-span-2"><textarea name="notes" className="textarea" /></FormField>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" name="run_agent" defaultChecked /> Cho Sales Qualification Agent nghiên cứu nền sau khi lưu (kết quả là đề xuất chờ duyệt)
          </label>
        </Card>
        <div className="flex gap-2">
          <SubmitButton variant="primary" icon="save">Lưu</SubmitButton>
        </div>
      </form>
    </>
  );
}
