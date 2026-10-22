# Kế hoạch chia việc cho nhiều AI

100 FR được chia thành **12 gói việc (WP)**. Mỗi WP có **thư mục và file riêng**, nên nhiều AI (Claude Code, Codex, Cursor, OpenCode…) code song song được mà không đè lên nhau. Quy trình nhận việc, bàn giao và gộp code nằm ở `docs/COLLABORATION.md`.

Mã FR theo bản đọc ngày 22/10/2026. Bảng và cột dữ liệu mỗi WP tạo hoặc sửa nằm ở `docs/requirements/DATA-MODEL.md` (cột *WP*).

## Module trong bài ↔ gói việc

| Module (mục 2.3.1) | Chức năng cấp 2 | WP |
|---|---|---|
| 1.0 Quản lý khách hàng | 1.1 Khách hàng tiềm năng · 1.2 Tài khoản và liên hệ · 1.3 Trùng lặp và lịch sử | WP-01 (phần Agent: WP-08) |
| 2.0 Sản phẩm, dịch vụ và bảng giá | 2.1 Danh mục · 2.2 Gói và license · 2.3 Bảng giá, chiết khấu | WP-02 |
| 3.0 Quản lý cơ hội bán hàng | 3.1 Sàng lọc và đánh giá · 3.2 Phát triển cơ hội | WP-03 (phần Agent: WP-08) |
| | 3.3 Đề xuất giải pháp và báo giá | WP-04 |
| 4.0 Quản lý đơn hàng | 4.1 Chuyển đổi đơn · 4.2 Cấu hình, xác nhận giá · 4.3 Thực hiện đơn | WP-05 |
| 5.0 Theo dõi hóa đơn và thanh toán | 5.1 Lập, theo dõi hoá đơn · 5.2 Thanh toán, công nợ · 5.3 Ngoại lệ, lưu trữ | WP-06 |
| 6.0 Quản lý đội ngũ Sales | 6.1 Hồ sơ nhân viên · 6.2 Sale Pod · 6.3 Phân công · 6.4 Chỉ tiêu, hiệu suất | WP-07 |
| 7.0 AI Agent và quản trị hệ thống | 7.1 Quản trị AI Agent · 7.3 Hiệu suất AI | WP-08 |
| | 7.2 Người dùng, phân quyền · 7.3 Báo cáo phễu, audit log | WP-09 |
| (hạ tầng) | Hệ thống ngoài trên sơ đồ ngữ cảnh | WP-10 |

## Thứ tự (các đợt)

```
Đợt 0 (tuần tự, 1 AI):    WP-00 Nền móng và hợp đồng chung
Đợt 1 (song song):        WP-01 Khách hàng · WP-02 Sản phẩm/giá · WP-07 Đội ngũ · WP-09 Quản trị · WP-10 Tích hợp
Đợt 2 (song song):        WP-03 Qualify + Develop · WP-08 AI Agent
Đợt 3:                    WP-04 Propose
Đợt 4:                    WP-05 Đơn hàng
Đợt 5:                    WP-06 Hoá đơn
Liên tục từ đợt 1:        WP-11 Kiểm thử và đánh giá
```

Có thể bắt đầu một WP trước khi WP nó phụ thuộc xong, **nếu chỉ dùng hợp đồng (type, service function, bảng) đã có trong `main`**. Không gọi hàm chưa tồn tại; nếu cần thì ghi vào `docs/handoff/REQUESTS.md`.

## Quy tắc sở hữu file (quan trọng nhất)

- Mỗi WP chỉ sửa file trong cột **"Sở hữu"** của mình.
- **File dùng chung** chỉ WP-00 được sửa cấu trúc. Các WP khác chỉ **thêm vào** đúng chỗ dành sẵn:

