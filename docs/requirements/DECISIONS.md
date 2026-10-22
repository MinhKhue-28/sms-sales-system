# Quyết định thiết kế cho bản code

Mỗi quyết định có trạng thái:

- **Chốt**: nhóm đã quyết, code theo đúng như vậy.
- **Mặc định**: bài làm còn để mở. Code theo giá trị mặc định ghi ở đây, và giá trị phải **đổi được** (qua `settings` hoặc ma trận quyền) mà không sửa logic. Khi nhóm chốt khác, sửa file này trước rồi mới sửa code.

Agent code **không tự thêm quyết định mới**. Gặp chỗ thiếu thì ghi vào mục *Câu hỏi mở* cuối file và chọn phương án an toàn nhất: có người duyệt, không tự động.

| Mã | Câu hỏi | Trạng thái | Quyết định cho code | Căn cứ |
|---|---|---|---|---|
| DEC-01 | Có Customer Portal không | **Chốt** | **Không.** Khách hàng không đăng nhập SMS. Gửi báo giá, hoá đơn, liên kết ký, liên kết thanh toán qua email; phản hồi của khách do NVKD ghi nhận hoặc đi vào qua email inbound. | Nhóm chốt 18/10/2026; sơ đồ System Context không có Khách hàng |
| DEC-02 | Phạm vi Agent | **Chốt** | 2 Agent: Sales Qualification Agent (Qualify), Sales Opportunity Agent (Develop). Không thêm Agent khác. | 2.1.6, 2.1.7 |
| DEC-03 | Agent có tự chuyển đổi Lead đơn lẻ không (ADR-03) | Mặc định | **Không.** Agent chỉ tạo đề xuất; NVKD bấm chuyển đổi. Setting `ai_auto_convert=false`. | FR-29 ghi "còn cần chốt"; 2.1.7a cấm tự đóng bản ghi |
| DEC-04 | Ai duyệt hợp nhất hồ sơ trùng | Mặc định | **Quản lý kinh doanh.** NVKD chỉ đề nghị. | FR-16 ghi "chưa chốt" |
| DEC-05 | Ai được sửa bảng giá chuẩn, giá theo nhóm | Mặc định | Quyền `pricelist.write` cấp cho **SALES_MANAGER**; có thể cấp thêm cho SALES qua ma trận quyền. Mọi thay đổi ghi audit. | FR-24, FR-25 ghi NVKD "theo quyền hiện hành", thẩm quyền duyệt "cần xác nhận" |
| DEC-06 | Opportunity tạo lúc nào (ADR-04) | **Chốt** | Cuối Qualify, cùng transaction với tạo hoặc dùng lại Account/Contact. | FR-29 |
| DEC-07 | Cổng Quản lý ở Develop (ADR-05) | **Chốt** theo FR | Có cổng; điều kiện lấy từ BR-06. | FR-39, FR-40 |
| DEC-08 | Hoá đơn chính thức do ai phát hành (ADR-08) | Mặc định | **Hệ thống kế toán (ERP) phát hành.** TCKT lập hoá đơn nháp trong SMS, đẩy sang ERP qua adapter, nhận lại số hoá đơn chính thức, rồi gửi cho khách. SMS không tự sinh số hoá đơn chính thức. | Mô tả FR-61; cột Nguồn ghi thẩm quyền "chưa chốt" |
| DEC-09 | Kiểm tra hoá đơn nháp có cần người độc lập không | Mặc định | Không bắt buộc; người kiểm tra ghi trong lịch sử. Bật được bằng setting `invoice_independent_review=false`. | FR-60 |
| DEC-10 | Bộ phận triển khai có dùng SMS trực tiếp không | Mặc định | **Không.** NVKD ghi nhận tiến độ, kết quả bàn giao theo thông tin bộ phận triển khai cung cấp. | FR-55, FR-56, FR-57; sơ đồ System Context không có Delivery |
| DEC-11 | "Người quản lý tác nhân AI" là ai | Mặc định | Vai trò mới **AI_MANAGER**, quyền riêng (FR-98): cấu hình và giám sát Agent; không quản trị tài khoản, không mở rộng quyền dữ liệu của Agent, không duyệt nghiệp vụ bán hàng. Tài khoản demo do ADMIN cấp. | FR-82 → FR-95, FR-98. Vai trò chưa có trong mục 1.4.2 và sơ đồ System Context: nhóm cần bổ sung vào bài. |
| DEC-12 | Nhà cung cấp mô hình AI | Mặc định | Gọi LLM qua interface `LlmProvider`. Bản cài sẵn: **Claude** (`claude-opus-5-5`, SDK `@anthropic-ai/sdk`). Biến `LLM_PROVIDER=claude`; thêm adapter OpenAI khi nhóm chốt theo sơ đồ System Context. Không có API key thì chạy `mock`. | Sơ đồ System Context ghi "OpenAI API"; code hiện có dùng Claude. **Nhóm phải chốt để bài và demo khớp nhau.** |
| DEC-13 | Ký điện tử, cổng thanh toán | **Chốt** | Chỉ làm adapter giả lập (mock) và luồng trạng thái. Không tích hợp nhà cung cấp thật. | FR-49 (Nên có), FR-64 (Tùy chọn) |
| DEC-14 | Đăng nhập | Mặc định | Email + mật khẩu (băm scrypt), đặt lại mật khẩu do ADMIN tạo mã tạm. Không làm SSO. | FR-97; NFR-05 SSO là hướng mở rộng |
| DEC-15 | Cơ sở dữ liệu | **Chốt** cho prototype | SQLite qua `node:sqlite`, file `data/sms.db` (hoặc `SMS_DB_PATH`). Deploy cần ổ đĩa lưu bền (volume). Không chuyển ORM. | Code hiện có; `docs/DEPLOY.md` |
| DEC-16 | Vai trò LEGAL, DELIVERY trong code cũ | Mặc định | Giữ trong enum để không vỡ dữ liệu cũ, nhưng **không cấp quyền mới**; bỏ khỏi seed demo. Không có FR nào cho Pháp chế ở bản cuối. | 100 FR bản cuối |
| DEC-17 | Tên vai trò tư vấn | Mặc định | Trong code dùng `PRESALES` = "Chuyên viên tư vấn giải pháp". Bài đang dùng lẫn "tư vấn kỹ thuật" và "tư vấn giải pháp": nhóm cần thống nhất trong bài. | FR và sơ đồ System Context lệch tên |
| DEC-18 | Hủy đơn hàng | **Chốt** | Không làm. Bản 100 FR đã bỏ chức năng này. | Bản FR cuối |

## Câu hỏi mở

Ghi thêm vào đây khi gặp chỗ bài làm chưa nói. Mẫu: `- [WP-xx][ngày] Câu hỏi … → Tạm làm theo … (an toàn vì …)`.

- (trống)
