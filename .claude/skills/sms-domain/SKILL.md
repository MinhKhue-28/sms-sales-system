---
name: sms-domain
description: Nghiệp vụ và mô hình dữ liệu của Sales Management System (SMS) cho doanh nghiệp B2B SaaS + dịch vụ triển khai — 5 giai đoạn Qualify/Develop/Propose/Close/Fulfill, actors, entities, trạng thái, human gates và các ADR chưa chốt. Dùng trước khi thiết kế schema/ERD, viết API, màn hình, workflow, phân quyền, seed data hoặc bất kỳ tính năng nào chạm tới Lead, Account, Contact, Opportunity, Quote, Order, Invoice, Payment.
---

# SMS — Domain rules

**Nguồn sự thật (từ 19/10/2026): `docs/requirements/REQUIREMENTS.md` (100 FR + 15 NFR), `BUSINESS-RULES.md`, `DECISIONS.md`, `ROLES.md`.** Khi skill này lệch với các file đó, các file đó thắng. Brief cũ `../SYSTEM ARCHITECTURE - PROJECT BRIEF - SOURCE OF TRUTH.md` chỉ còn là bối cảnh. Các mục "ADR chưa chốt" và "Actors" bên dưới đã được thay bằng `DECISIONS.md` và `ROLES.md`.

## Phạm vi

SMS là trục CRM/Sales nội bộ: Lead, Account/Contact, Opportunity, tương tác, giải pháp, sản phẩm/bảng giá, báo giá, đơn hàng, hóa đơn, theo dõi hoàn tất giao dịch.

**Ngoài phạm vi — không code:** hạch toán kế toán chuyên sâu, triển khai kỹ thuật thực tế, vận hành SaaS sau bàn giao, ticket/support chuyên sâu, Customer Portal, khách hàng tự đăng ký, huỷ đơn hàng. Ký điện tử (FR-49) và cổng thanh toán (FR-64) chỉ làm adapter giả lập (DEC-13). Gia hạn/upsell chỉ là hướng phát triển.

## 5 giai đoạn

| Giai đoạn | Việc chính | Điều kiện ra |
|---|---|---|
| Qualify | Tạo/chuẩn hóa Lead, kiểm tra trùng, BANT, ghi tương tác | Đạt → Convert; không đạt → Disqualified **có lý do**, giữ lịch sử, có thể tái kích hoạt |
| Develop | AE nhận Opportunity, xác minh Account/Contact, Customer Need, chọn sản phẩm/bảng giá, Presales làm Proposed Solution, stakeholders, competitors | Hoàn tất **4 mục checklist** trước khi sang Propose |
| Propose | Proposal + Quote, kiểm tra giá/chiết khấu, **duyệt khi vượt thẩm quyền**, thương lượng/chỉnh sửa | Khách chấp thuận hoặc từ chối |
| Close | Tạo Order từ Quote accepted (hoặc nhánh tạo trực tiếp), khóa giá, ghi kết quả Opportunity | Won/Lost |
| Fulfill | Delivery cấp license/triển khai/đào tạo; Sales theo dõi; lập/gửi Invoice theo mốc; Finance cập nhật thanh toán | Lưu hồ sơ/handoff |

Opportunity có thể Lost ở Develop hoặc mọi giai đoạn sau. **Không đồng nhất** Closed-Won, Order Active, Paid, Fulfilled — đây là 4 trạng thái khác nhau trên các entity khác nhau.

Khi convert Lead: **kiểm tra và dùng lại** Account/Contact đã có — không mặc định tạo 3 bản ghi mới.

## Actors / vai trò (dùng cho RBAC)

- `SALES` (SDR/AE): Lead, nhu cầu, Opportunity, Quote/Order, kiểm duyệt output AI
- `PRESALES` (SE): ràng buộc kỹ thuật, Proposed Solution, cấu hình gói, scope
- `SALES_MANAGER`: pipeline, rà soát cơ hội quan trọng/rủi ro, phê duyệt theo thẩm quyền
- `FINANCE`: xác nhận hóa đơn, thanh toán, công nợ, đối soát
- `LEGAL` (Deal Desk): rà soát điều khoản đặc thù — không bắt buộc cho mọi deal
- `DELIVERY`: cập nhật tiến độ/xác nhận hoàn thành cấp quyền/triển khai
- `ADMIN`: cấu hình Agent, phân quyền, tiêu chí, lịch chạy

Customer **không đăng nhập SMS** — trao đổi qua Sales/email. Competitor là dữ liệu, không phải actor.

## Entities

- Master: Account, Contact, Product/Service, PriceList (+Currency)
- Operational: Lead, Opportunity, Quote, Order, Invoice, Payment
- Hỗ trợ: BANT (trên Lead), Activity/Timeline, StakeholderConnection, Competitor, OpportunityResearch/Insight, AIActionLog
- Content: email, notes, proposal, attachments
- Metadata: tiêu chí qualification, rules, cấu hình Agent

Customer Need / Proposed Solution: mặc định là **trường/hồ sơ trên Opportunity**, chưa tách entity riêng. Contract, QuoteVersion: **chưa có trong baseline** (ADR-07, ADR-09).

## Traceability bắt buộc

Mọi chuyển trạng thái và mọi phê duyệt phải lưu: record ID, trạng thái trước/sau, người thực hiện/người duyệt, thời điểm, lý do, nguồn bằng chứng (nếu có). Dùng bảng audit/state-history chung. Không tự đặt thời hạn lưu trữ/xóa dữ liệu.

## ADR chưa chốt — hỏi người dùng trước khi code phần liên quan

- ADR-03: AI có được tự convert Lead đơn lẻ không? (mặc định an toàn: **chỉ đề xuất**, người bấm convert)
- ADR-04: Opportunity tạo ở cuối Qualify hay đầu Develop? (đề xuất: 1 transaction convert ở cuối Qualify)
- ADR-05: Điều kiện Manager gate ở Develop (đề xuất: bắt buộc khi mức quan trọng Cao hoặc còn rủi ro mở)
- ADR-06: Quyền đọc Product/Pricing của Agent
- ADR-07: Quote accepted đủ tạo Order hay cần Contract ký? Có giữ nhánh Order trực tiếp? Thời điểm khóa giá?
- ADR-08: Ai phát hành Invoice chính thức, system of record cho payment, trigger Delivery là Order/Contract/Paid?
- ADR-09: Customer Portal / QuoteVersion — mặc định **không** đưa vào
- ADR-10/11: Agent chạy nội bộ hay dịch vụ ngoài; PoC Sales Solution Agent

Khi buộc phải code trước khi chốt: làm theo "mặc định an toàn" ở trên, đặt sau feature flag/config, và ghi `// ADR-xx: tạm theo đề xuất brief` tại chỗ.

## Tích hợp ngoài (chỉ stub/adapter, không giả định vendor)

Email/Collaboration, Web research, Maps (chuẩn hóa địa chỉ), Marketing/Website (nguồn Lead), ERP/Finance, Provisioning, Helpdesk, LLM provider. Mỗi cái là một interface + adapter giả lập (mock) cho đến khi người dùng chọn nhà cung cấp.
