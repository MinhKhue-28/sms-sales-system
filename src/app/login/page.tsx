import type { Metadata } from "next";
import { all } from "@/lib/db";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { Icon } from "@/components/icons";
import { Persona } from "@/components/ui";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Đăng nhập" };
export const dynamic = "force-dynamic";

const ROLE_DESC: Record<Role, string> = {
  SALES: "Quản lý Lead, Opportunity, báo giá, kiểm duyệt AI",
  PRESALES: "Xây dựng Proposed Solution, xác nhận kỹ thuật",
  SALES_MANAGER: "Giám sát pipeline, duyệt chiết khấu và gate",
  FINANCE: "Phát hành hóa đơn, ghi nhận thanh toán",
  LEGAL: "Rà soát điều khoản đặc thù",
  DELIVERY: "Cấp license, triển khai, đào tạo",
  ADMIN: "Cấu hình Agent, tham số, nhật ký",
};

export default function LoginPage() {
  const users = all<{ id: number; name: string; email: string; role: Role; title: string | null }>(
    "SELECT id, name, email, role, title FROM users WHERE active = 1 ORDER BY id",
  );
  return (
    <div className="flex min-h-full items-center justify-center bg-[linear-gradient(135deg,#e8f1fb_0%,#f5f5f5_55%,#eef6ee_100%)] p-4">
      <div className="w-full max-w-[460px] bg-surface p-10 shadow-[0_2px_6px_rgba(0,0,0,0.2)]">
        <div className="mb-5 flex items-center gap-2 text-[15px] font-semibold text-ink-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-brand text-white">
            <Icon name="opportunity" size={18} />
          </span>
          SMS Sales Hub
        </div>
        <h1 className="mb-1 text-2xl font-semibold">Chọn tài khoản</h1>
        <p className="mb-5 text-sm text-ink-3">Môi trường demo đồ án — mỗi tài khoản đại diện một vai trò trong quy trình Sales.</p>
        <ul className="-mx-3">
          {users.map((u) => (
            <li key={u.id}>
              <form action={loginAction}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#f0f0f0] focus-visible:bg-[#f0f0f0]">
                  <Persona name={u.name} sub={`${ROLE_LABEL[u.role]} · ${ROLE_DESC[u.role]}`} size={40} />
                </button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-6 border-t border-stroke pt-4 text-xs text-ink-3">
          Bản triển khai thật sẽ đăng nhập qua SSO doanh nghiệp. Phiên đăng nhập được ký HMAC, quyền được kiểm tra ở server cho mọi thao tác.
        </p>
      </div>
    </div>
  );
}
