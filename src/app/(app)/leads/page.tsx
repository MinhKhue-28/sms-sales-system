import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, LEAD_SOURCE, LEAD_STATUS } from "@/lib/domain";
import { settingNumber, users } from "@/lib/services/core";
import { listLeads } from "@/lib/services/leads";
import { SubmitButton } from "@/components/client";
import { Icon } from "@/components/icons";
import { Badge, CommandBar, CommandLink, CommandSep, Empty, Flash, Grid, PageTitle, Persona, StatusBadge, cx } from "@/components/ui";
import { bulkConvertAction } from "./actions";

export const metadata: Metadata = { title: "Leads" };

const VIEWS = [
  { key: "", label: "Lead đang mở" },
  { key: "all", label: "Tất cả Lead" },
  { key: "CONVERTED", label: "Đã chuyển đổi" },
  { key: "DISQUALIFIED", label: "Đã loại" },
];

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  await requireUser();
  const sp = (await searchParams) as { view?: string; q?: string; ok?: string; error?: string };
  const view = sp.view ?? "";
  const rows = listLeads({ status: view && view !== "all" ? view : undefined, q: sp.q }).filter((l) =>
    view === "" ? l.status === "OPEN" || l.status === "WORKING" : true,
  );
  const threshold = settingNumber("bant_threshold");
  const aes = [...users("SALES"), ...users("SALES_MANAGER")];

  return (
    <>
      <CommandBar>
        <CommandLink href="/leads/new" icon="add">Mới</CommandLink>
        <CommandLink href={`/leads?view=${view}`} icon="refresh">Làm mới</CommandLink>
        <CommandSep />
        <button type="submit" form="bulk" className="cmd">
          <Icon name="arrowRight" size={18} />
          Chuyển đổi hàng loạt
        </button>
      </CommandBar>
      <Flash sp={sp} />
      <PageTitle title="Leads" subtitle="Giai đoạn Qualify · tạo, chuẩn hóa, kiểm tra trùng, BANT" icon="lead" />

      <div className="px-6 pb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={`/leads?view=${v.key}`}
              className={cx("rounded-full border px-3 py-1 text-sm", view === v.key ? "border-brand bg-brand-tint font-semibold text-brand" : "border-stroke bg-surface hover:bg-[#f5f5f5]")}
            >
              {v.label}
            </Link>
          ))}
          {sp.q && (
            <span className="text-sm text-ink-3">
              Kết quả cho “{sp.q}” · <Link className="link" href="/leads">Xóa tìm kiếm</Link>
            </span>
          )}
        </div>

        <form id="bulk" action={bulkConvertAction} className="rounded-lg bg-surface shadow-[var(--shadow-4)]">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#f0f0f0] px-4 py-2 text-sm">
            <span className="text-ink-3">Chuyển đổi Lead đã chọn (BANT ≥ {threshold}) cho AE:</span>
            <select name="owner_id" className="select !w-56">
              {aes.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <SubmitButton size="sm" icon="arrowRight">Chuyển đổi</SubmitButton>
            <span className="ml-auto text-xs text-ink-3">{rows.length} bản ghi</span>
          </div>
          {rows.length ? (
            <Grid>
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th>Công ty</th>
                  <th>Người liên hệ</th>
                  <th>Nguồn</th>
                  <th>BANT</th>
                  <th>Trạng thái</th>
                  <th>Phụ trách</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {(l.status === "OPEN" || l.status === "WORKING") && <input type="checkbox" name="ids" value={l.id} aria-label={`Chọn ${l.company_name}`} />}
                    </td>
                    <td>
                      <Link className="link font-semibold" href={`/leads/${l.id}`}>{l.company_name}</Link>
                      {!!l.duplicate_flag && <span className="ml-2"><Badge tone="warning">Có thể trùng</Badge></span>}
                    </td>
                    <td>
                      {l.contact_name}
                      <span className="block text-xs text-ink-3">{l.contact_title ?? l.email ?? ""}</span>
                    </td>
                    <td>{LEAD_SOURCE[l.source] ?? l.source}</td>
                    <td>
                      <span className={cx("font-semibold tabular-nums", l.bant_score >= threshold ? "text-success" : "text-ink-2")}>{l.bant_score}</span>
                      <span className="text-ink-3">/100</span>
                    </td>
                    <td><StatusBadge status={l.status} labels={LEAD_STATUS} /></td>
                    <td><Persona name={l.owner_name} size={24} /></td>
                    <td className="text-ink-3">{formatDate(l.updated_at, true)}</td>
                  </tr>
                ))}
              </tbody>
            </Grid>
          ) : (
            <Empty icon="lead">Không có Lead trong dạng xem này</Empty>
          )}
        </form>
      </div>
    </>
  );
}
