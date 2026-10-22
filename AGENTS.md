# AGENTS.md: đọc file này trước khi làm bất cứ việc gì

Dự án: **SMS – Sales Management System** cho doanh nghiệp B2B SaaS có dịch vụ triển khai, tích hợp 2 AI Agent (Sales Qualification Agent, Sales Opportunity Agent). Đồ án môn Kiến trúc Hệ thống. Nhiều AI (Claude Code, Codex, Cursor, OpenCode…) cùng code song song theo gói việc.

## Đọc theo thứ tự

1. `docs/COLLABORATION.md`: quy trình bắt đầu và kết thúc phiên, nhánh git, bàn giao, những điều cấm.
2. `docs/TASKBOARD.md`: chọn **một** gói việc (WP) đang "Sẵn sàng" hoặc đã giao cho bạn.
3. `docs/WORKPLAN.md`: phạm vi, **file bạn được sửa**, hợp đồng với WP khác, định nghĩa "xong".
4. `docs/requirements/REQUIREMENTS.md`: 100 FR + 15 NFR, **mã FR theo bản đọc 22/10/2026** (bảng đổi mã ở cuối file). Đây là đặc tả phải cài đúng; mỗi FR ghi module, WP, cổng kiểm soát, quy tắc BR liên quan.
5. `docs/requirements/BUSINESS-RULES.md`: con số cụ thể cho mọi chỗ FR ghi "theo quy tắc / cấu hình".
6. `docs/requirements/DECISIONS.md`: các quyết định đã chốt và mặc định. **Không tự đặt quyết định mới.**
7. `docs/requirements/ROLES.md`: vai trò, quyền, phạm vi dữ liệu.
8. `docs/requirements/DATA-MODEL.md`: thực thể ERD của bài ↔ bảng trong code, WP nào tạo bảng nào.
9. `docs/handoff/WP-xx.md` của WP bạn nhận: làm tiếp từ mục "Việc tiếp theo".
10. Khi làm WP-08 (AI Agent) hoặc WP-11 (kiểm thử): đọc thêm `docs/VIBECODE-GUIDE.md` mục 6 (đặc tả Agent) và mục 8 (đánh giá).

## Stack (đã chốt, không đổi)

- **Ứng dụng:** Next.js 16 App Router, React 19, TypeScript, Tailwind 4.
- **Dữ liệu:** SQLite qua `node:sqlite` (truy cập qua `src/lib/db`). Không dùng Prisma/ORM.
- **Phân tầng:** kiến trúc 3 lớp, xem mục dưới (DEC-25, NFR-12).
- **Ngoài hệ thống:**
  - Hệ thống ngoài đi qua adapter `src/lib/integrations/*`, luôn có bản giả lập (mock).
  - Mô hình AI đi qua `LlmProvider` (DEC-12). Không có API key thì `SMS_AI_MODE=mock`.
- **Lệnh:**
  - `npm run dev`
  - `npx next typegen` rồi `npx tsc --noEmit` (Next 16 sinh kiểu `PageProps`, `LayoutProps` khi typegen; bỏ bước này `tsc` báo lỗi)
  - `npx eslint .`
  - `npx next build`
  - Sau WP-00 có thêm: `npm run check`, `npm test`, `npm run test:e2e`, `npm run db:reset`, `npm run fr:coverage`.

## Kiến trúc 3 lớp

Bài chọn kiến trúc 3 lớp (NFR-12, tab *3-Layer Architecture*). Code đặt đúng lớp như sau; mỗi lớp chỉ gọi lớp ngay dưới nó.

| Lớp trong bài | Thành phần trong bài | Thư mục trong code |
|---|---|---|
| Presentation (GUI) | UI Components | `src/app/**/page.tsx`, `src/components/**` |
| | UI Process Components | `src/app/**/layout.tsx`, điều hướng `src/lib/nav.ts` (WP-00 tạo) |
| Business Logic (BLL) | Service Interface (Application Facade) | Server action `src/app/**/actions.ts` (bọc bởi `src/lib/action.ts`), Route Handler `src/app/api/**`: nhận yêu cầu, kiểm dữ liệu vào bằng zod, gọi service |
| | Business Workflows | Hàm nhiều bước trong `src/lib/services/*` (chuyển đổi Lead, chuyển giai đoạn, tạo đơn từ báo giá); runtime Agent `src/lib/agents/**` |
| | Business Components | `src/lib/services/*`: kiểm quyền (`src/lib/rbac.ts`, `src/lib/scope.ts`), quy tắc BR, ghi `audit_log` |
| | Business Entities (DTO) | Kiểu và enum dùng chung `src/lib/domain.ts`; kiểu riêng của module trong `src/lib/<module>/` |
| Data Access (DAL) | Data Access Logic Components | `src/lib/db/**` (`all`, `get`, `run`, `tx`), migration |
| | Service Agents | `src/lib/integrations/**` (email, kế toán, bản đồ, ký điện tử, cổng thanh toán…), `src/lib/llm/**` |

Cấm: trang hoặc component gọi thẳng `src/lib/db`; service gọi thẳng SDK bên ngoài mà không qua Service Agent.

## Luật cứng

- **Chỉ sửa file thuộc WP của mình.** File dùng chung (schema, rbac, domain, settings, seed) có cách đóng góp riêng, xem WORKPLAN. Cần thay đổi ở WP khác thì ghi `docs/handoff/REQUESTS.md`.
- **Đổi dữ liệu chỉ bằng migration mới** `src/lib/db/migrations/wpXX_NNN_<ten>.ts`.
- **Mọi thao tác ghi kiểm quyền ở server**, mọi đổi trạng thái ghi `audit_log`.
- **Agent chỉ đề xuất.** Agent không gửi email, không đổi trạng thái, không gộp hồ sơ, không sửa doanh thu/ngày chốt/giai đoạn/bảng giá, không tick mục kiểm soát. Quyền chặn ở tool registry, không chỉ ở prompt.
- **10 cổng kiểm soát** (HG1–HG8, duyệt hợp nhất, duyệt chuyên môn) mỗi cổng có test riêng. Duyệt chuyên môn (FR-42) là "Nên có": bật/tắt bằng `expert_review_enabled`, test cả hai trường hợp.
- **Dữ liệu theo ERD của bài** (`DATA-MODEL.md`): bảng mới đặt đúng tên ghi ở đó, không tự đặt bảng khác cho cùng thực thể.
- **Nhãn UI theo tên trong bài:** vai trò (`ROLES.md`), quy trình và giai đoạn (DEC-19).
- **Test** đặt tên bắt đầu bằng mã FR/HG. Commit bắt đầu bằng `WP-xx FR-yy:`.
- **UI tiếng Việt.** Không hard-code giá trị BR, đọc từ `settings`.
- **Không làm:** Customer Portal, Agent thứ ba, huỷ đơn hàng, đổi DB/ORM, tích hợp thật với ký điện tử hoặc cổng thanh toán (chỉ làm bản giả lập).
- **Không commit** `.env.local`, `data/*.db`, API key.
- **Kết thúc phiên:** chạy kiểm tra, cập nhật handoff + TASKBOARD + cột Hiện trạng trong REQUIREMENTS, commit, push, mở PR nếu xong.

## Deploy để test

Gộp vào `main` → CI → tự deploy lên môi trường test (xem `docs/DEPLOY.md`). Lỗi ghi vào `docs/handoff/BUGS.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
