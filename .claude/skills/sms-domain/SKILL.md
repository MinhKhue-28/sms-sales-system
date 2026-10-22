---
name: sms-domain
description: Nghiệp vụ và mô hình dữ liệu của Sales Management System (SMS) cho doanh nghiệp B2B SaaS + dịch vụ triển khai — 5 quy trình Đánh giá khách hàng / Phát triển cơ hội / Đề xuất giải pháp / Tạo đơn hàng / Theo dõi hóa đơn và thanh toán, vai trò, thực thể theo ERD, trạng thái, cổng kiểm soát của con người. Dùng trước khi thiết kế bảng, viết API, màn hình, workflow, phân quyền, seed data hoặc bất kỳ tính năng nào chạm tới Lead, Account, Contact, Opportunity, Quote, Order, Invoice, Payment.
---

# SMS — Domain rules

**Nguồn sự thật: `docs/requirements/`** gồm `REQUIREMENTS.md` (100 FR + 15 NFR, mã theo bản 22/10/2026), `BUSINESS-RULES.md`, `DECISIONS.md`, `ROLES.md`, `DATA-MODEL.md`. Skill này chỉ tóm tắt; khi lệch, các file đó thắng. Brief cũ `../SYSTEM ARCHITECTURE - PROJECT BRIEF - SOURCE OF TRUTH.md` chỉ còn là bối cảnh, các "ADR chưa chốt" trong brief đã được thay bằng `DECISIONS.md`.

## Phạm vi

SMS là trục CRM/Sales nội bộ: khách hàng tiềm năng, doanh nghiệp, người liên hệ, cơ hội, tương tác, giải pháp, sản phẩm và bảng giá, báo giá, đơn hàng, hoá đơn, thanh toán, đội ngũ Sales, 2 AI Agent.

**Ngoài phạm vi — không code:** Customer Portal (DEC-01), khách hàng tự đăng ký, hạch toán kế toán, cấp license hay tài khoản cho khách (DEC-10), vận hành SaaS sau bàn giao, huỷ đơn hàng (DEC-18), Agent thứ ba. Ký điện tử (FR-55) và cổng thanh toán (FR-70) chỉ làm adapter giả lập (DEC-13).

## 5 quy trình (nhãn UI theo DEC-19)

| Mã | Nhãn | Việc chính | Điều kiện ra |
|---|---|---|---|
| QUALIFY | Đánh giá khách hàng | Tạo, chuẩn hoá Lead, kiểm tra trùng, khảo sát sơ bộ, BANT (BR-01) | Đạt → chuyển thành cơ hội; không đạt → Loại **có lý do**, giữ lịch sử, tái kích hoạt được |
| DEVELOP | Phát triển cơ hội | Nhu cầu chi tiết, biên bản phạm vi, cấu hình dự kiến, bên liên quan, đối thủ, giải pháp nội bộ, rủi ro | Đủ **4 mục kiểm soát** + rà soát của QLKD khi thuộc diện BR-06 |
| PROPOSE | Đề xuất giải pháp | Bản đề xuất, báo giá có phiên bản, duyệt chiết khấu vượt hạn mức, gửi khách, ghi phản hồi | Khách chấp thuận hoặc từ chối |
| CLOSE | Tạo đơn hàng | Đơn từ phiên bản báo giá đã chấp thuận (hoặc đơn thủ công), điều khoản thanh toán, khoá giá, bàn giao kỹ thuật | Hoàn thành đơn |
| FULFILL | Theo dõi hóa đơn và thanh toán | Hồ sơ hoá đơn, phát hành qua kế toán, thanh toán, công nợ, điều chỉnh | Thanh toán đủ |

Cơ hội có thể Thất bại ở mọi giai đoạn. **Không đồng nhất** cơ hội Thành công, đơn đã khoá giá, đơn hoàn thành, đã thanh toán: đây là các trạng thái khác nhau trên các thực thể khác nhau.

Khi chuyển đổi Lead: **kiểm tra và dùng lại** doanh nghiệp, người liên hệ đã có, không mặc định tạo mới.

## Vai trò

Xem `docs/requirements/ROLES.md`. Tóm tắt: `SALES`, `PRESALES` (Chuyên viên tư vấn kỹ thuật), `PRESALES_MANAGER`, `SALES_MANAGER`, `FINANCE`, `ADMIN`, `AI_MANAGER`. `LEGAL`, `DELIVERY` không có quyền mới. Khách hàng **không đăng nhập SMS**. Đối thủ là dữ liệu, không phải tác nhân.

## Thực thể

Theo ERD mục 2.4.3 (61 thực thể, 6 miền). Bảng nào trong code ứng với thực thể nào, WP nào tạo: `docs/requirements/DATA-MODEL.md`. Một số điểm hay sai:

- Báo giá có phiên bản: `quotes` + `quote_versions` (DEC-22).
- Kết quả đánh giá do NVKD xác nhận nằm ở `lead_assessments`; đề xuất của AI nằm riêng, không ghi đè.
- Nhân viên (`employees`) tách khỏi tài khoản đăng nhập (`users`).
- Thanh toán theo doanh nghiệp, phân bổ vào hoá đơn qua `payment_allocations` (DEC-23).

## Truy vết bắt buộc

Mọi chuyển trạng thái và mọi phê duyệt phải lưu: mã bản ghi, trạng thái trước/sau, người thực hiện hoặc người duyệt, thời điểm, lý do, căn cứ (nếu có) vào `audit_log`; chuyển giai đoạn cơ hội ghi thêm `opportunity_stage_history`. Thời hạn lưu theo BR-20.

## Chỗ bài chưa chốt

Không tự quyết. Dùng giá trị **Mặc định** trong `DECISIONS.md`; chưa có thì ghi *Câu hỏi mở* và chọn phương án có người duyệt, không tự động.

## Tích hợp ngoài (chỉ adapter, có bản giả lập)

Biểu mẫu web, ERP/Kế toán, Email, Cuộc họp, LLM (`LlmProvider`, DEC-12), Bản đồ, Cổng thanh toán, Ký điện tử: đúng 8 hệ thống ngoài trên sơ đồ ngữ cảnh.
