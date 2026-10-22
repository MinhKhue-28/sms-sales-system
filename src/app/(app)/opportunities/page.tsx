import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate, formatVnd, LEVEL, OPP_STAGE } from "@/lib/domain";
import { listOpportunities } from "@/lib/services/opportunities";
import { Icon } from "@/components/icons";
import { CommandBar, CommandLink, CommandSep, Empty, Flash, Grid, PageTitle, Persona, StatusBadge, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Opportunities" };

const COLUMNS = ["DEVELOP", "PROPOSE", "CLOSE"] as const;

export default async function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  await requireUser();
  const sp = (await searchParams) as { view?: string; stage?: string; ok?: string; error?: string };
  const view = sp.stage ? "list" : (sp.view ?? "board");
  const rows = listOpportunities({ stage: sp.stage });

  return (
    <>
      <CommandBar>
        <CommandLink href="/leads" icon="lead">Tạo từ Lead</CommandLink>
        <CommandSep />
        <CommandLink href="/opportunities?view=board" icon="waffle">Dạng bảng Kanban</CommandLink>
        <CommandLink href="/opportunities?view=list" icon="filter">Dạng danh sách</CommandLink>
      </CommandBar>
      <Flash sp={sp} />
      <PageTitle
        title="Opportunities"
        subtitle={sp.stage ? `Lọc theo giai đoạn: ${OPP_STAGE[sp.stage]} · ` + `${rows.length} bản ghi` : "Develop → Propose → Close · Opportunity được tạo khi chuyển đổi Lead"}
        icon="opportunity"
      />

      {view === "board" ? (
        <div className="grid grid-cols-1 gap-4 px-6 pb-8 lg:grid-cols-3">
          {COLUMNS.map((stage) => {
            const items = rows.filter((o) => o.stage === stage);
            const total = items.reduce((s, o) => s + o.amount, 0);
            return (
              <section key={stage} className="rounded-lg bg-[#ebebeb]/60 p-2">
                <header className="flex items-center justify-between px-2 py-1.5">
                  <span className="font-semibold">
                    {OPP_STAGE[stage]} <span className="font-normal text-ink-3">({items.length})</span>
                  </span>
                  <span className="text-sm text-ink-2">{formatVnd(total)}</span>
                </header>
                <div className="space-y-2">
                  {items.map((o) => (
                    <Link key={o.id} href={`/opportunities/${o.id}`} className="block rounded-md bg-surface p-3 shadow-[var(--shadow-2)] hover:shadow-[var(--shadow-16)]">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-brand">{o.name}</span>
                        {o.importance && <StatusBadge status={o.importance} labels={LEVEL} />}
                      </div>
                      <div className="mt-0.5 text-sm text-ink-2">{o.account_name}</div>
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="font-semibold tabular-nums">{formatVnd(o.amount)}</span>
                        <span className="flex items-center gap-1 text-xs text-ink-3">
                          <Icon name="calendar" size={14} /> {formatDate(o.close_date)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-[#f0f0f0] pt-2 text-xs">
                        <Persona name={o.owner_name} size={20} />
                        {stage === "DEVELOP" && (
                          <span className="text-ink-3">
                            Checklist {[o.need_confirmed, o.solution_confirmed, o.stakeholders_confirmed, o.competitors_confirmed].filter(Boolean).length}/4
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                  {!items.length && <div className="px-2 py-6 text-center text-sm text-ink-3">Trống</div>}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="px-6 pb-8">
          <div className="rounded-lg bg-surface shadow-[var(--shadow-4)]">
            {rows.length ? (
              <Grid>
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Tên</th>
                    <th>Account</th>
                    <th>Giai đoạn</th>
                    <th className="text-right">Giá trị</th>
                    <th>Ngày chốt dự kiến</th>
                    <th>Mức quan trọng</th>
                    <th>AE</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.code}</td>
                      <td><Link className="link font-semibold" href={`/opportunities/${o.id}`}>{o.name}</Link></td>
                      <td>{o.account_name}</td>
                      <td><StatusBadge status={o.stage} labels={OPP_STAGE} /></td>
                      <td className={cx("text-right tabular-nums")}>{formatVnd(o.amount)}</td>
                      <td>{formatDate(o.close_date)}</td>
                      <td><StatusBadge status={o.importance} labels={LEVEL} /></td>
                      <td><Persona name={o.owner_name} size={24} /></td>
                    </tr>
                  ))}
                </tbody>
              </Grid>
            ) : (
              <Empty icon="opportunity">Không có Opportunity</Empty>
            )}
          </div>
        </div>
      )}
    </>
  );
}
