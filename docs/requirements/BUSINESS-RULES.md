# Quy tắc nghiệp vụ có giá trị cụ thể (BR)

Nhiều FR ghi "theo quy tắc doanh nghiệp xác nhận / cấu hình". File này cho **giá trị mặc định để prototype chạy và kiểm thử được**.

Quy ước:
- Mọi con số ở đây phải nằm trong `settings` (bảng `settings`, khai báo mặc định trong `src/lib/settings-defaults.ts`). Code đọc từ settings, **không hard-code**.
- Cột *Setting* là tên khoá. Admin sửa được trong trang Quản trị.
- Đây là giá trị đề xuất cho prototype, chưa phải quyết định của doanh nghiệp. Khi nhóm chốt con số khác, sửa file này và giá trị mặc định cùng lúc. Có thể chép bảng này vào mục 2.6.4 của bài.

| Mã | Quy tắc | Giá trị mặc định | Setting | Dùng cho |
|---|---|---|---|---|
| BR-01 | Chấm BANT | 4 tiêu chí Budget, Authority, Need, Timeline, mỗi tiêu chí 0–25, tổng 0–100. **Đạt chuẩn** khi tổng ≥ 60 **và** Authority > 0 (đã xác định người quyết định). Khung thời gian: Trong tháng / Cuối quý / Năm sau / Chưa rõ. | `bant_threshold=60` | FR-28, FR-29, FR-82, FR-87 |
| BR-02 | Mức phân loại khách hàng tiềm năng | **Nóng**: đạt chuẩn BR-01 và mua trong tháng hoặc cuối quý. **Ấm**: tổng 40–59, hoặc đạt chuẩn nhưng mua năm sau. **Lạnh**: tổng < 40 hoặc chưa rõ nhu cầu. Mức do Agent đề xuất phải được NVKD xác nhận mới thành mức chính thức. | `lead_rating_warm_min=40` | FR-09, FR-28 |
| BR-03 | Nhóm khách hàng (phân khúc) | **SMB**: dưới 200 nhân sự. **Enterprise**: từ 200 nhân sự. Mỗi nhóm gắn một bảng giá mặc định. | `segment_enterprise_min_employees=200` | FR-25, FR-29 |
| BR-04 | Chân dung khách hàng mục tiêu (TCP) | "Doanh nghiệp B2B từ 50 nhân sự, đội Sales từ 5 người, ngành sản xuất / phân phối / dịch vụ CNTT, hoạt động tại Việt Nam." | `qualification_tcp` | FR-82, FR-86, FR-88 |
| BR-05 | Chiết khấu và hạn mức duyệt | NVKD tự áp chiết khấu từng dòng ≤ 10 %. Từ trên 10 % đến 30 % cần QLKD duyệt. Trên 30 % không cho phép. | `discount_threshold_pct=10`, `discount_max_pct=30` | FR-26, FR-43, FR-45 |
| BR-06 | Cơ hội thuộc diện QLKD rà soát | Mức quan trọng **Cao**, **hoặc** còn ít nhất một rủi ro ở trạng thái Mở. | `manager_gate_mode=HIGH_OR_OPEN_RISK` | FR-39, FR-40 |
| BR-07 | Hồ sơ thuộc diện rà soát chuyên môn | Có yêu cầu tích hợp với hệ thống khác, **hoặc** doanh thu ước tính ≥ 500 000 000 VND. | `expert_review_min_amount=500000000` | FR-37 |
| BR-08 | Mức quan trọng của cơ hội | **Cao**: doanh thu ≥ 500 triệu hoặc khách nhóm Enterprise. **Trung bình**: 100–500 triệu. **Thấp**: dưới 100 triệu. Agent đề xuất kèm lý do; NVKD xác nhận. | `importance_high_amount=500000000`, `importance_medium_amount=100000000` | FR-91 |
| BR-09 | Hiệu lực báo giá | Mặc định 30 ngày kể từ ngày gửi. Báo giá hết hạn mà chưa được chấp thuận thì không nhận chấp thuận mới. Báo giá đã được chấp thuận trước hạn: được tạo đơn trong 30 ngày kể từ ngày chấp thuận. | `quote_valid_days=30`, `accepted_quote_order_window_days=30` | FR-47, FR-50 |
| BR-10 | Đơn hàng thủ công | Chỉ người có quyền `order.create_direct` (mặc định SALES_MANAGER). Chiết khấu vẫn kiểm theo BR-05. | `allow_direct_order=true` | FR-51 |
| BR-11 | Lịch thanh toán của đơn | Tổng các đợt phải bằng giá trị đơn. Lệch thì hiện cảnh báo, không cho xác nhận điều khoản. | — | FR-53 |
| BR-12 | Giá trị hoá đơn | Tổng các hoá đơn (không tính hoá đơn đã huỷ) không vượt giá trị đơn. | — | FR-58 |
| BR-13 | Quá hạn và nhắc thanh toán | Quá hạn khi hạn < hôm nay và chưa thanh toán đủ. Tạo việc nhắc cho NVKD và TCKT; nhắc lại sau mỗi 7 ngày. | `payment_reminder_days=7` | FR-65 |
| BR-14 | KPI và dự báo | **Mức hoàn thành** = tổng giá trị đơn hàng của cơ hội thắng trong kỳ / chỉ tiêu. **Dự báo** = Σ doanh thu ước tính × xác suất theo giai đoạn: Develop 20 %, Propose 50 %, Close 80 %. | `forecast_prob_develop=20`, `forecast_prob_propose=50`, `forecast_prob_close=80` | FR-80, FR-99 |
| BR-15 | Sales Opportunity Agent | Chỉ xử lý cơ hội đang mở ở Develop hoặc Propose. Làm mới mỗi 6 giờ; đọc email 30 ngày gần nhất; làm mới khi đổi trường trọng yếu (nhu cầu, giải pháp, doanh thu, ngày chốt, bên liên quan, đối thủ). | `opp_refresh_hours=6`, `email_window_days=30` | FR-83, FR-90 |
| BR-16 | Ngân sách AI | 200 000 token/ngày cho mỗi Agent. Cảnh báo khi đạt 80 %; chặn lần chạy mới khi đạt 100 %. Tối đa 15 vòng gọi công cụ mỗi lần chạy. | `ai_daily_token_budget=200000`, `ai_budget_warn_pct=80`, `ai_max_iterations=15` | FR-85, NFR-09 |
| BR-17 | Mở lại cơ hội đã đóng | Chỉ QLKD, trong vòng 90 ngày kể từ ngày đóng, bắt buộc ghi lý do. | `reopen_window_days=90` | FR-41 |
| BR-18 | Người liên hệ thuộc doanh nghiệp | Mỗi người liên hệ thuộc **một** doanh nghiệp. | — | FR-13 |
| BR-19 | Vai trò bên liên quan | Một người liên hệ có thể có **nhiều** vai trò trong cùng cơ hội (ví dụ vừa quyết định vừa sử dụng). | — | FR-34 |
| BR-20 | Lưu trữ | Nhật ký giữ tối thiểu 12 tháng; đơn hàng, hoá đơn tối thiểu 5 năm. Prototype không có job xoá. | — | FR-100, NFR-07, NFR-13 |
| BR-21 | Kiểm tra trùng | Trùng khi khớp email, hoặc khớp SĐT đã chuẩn hoá, hoặc khớp mã số thuế, hoặc tên công ty đã chuẩn hoá giống hệt. Gộp do QLKD duyệt (DEC-04). | — | FR-15, FR-16 |
| BR-22 | Bảng giá | Mỗi bảng giá có **một** loại tiền, ngày bắt đầu, ngày kết thúc (có thể trống), thuế suất GTGT theo từng dòng (mặc định 10 %, dịch vụ phần mềm có thể 0 %). Đơn hàng dùng một loại tiền duy nhất. | `default_vat_pct=10` | FR-24, FR-54 |