| File dùng chung | Cách các WP khác đóng góp |
|---|---|
| `src/lib/db/schema.ts` | **Không sửa.** Thêm bảng hoặc cột bằng file migration riêng `src/lib/db/migrations/wpXX_NNN_ten.ts` (WP-00 dựng bộ chạy migration). |
| `src/lib/rbac.ts` | **Không sửa.** Permission key đã được WP-00 khai báo đủ theo `docs/requirements/ROLES.md`. Thiếu key thì ghi REQUESTS. |
| `src/lib/settings-defaults.ts` | **Không sửa.** WP-00 khai báo đủ khoá từ `BUSINESS-RULES.md`. |
| `src/lib/domain.ts` | **Không sửa.** WP-00 khai báo máy trạng thái và enum dùng chung. Hằng số riêng của module đặt trong `src/lib/<module>/constants.ts` của WP đó. |
| `src/lib/nav.ts` (menu) | Thêm **một dòng** mục menu của WP mình, không đổi thứ tự dòng khác. |
| `src/components/ui.tsx`, `client.tsx`, `record.tsx` | Chỉ dùng. Cần component mới thì đặt trong `src/components/<module>/`. |
| `src/lib/db/seed.ts` | **Không sửa.** Seed riêng của WP đặt trong `src/lib/db/seeds/wpXX.ts`; WP-00 gọi tất cả. |

## Danh sách gói việc

### WP-00 · Nền móng và hợp đồng chung (làm trước, 1 AI)

- **FR:** không trực tiếp; mở đường cho tất cả. NFR-05, NFR-12.
- **Sở hữu:** `package.json`, cấu hình test, `src/lib/db/index.ts`, `src/lib/db/migrations/` (bộ chạy), `src/lib/db/seeds/index.ts`, `src/lib/rbac.ts`, `src/lib/domain.ts`, `src/lib/settings-defaults.ts`, `src/lib/nav.ts`, `src/lib/scope.ts`, `src/app/(app)/layout.tsx`, `scripts/`, `.github/`, `Dockerfile`.
- **Việc:**
  1. `git init`, commit đầu tiên; kiểm `.gitignore` đã loại `.env*` (trừ `.env.example`) và `data/`.
  2. Thêm script: `typecheck`, `test` (Vitest, DB `:memory:`, `SMS_AI_MODE=mock`), `test:e2e` (Playwright), `db:reset`, `check` (= typecheck + lint + test), `fr:coverage` (in ra FR nào đã có test mang mã FR).
  3. Bộ chạy migration: bảng `schema_migrations`, chạy các file trong `src/lib/db/migrations/` theo tên, mỗi file chạy một lần, có test.
  4. Cập nhật `Role` thêm `PRESALES_MANAGER`, `AI_MANAGER`; khai báo **toàn bộ** permission key theo `ROLES.md`; hàm `requirePermission`, `canSee(scope, record)`.
  5. Khai báo **toàn bộ** setting key theo `BUSINESS-RULES.md`.
  5b. Trong `src/lib/domain.ts`: nhãn UI của vai trò (ROLES.md) và của quy trình, giai đoạn (DEC-19).
  5c. Migration `wp00_*` cho bảng dùng chung nhiều WP: `documents`, `document_links` (tài liệu có phiên bản) và cột `users.employee_id`, `users.password_hash`, `users.status`.
  5d. Script `typecheck` = `next typegen && tsc --noEmit` (Next 16 sinh kiểu `PageProps`, `LayoutProps`; thiếu bước này `tsc` báo lỗi).
  6. `src/lib/nav.ts` cho menu; layout đọc menu theo quyền.
  7. Đăng nhập bằng email + mật khẩu (DEC-14, FR-97 phần đăng nhập); seed tài khoản demo cho mỗi vai trò, mật khẩu demo ghi trong `README.md`.
  8. `/api/health`. Kiểm `npm run build` chạy với `SMS_DB_PATH=:memory:`.
  9. Cập nhật cột *Hiện trạng* trong `docs/requirements/REQUIREMENTS.md` sau khi kiểm thực tế.
- **Xong khi:** `npm run check` và `npm run build` qua; CI xanh; mọi WP khác có đủ permission key, setting key, bộ chạy migration để bắt đầu.

