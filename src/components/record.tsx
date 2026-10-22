// Khối dùng chung trên trang chi tiết bản ghi: dòng thời gian, nhật ký audit, lịch sử chạy Agent.
import Link from "next/link";
import { formatDate, SUGGESTION_KIND } from "@/lib/domain";
import type { Suggestion } from "@/lib/services/ai-review";
import { Icon, type IconName } from "./icons";
import { Badge, Card, Empty, StatusBadge } from "./ui";

export const SALES_STAGES = [
  { key: "QUALIFY", label: "Qualify", sub: "Lead · BANT" },
  { key: "DEVELOP", label: "Develop", sub: "Nhu cầu · Giải pháp" },
  { key: "PROPOSE", label: "Propose", sub: "Báo giá · Duyệt" },
  { key: "CLOSE", label: "Close", sub: "Order · Won/Lost" },
  { key: "FULFILL", label: "Fulfill", sub: "Triển khai · Hóa đơn" },
];

const ACT_ICON: Record<string, IconName> = { NOTE: "edit", CALL: "person", EMAIL: "mail", MEETING: "calendar" };
const ACT_LABEL: Record<string, string> = { NOTE: "Ghi chú", CALL: "Cuộc gọi", EMAIL: "Email", MEETING: "Cuộc họp" };

export function Timeline({
  items,
}: {
  items: { id: number; type: string; direction: string | null; subject: string; body: string | null; occurred_at: string; source: string; created_by_name: string | null }[];
}) {
  if (!items.length) return <Empty icon="history">Chưa có hoạt động</Empty>;
  return (
    <ol className="relative ml-3 border-l border-stroke">
      {items.map((a) => (
        <li key={a.id} className="mb-4 ml-5">
          <span className="absolute -left-3.5 flex h-7 w-7 items-center justify-center rounded-full border border-stroke bg-surface text-brand">
            <Icon name={ACT_ICON[a.type] ?? "edit"} size={14} />
          </span>
          <div className="text-sm">
            <span className="font-semibold">{a.subject}</span>
            <span className="ml-2 text-xs text-ink-3">
              {ACT_LABEL[a.type]}
              {a.direction === "IN" ? " · đến" : a.direction === "OUT" ? " · đi" : ""} · {a.created_by_name ?? (a.source === "INTEGRATION" ? "Tích hợp" : "Hệ thống")} · {formatDate(a.occurred_at, true)}
            </span>
          </div>
          {a.body && <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{a.body}</p>}
        </li>
      ))}
    </ol>
  );
}

export function AuditTrail({
  rows,
}: {
  rows: { id: number; action: string; from_status: string | null; to_status: string | null; actor_type: string; actor_label: string; reason: string | null; created_at: string }[];
}) {
  return (
    <Card title="Nhật ký thay đổi (audit)" pad={false}>
      {rows.length ? (
        <table className="grid-table">
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Hành động</th>
              <th>Trạng thái</th>
              <th>Người thực hiện</th>
              <th>Lý do</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap text-ink-3">{formatDate(r.created_at, true)}</td>
                <td className="font-mono text-xs">{r.action}</td>
                <td className="whitespace-nowrap text-xs">{r.from_status || r.to_status ? `${r.from_status ?? "—"} → ${r.to_status ?? "—"}` : ""}</td>
                <td>
                  {r.actor_type === "AI" ? <Badge tone="purple">{r.actor_label}</Badge> : r.actor_label}
                </td>
                <td className="text-ink-2">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty>Chưa có nhật ký</Empty>
      )}
    </Card>
  );
}

type RunRow = { id: number; agent: string; trigger: string; model: string; status: string; tool_calls_json: string; summary: string | null; error: string | null; triggered_by_name: string | null; started_at: string };

export function AgentRuns({ runs }: { runs: RunRow[] }) {
  return (
    <Card title="Lịch sử chạy Agent (AI action log)" pad={false}>
      {runs.length ? (
        <ul>
          {runs.map((r) => {
            const calls = JSON.parse(r.tool_calls_json) as { tool: string; ok: boolean; error?: string }[];
            return (
              <li key={r.id} className="border-b border-[#f0f0f0] px-4 py-3 last:border-0">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Icon name="bot" size={16} className="text-[#5c2e91]" />
                  <span className="font-semibold">Run #{r.id}</span>
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-ink-3">
                    {r.trigger} · {r.model} · {r.triggered_by_name ?? "tự động"} · {formatDate(r.started_at, true)}
                  </span>
                </div>
                {(r.summary || r.error) && <p className="mt-1 text-sm text-ink-2">{r.error ?? r.summary}</p>}
                <div className="mt-2 flex flex-wrap gap-1">
                  {calls.map((c, i) => (
                    <span
                      key={i}
                      title={c.error}
                      className={`rounded border px-1.5 py-0.5 font-mono text-[11px] ${c.ok ? "border-stroke bg-[#fafafa] text-ink-2" : "border-[#eeacb2] bg-[#fdf3f4] text-[#b10e1c]"}`}
                    >
                      {c.tool}
                      {!c.ok && " ✕"}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty icon="bot">Agent chưa chạy cho bản ghi này</Empty>
      )}
    </Card>
  );
}

export function SuggestionSummary({ items }: { items: Suggestion[] }) {
  if (!items.length) return <Empty icon="sparkle">Không có đề xuất</Empty>;
  return (
    <ul>
      {items.map((s) => (
        <li key={s.id} className="flex items-center gap-2 border-b border-[#f0f0f0] px-4 py-2 text-sm last:border-0">
          <Icon name="sparkle" size={16} className="text-[#5c2e91]" />
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{SUGGESTION_KIND[s.kind]}</span> — {s.title}
            <span className="block text-xs text-ink-3">
              {formatDate(s.created_at, true)}
              {s.reviewed_by_name && ` · xử lý bởi ${s.reviewed_by_name}`}
              {s.review_note && ` · ${s.review_note}`}
            </span>
          </span>
          <StatusBadge status={s.status} labels={{ PENDING_REVIEW: "Chờ duyệt", APPROVED: "Đã duyệt", REJECTED: "Từ chối" }} />
          {s.status === "PENDING_REVIEW" && (
            <Link className="link text-xs" href={`/ai-review#s${s.id}`}>Xử lý</Link>
          )}
        </li>
      ))}
    </ul>
  );
}
