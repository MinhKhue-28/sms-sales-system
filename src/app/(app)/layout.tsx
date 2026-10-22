import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { get } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/domain";
import { unreadCount } from "@/lib/services/admin";
import { NavLink } from "@/components/client";
import { Icon } from "@/components/icons";
import { Persona } from "@/components/ui";
import { logoutAction } from "../login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const unread = unreadCount(user.id);
  const pendingApprovals =
    user.role === "SALES_MANAGER" || user.role === "LEGAL"
      ? (get<{ n: number }>(
          "SELECT COUNT(*) AS n FROM approvals WHERE status='PENDING' AND kind IN (" + (user.role === "LEGAL" ? "'LEGAL_REVIEW'" : "'QUOTE_DISCOUNT','OPP_STAGE_GATE'") + ")",
        )?.n ?? 0)
      : 0;
  const pendingAi = get<{ n: number }>(
    "SELECT (SELECT COUNT(*) FROM ai_suggestions WHERE status='PENDING_REVIEW') + (SELECT COUNT(*) FROM opportunity_research WHERE status='PENDING_REVIEW') AS n",
  )?.n ?? 0;

  return (
    <div className="flex h-full flex-col">
      {/* App header (kiểu Microsoft 365 / Dynamics 365) */}
      <header className="flex h-12 shrink-0 items-center gap-2 bg-[var(--header)] px-2 text-white">
        <span className="flex h-12 w-12 items-center justify-center" aria-hidden="true">
          <Icon name="waffle" size={20} />
        </span>
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[15px] font-semibold">
          SMS <span className="font-normal opacity-80">|</span> <span className="font-normal">Sales Hub</span>
        </Link>
        <form action="/leads" className="mx-auto hidden w-full max-w-md md:block">
          <label className="flex h-8 items-center gap-2 rounded-[4px] bg-white/95 px-3 text-ink">
            <Icon name="search" size={16} className="text-ink-3" />
            <input name="q" placeholder="Tìm Lead theo công ty, người liên hệ, email" className="w-full bg-transparent text-sm outline-none placeholder:text-ink-3" />
          </label>
        </form>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/" className="relative flex h-10 w-10 items-center justify-center rounded hover:bg-white/15" title="Thông báo">
            <Icon name="bell" size={20} />
            {unread > 0 && (
              <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-[#c50f1f] px-1 text-center text-[10px] font-semibold leading-4">{unread}</span>
            )}
          </Link>
          <div className="hidden text-right text-xs leading-4 sm:block">
            <div className="font-semibold">{user.name}</div>
            <div className="opacity-80">{ROLE_LABEL[user.role]}</div>
          </div>
          <form action={logoutAction}>
            <button className="flex h-10 items-center gap-1 rounded px-2 hover:bg-white/15" title="Đổi tài khoản / Đăng xuất">
              <Icon name="signOut" size={18} />
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Site map (left navigation) */}
        <nav className="hidden w-[232px] shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-stroke bg-surface-2 px-2 py-3 md:flex">
          <NavLink href="/" icon="home">Trang chủ</NavLink>
          <NavGroup>Của tôi</NavGroup>
          <NavLink href="/ai-review" icon="sparkle" badge={pendingAi}>Kiểm duyệt AI</NavLink>
          <NavLink href="/approvals" icon="approval" badge={pendingApprovals}>Phê duyệt</NavLink>
          <NavGroup>Bán hàng</NavGroup>
          <NavLink href="/leads" icon="lead">Leads</NavLink>
          <NavLink href="/opportunities" icon="opportunity">Opportunities</NavLink>
          <NavLink href="/accounts" icon="account">Accounts</NavLink>
          <NavGroup>Thực hiện & thu tiền</NavGroup>
          <NavLink href="/orders" icon="order">Orders</NavLink>
          <NavLink href="/invoices" icon="invoice">Invoices</NavLink>
          <NavGroup>Danh mục</NavGroup>
          <NavLink href="/products" icon="product">Sản phẩm & bảng giá</NavLink>
          <NavGroup>Hệ thống</NavGroup>
          <NavLink href="/admin" icon="settings">Quản trị</NavLink>
          <div className="mt-auto px-3 pt-4">
            <Persona name={user.name} sub={user.title ?? ROLE_LABEL[user.role]} size={28} />
          </div>
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

function NavGroup({ children }: { children: React.ReactNode }) {
  return <div className="px-3 pb-1 pt-4 text-xs font-semibold text-ink-3">{children}</div>;
}