### WP-01 · Quản lý khách hàng (FR-01 → FR-05, FR-07 → FR-18)

- **Sở hữu:** `src/app/(app)/leads/**` (trừ panel Qualify), `src/app/(app)/accounts/**`, `src/app/(app)/contacts/**`, `src/lib/services/leads.ts` (phần CRUD), `src/lib/services/accounts.ts`, `src/lib/services/contacts.ts`, `src/lib/services/dedupe.ts`, `src/lib/services/interactions.ts`, `src/components/customers/**`, migrations `wp01_*`, seed `wp01`.
- **Việc chính:**
  - Tạo, xem, sửa Lead; tự điền khi chọn Account/Contact.
  - Tiếp nhận từ biểu mẫu (dùng route của WP-10) và nhập tệp CSV/Excel có xem trước.
  - Xoá mềm (trạng thái Đã xoá).
  - Tìm kiếm, lọc.
  - Hiển thị mức phân loại (BR-02).
  - Gắn nhãn, phân nhóm (`tags`, `lead_tags`).
  - Account và Contact: CRUD đầy đủ; lịch sử liên kết người liên hệ – doanh nghiệp (`affiliations`, DEC-21).
  - Chuẩn hoá địa chỉ.
  - Kiểm tra trùng (BR-21); đề nghị và duyệt hợp nhất (DEC-04).
  - Dòng thời gian tương tác.
- **Hợp đồng cho WP khác:**
  - Trang chi tiết Lead chừa **slot** `<QualificationPanel leadId={…} />`, do WP-03 cung cấp từ `src/components/qualify/`.
  - Xuất các hàm `findDuplicates()`, `findOrCreateAccount()`, `findOrCreateContact()` cho WP-03 dùng khi chuyển đổi.
  - Nhập tệp xong thì phát sự kiện `lead.imported`, qua `src/lib/events.ts` do WP-00 cung cấp. Đây là sự kiện kích hoạt Agent.
- **Phụ thuộc:** WP-00.

### WP-02 · Sản phẩm, dịch vụ và bảng giá (FR-21 → FR-29)

- **Sở hữu:** `src/app/(app)/catalog/**`, `src/lib/services/catalog.ts`, `src/lib/services/pricing.ts`, `src/components/catalog/**`, migrations `wp02_*`, seed `wp02`.
- **Việc chính:**
  - Sản phẩm, dịch vụ: tạo, sửa, ngừng kinh doanh.
  - Mô-đun SaaS; gói thuê bao kèm tính năng và tùy chọn.
  - Chính sách quyền sử dụng (license).
  - Bảng giá có loại tiền, hiệu lực, thuế (BR-22); giá theo nhóm khách hàng (BR-03).
  - Chính sách chiết khấu và hạn mức duyệt (BR-05).
  - Trang tra cứu giá.
- **Hợp đồng cho WP khác:**
  - `getApplicablePriceList(accountId, date)`
  - `priceFor(productId, priceListId)`
  - `checkDiscount(lines)` → `{ ok, needsApproval, violations[] }`
  - `validatePackageConfig(lines)` (dùng cho FR-50)
- **Phụ thuộc:** WP-00.

### WP-03 · Đánh giá khách hàng và Phát triển cơ hội (FR-30, FR-31, FR-33 → FR-35, FR-37 → FR-43, FR-45 → FR-47)

