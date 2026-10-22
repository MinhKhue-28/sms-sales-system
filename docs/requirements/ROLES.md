# Vai trò và quyền

## Ánh xạ vai trò trong bài → mã trong code

| Vai trò trong bài | Mã `Role` | Ghi chú |
|---|---|---|
| Nhân viên kinh doanh (SDR, AE, CS) | `SALES` | Phân biệt SDR/AE/CS bằng chức danh nghiệp vụ (module 6), không phải bằng quyền |
| Chuyên viên tư vấn giải pháp / tư vấn kỹ thuật | `PRESALES` | Một vai trò; bài đang gọi hai tên (DEC-17) |
| Quản lý tư vấn giải pháp | `PRESALES_MANAGER` | **Mới.** Duyệt chuyên môn (FR-37) |
| Quản lý kinh doanh | `SALES_MANAGER` | Duyệt chiết khấu, rà soát cơ hội, quản lý đội ngũ, duyệt hợp nhất |
| Nhân viên Tài chính – Kế toán | `FINANCE` | Hoá đơn, thanh toán, công nợ |
| Người quản trị hệ thống | `ADMIN` | Tài khoản, phân quyền, phạm vi dữ liệu, quyền của Agent, nhật ký |
| Người quản lý tác nhân AI | `AI_MANAGER` | **Mới** (DEC-11). Cấu hình, giám sát Agent |
| Pháp chế, Bộ phận triển khai | `LEGAL`, `DELIVERY` | Giữ trong enum, không cấp quyền mới (DEC-10, DEC-16) |
| Sales Qualification Agent, Sales Opportunity Agent | không phải `Role` | Actor `AI` trong `audit_log`; quyền thực thi ở tool registry (`src/lib/agents/tools.ts`) |

## Nguyên tắc

1. **Kiểm quyền ở server** trong mọi server action và route handler (`requirePermission`). Ẩn nút ở UI chỉ là tiện ích.
2. **Hai lớp quyền:** quyền thao tác (permission key) và phạm vi dữ liệu (FR-98):
   - SALES thấy hồ sơ mình phụ trách và hồ sơ trong Pod của mình.
   - SALES_MANAGER thấy các Pod mình quản lý.
   - FINANCE, ADMIN thấy hết trong phạm vi nghiệp vụ của mình.
3. **Chức danh, Pod, vai trò nghiệp vụ không tự cấp quyền** (FR-71, FR-98).
4. **AI_MANAGER** không có `admin.users`, `admin.permissions`, không duyệt nghiệp vụ bán hàng (FR-92, FR-93, FR-98).
5. **Agent** không bao giờ được cấp quyền đổi trạng thái nghiệp vụ, gửi email hay sửa trường lõi. Chỉ ghi đề xuất, bản nghiên cứu, rủi ro (nguồn AI), việc, thông báo.

## Quyền theo nhóm FR (mặc định)

| Nhóm quyền | SALES | PRESALES | PRESALES_MANAGER | SALES_MANAGER | FINANCE | ADMIN | AI_MANAGER |
|---|---|---|---|---|---|---|---|
| Khách hàng tiềm năng, doanh nghiệp, liên hệ (FR-01 → FR-15, FR-17) | Ghi | Xem | Xem | Ghi | Xem | — | — |
| Đề nghị hợp nhất / Duyệt hợp nhất (FR-16) | Đề nghị | — | — | **Duyệt** | — | — | — |
| Danh mục sản phẩm, gói, mô-đun, quyền sử dụng (FR-18 → FR-23) | Xem | Ghi gói, mô-đun | Ghi | Ghi | Xem | — | — |
| Bảng giá, giá theo nhóm (FR-24, FR-25) | Xem | Xem | Xem | **Ghi** (DEC-05) | Xem | — | — |
| Chiết khấu, hạn mức (FR-26) | Xem | — | — | Ghi | Xem | — | — |
| Qualify, chuyển đổi, loại (FR-27 → FR-30) | Ghi | — | — | Ghi | — | — | — |
| Cơ hội, Develop (FR-31 → FR-36, FR-38, FR-40, FR-41) | Ghi | Ghi nhu cầu, giải pháp, đối thủ | Xem | Ghi | — | — | — |
| Duyệt chuyên môn (FR-37) | — | — | **Duyệt** | — | — | — | — |
| Rà soát cơ hội (FR-39), mở lại cơ hội (BR-17) | — | — | — | **Duyệt** | — | — | — |
| Proposal, báo giá, gửi, phản hồi (FR-42 → FR-49) | Ghi | Ghi Proposal, cấu hình | Xem | Ghi | — | — | — |
| Duyệt chiết khấu (FR-45) | Trình | — | — | **Duyệt** | — | — | — |
| Đơn hàng (FR-50, FR-52 → FR-57) | Ghi | Xem | — | Ghi | Xem; kiểm điều khoản thanh toán | — | — |
| Đơn hàng thủ công (FR-51) | — | — | — | Ghi (BR-10) | — | — | — |
| Hoá đơn, thanh toán, công nợ (FR-58 → FR-68) | Xem; đề nghị điều chỉnh; phối hợp nhắc | — | — | Xem | **Ghi** | — | — |
| Đội ngũ, Pod, chỉ tiêu, phân công (FR-69 → FR-81) | Xem việc và KPI của mình; tạo việc của mình | Xem việc của mình | — | **Ghi** | — | — | — |
| Đề xuất của Agent: duyệt email, duyệt loại, xác minh nghiên cứu (FR-86 → FR-91) | **Duyệt** (hồ sơ mình phụ trách) | Xem, phản hồi | — | Duyệt | — | — | — |
| Cấu hình, giám sát, ngân sách, công cụ Agent (FR-82 → FR-85, FR-93 → FR-95) | Phản hồi chất lượng | Phản hồi chất lượng | — | Xem báo cáo | — | Cấp quyền dữ liệu cho Agent | **Ghi** |
| Tài khoản, phân quyền, phạm vi dữ liệu (FR-96 → FR-98) | — | — | — | — | — | **Ghi** | — |
| Báo cáo phễu, dự báo (FR-99) | Của mình | — | — | **Xem** | — | — | — |
| Nhật ký (FR-100) | — | — | — | Xem | — | **Xem** | Xem nhật ký Agent |

Bảng này là đầu vào cho `src/lib/rbac.ts`. WP-00 chuyển nó thành permission key; các WP khác chỉ gọi key, không tự thêm quyền ngoài bảng.