- **Sở hữu:** `src/components/qualify/**`, `src/lib/services/qualification.ts`, `src/app/(app)/opportunities/**`, `src/lib/services/opportunities.ts`, `src/lib/services/risks.ts`, `src/components/opportunity/**`, migrations `wp03_*`.
- **Việc chính:**
  - Khảo sát sơ bộ, chấm BANT (BR-01).
  - Chuyển đổi đơn lẻ và hàng loạt (HG3). Loại và tái kích hoạt (HG2).
  - Thông tin chung cơ hội.
  - Nhu cầu chi tiết và biên bản phạm vi (Nháp / Đã gửi / Đã xác nhận).
  - Cấu hình dự kiến, tính lại doanh thu. Bản đồ bên liên quan (BR-19). Đối thủ.
  - Biên bản phạm vi và hồ sơ giải pháp nội bộ trong bảng `solutions` (type, version); rà soát chuyên môn tùy chọn (FR-42 "Nên có", BR-07).
  - Lịch sử chuyển giai đoạn (`opportunity_stage_history`); kết quả đánh giá do NVKD xác nhận (`lead_assessments`).
  - Xử lý rủi ro với 3 trạng thái Đã xử lý / Hoàn thành / Bỏ qua kèm lý do (HG5).
  - Rà soát của QLKD (HG6, BR-06). 4 mục kiểm soát và chuyển giai đoạn.
  - Đóng và mở lại cơ hội (BR-17). Kanban cơ hội.
- **Hợp đồng cho WP khác:**
  - Panel Qualify cắm vào slot của WP-01.
  - `getOpportunityForQuote(oppId)` cho WP-04.
  - Sự kiện `opportunity.converted` và `opportunity.key_field_changed` để kích hoạt Agent (WP-08).
- **Phụ thuộc:** WP-01 (hợp đồng chuyển đổi), WP-02 (giá, cấu hình).

### WP-04 · Đề xuất giải pháp và báo giá (FR-48 → FR-55)

- **Sở hữu:** `src/app/(app)/quotes/**`, `src/lib/services/quotes.ts`, `src/lib/services/proposals.ts`, `src/lib/pdf/**`, `src/components/quote/**`, migrations `wp04_*`.
- **Việc chính:**
  - Proposal gửi khách (khác hồ sơ giải pháp nội bộ).
  - Báo giá nháp; kiểm cấu hình qua `validatePackageConfig`.
  - Trình và duyệt chiết khấu (HG7).
  - Xuất PDF và gửi email qua adapter email; báo giá đã gửi bị khoá.
  - Hiệu lực (BR-09) và tra cứu báo giá.
  - Báo giá có phiên bản (`quotes` + `quote_versions`, DEC-22): bản đã gửi không sửa, điều chỉnh tạo phiên bản mới.
  - Phản hồi khách hàng gắn đúng phiên bản (`quote_responses`). Ký điện tử dạng giả lập (Nên có).
- **Hợp đồng:** `getAcceptedQuoteVersion(quoteVersionId)` cho WP-05.
- **Phụ thuộc:** WP-02, WP-03.

### WP-05 · Đơn hàng (FR-56 → FR-63)

- **Sở hữu:** `src/app/(app)/orders/**`, `src/lib/services/orders.ts`, `src/components/order/**`, migrations `wp05_*`.
- **Việc chính:**
  - Tạo đơn từ báo giá đã chấp thuận, đúng cửa sổ thời gian (BR-09).
  - Đơn thủ công (BR-10). Tra cứu đơn.
  - Điều khoản thanh toán và bàn giao (BR-11). Xác nhận và khoá giá.
  - Đợt thanh toán (`billing_milestones`). Một phiên bản báo giá tạo tối đa một đơn (DEC-23).
  - Theo dõi tiến độ triển khai; hồ sơ bàn giao kỹ thuật và kết quả (`handovers`, `handover_items` thay `fulfillment_tasks`; DEC-10).
  - Hoàn thành đơn và chuyển hồ sơ sang bộ phận sau bán.
- **Hợp đồng:** `getOrderForInvoice(orderId)`, lịch thanh toán của đơn cho WP-06.
- **Phụ thuộc:** WP-04.

### WP-06 · Hoá đơn và thanh toán (FR-64 → FR-74)

- **Sở hữu:** `src/app/(app)/invoices/**`, `src/lib/services/invoices.ts`, `src/lib/services/payments.ts`, `src/components/invoice/**`, migrations `wp06_*`.
- **Việc chính:**
  - Lập hoá đơn nháp từ đơn (BR-12). Lịch lập hoá đơn. Kiểm tra bản nháp (DEC-09).
  - Phát hành qua ERP và gửi khách (DEC-08, HG8). Tra cứu trạng thái.
  - Ghi nhận và đối soát thanh toán: `payments` theo doanh nghiệp, phân bổ vào hoá đơn qua `payment_allocations` (DEC-23). Cổng thanh toán dạng giả lập qua `payment_requests` (Tùy chọn).
  - Công nợ và nhắc quá hạn (BR-13). Đồng bộ ERP.
  - Đề nghị và theo dõi điều chỉnh. Lịch sử hoá đơn.
- **Lưu ý:** FR-69 xử lý chênh lệch đối soát; FR-72 chỉ gửi/nhận dữ liệu và hiện lỗi đồng bộ (`sync_events` của WP-10). **Không cài logic hạch toán của hệ thống kế toán vào SMS.**
- **Phụ thuộc:** WP-05, adapter ERP của WP-10.

### WP-07 · Đội ngũ Sales (FR-75 → FR-87)

- **Sở hữu:** `src/app/(app)/team/**`, `src/lib/services/team.ts`, `src/lib/services/assignments.ts`, `src/lib/services/work-items.ts`, `src/lib/services/targets.ts`, `src/components/team/**`, migrations `wp07_*`, seed `wp07`.
- **Việc chính:**
  - Hồ sơ nhân viên (tách khỏi tài khoản đăng nhập). Chức danh, vai trò nghiệp vụ. Trạng thái làm việc.
  - Sale Pod: trưởng nhóm, thành viên, phạm vi phụ trách.
  - Phân bổ lần đầu; điều phối, bàn giao.
  - Việc và lịch hẹn, kể cả mời tư vấn vào cơ hội.
  - Chỉ tiêu, KPI (BR-14), đánh giá hiệu suất.
- **Dữ liệu:** `employees` (tách khỏi `users`), `teams`, `team_members`, `assignments`, `work_participants`, `sales_targets`, `performance_reviews`; mở rộng `tasks` thành công việc và lịch hẹn (WORK_ITEM).
- **Hợp đồng:** bảng `teams`, `team_members`, cột `owner_id`, `team_id` cho WP-00 dùng trong `scope.ts`. `createWorkItem()` cho WP-03, WP-08 tạo việc.
- **Phụ thuộc:** WP-00.

### WP-08 · AI Agent (FR-06, FR-19, FR-20, FR-32, FR-36, FR-44, FR-88 → FR-95)

Bài đã chuyển 6 FR có Agent vào bảng nghiệp vụ (khách hàng, cơ hội), nhưng phần cài vẫn thuộc WP-08 vì dùng chung runtime Agent. UI của các FR này cắm vào slot do WP-01, WP-03 chừa sẵn.

- **Sở hữu:** `src/lib/agents/**`, `src/lib/llm/**` (interface `LlmProvider`, DEC-12), `src/app/(app)/ai/**`, `src/app/api/cron/**`, `src/lib/services/ai-review.ts`, `src/lib/services/ai-admin.ts`, `src/components/ai/**`, migrations `wp08_*`.
- **Việc chính:**
  - Cấu hình nghiệp vụ 2 Agent (QLKD): bật/tắt, chế độ, TCP, tiêu chí, lịch (BR-15).
  - Giám sát lần chạy, phản hồi chất lượng (`ai_feedback`).
  - Cấu hình kỹ thuật (AI_MANAGER): hướng dẫn (prompt), model, ngân sách (BR-16) trong `agent_configs` có phiên bản; công cụ trong `tools`, `tool_grants`; mỗi lần gọi công cụ ghi `tool_calls`; căn cứ ghi `ai_evidence` (DEC-24, DATA-MODEL).
  - Nghiên cứu Lead. Đề xuất đánh giá: không tạo luồng loại thứ hai.
  - Soạn, duyệt, gửi email (HG1). Đọc phản hồi.
  - Bản nghiên cứu cơ hội và xác minh (HG4). Rủi ro, hành động, danh sách ưu tiên.
  - Giới hạn căn cứ và quyền ghi. Công cụ và nguồn dữ liệu. Chạy lại lần lỗi. Báo cáo hiệu quả.
- **Bắt buộc:**
  - Quyền của Agent nằm ở tool registry, không chỉ ở prompt.
  - Dữ liệu bên ngoài phải bọc `untrusted_data`.
  - Có chế độ `mock` cho test và demo.
  - Adapter **OpenAI** là mặc định (DEC-12); chuyển code Claude hiện có trong `src/lib/agents/runtime.ts` về sau interface `LlmProvider`.
  - Thiết kế chi tiết: `docs/VIBECODE-GUIDE.md` mục 6, đánh giá ở mục 8.
- **Phụ thuộc:** WP-01, WP-03 (sự kiện, hàm), WP-07 (`createWorkItem`).

### WP-09 · Quản trị hệ thống (FR-96 → FR-100)

- **Sở hữu:** `src/app/(app)/admin/**`, `src/app/(app)/reports/**`, `src/lib/services/admin.ts`, `src/lib/services/reports.ts`, `src/lib/services/audit-view.ts`, `src/components/admin/**`, migrations `wp09_*`.
- **Việc chính:**
  - Tài khoản: tạo, sửa, khoá, liên kết hồ sơ nhân viên. Đặt lại mật khẩu.
  - Ma trận quyền và phạm vi dữ liệu (chỉ xem và gán vai trò; key do WP-00 khai báo).
  - Báo cáo phễu và dự báo (BR-14).
  - Tra cứu nhật ký.
- **Phụ thuộc:** WP-00, WP-07 (`teams`).

### WP-10 · Tích hợp, dữ liệu mẫu và triển khai

- **Sở hữu:** `src/lib/integrations/**`, `src/app/api/integrations/**`, `docs/DEPLOY.md`, `docs/integration.md`.
- **Việc chính:**
  - Adapter cho các hệ thống ngoài trên sơ đồ System Context (E01–E08): biểu mẫu web, kế toán, email, cuộc họp, LLM (giao WP-08), bản đồ, cổng thanh toán, ký điện tử.
  - Mỗi adapter có bản giả lập (mock) và interface rõ ràng.
  - Webhook có `x-api-key` và idempotency key: biểu mẫu web, email inbound, cuộc họp, ERP thanh toán.
  - Bảng `sync_events` ghi kết quả đồng bộ kế toán (SYNC_EVENT).
- **Phụ thuộc:** WP-00.

### WP-11 · Kiểm thử và đánh giá (liên tục)

- **Sở hữu:** `tests/e2e/**`, `scripts/eval/**`, `docs/eval/**`.
- **Việc chính:**
  - E2E cho kịch bản demo (`docs/VIBECODE-GUIDE.md` mục 9, bỏ phần Pháp chế và Delivery).
  - Test cho 10 cổng ở `REQUIREMENTS.md`.
  - Bộ đánh giá Agent (mục 8 của guide). Đo NFR-01, NFR-02.
  - Báo cáo `npm run fr:coverage`.
- **Không sửa code nghiệp vụ.** Phát hiện lỗi thì ghi vào `docs/handoff/BUGS.md` để WP sở hữu sửa.

## Định nghĩa "xong" cho mọi WP

1. Mỗi FR trong phạm vi có ít nhất một test tên bắt đầu bằng mã FR; mỗi cổng HG có test riêng.
2. `npm run check` và `npm run build` qua; CI xanh.
3. Kiểm quyền ở server cho mọi thao tác ghi; có `audit_log` cho mọi đổi trạng thái.
4. UI tiếng Việt; không còn dữ liệu cứng thay cho setting ở BR.
5. Cập nhật cột *Hiện trạng* của FR trong `REQUIREMENTS.md`; ghi `docs/handoff/WP-xx.md`.
6. Không sửa file của WP khác. Ngoại lệ đã ghi trong REQUESTS và được chấp thuận.
