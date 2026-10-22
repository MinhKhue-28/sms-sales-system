# Quyết định thiết kế cho bản code

Mỗi quyết định có trạng thái:

- **Chốt**: nhóm đã quyết, hoặc bài đã ghi rõ. Code theo đúng như vậy.
- **Mặc định**: bài làm còn để mở hoặc tự mâu thuẫn. Code theo giá trị mặc định ghi ở đây, và giá trị phải **đổi được** (qua `settings` hoặc ma trận quyền) mà không sửa logic. Khi nhóm chốt khác, sửa file này trước rồi mới sửa code.

Agent code **không tự thêm quyết định mới**. Gặp chỗ thiếu thì ghi vào mục *Câu hỏi mở* cuối file và chọn phương án an toàn nhất: có người duyệt, không tự động.

Mã FR theo bản đọc ngày 22/10/2026 (xem bảng đổi mã cuối `REQUIREMENTS.md`).

| Mã | Câu hỏi | Trạng thái | Quyết định cho code | Căn cứ |
|---|---|---|---|---|
| DEC-01 | Có Customer Portal không | **Chốt** | **Không.** Khách hàng không đăng nhập SMS. Gửi báo giá, hoá đơn, liên kết ký, liên kết thanh toán qua email; phản hồi của khách do NVKD ghi nhận hoặc đi vào qua email inbound. | Nhóm chốt 18/10/2026; ERD 2.4.3 ghi rõ không gồm Portal. Mục 2.2.3 và tab *System Context Diagram* vẫn còn đoạn mô tả Portal: nhóm cần sửa bài, code không theo các đoạn đó. |
| DEC-02 | Phạm vi Agent | **Chốt** | 2 Agent: Sales Qualification Agent (Đánh giá khách hàng), Sales Opportunity Agent (Phát triển cơ hội). Không thêm Agent khác. | 2.1.6, 2.1.7 |
| DEC-03 | Agent có tự chuyển đổi Lead đơn lẻ không (ADR-03) | Mặc định | **Không.** Agent chỉ tạo đề xuất; NVKD bấm chuyển đổi. Setting `ai_auto_convert=false`. | Mô tả FR-33 vẫn ghi "còn cần chốt" (cột nguồn đã bỏ chữ này); 2.1.7a cấm tự đóng bản ghi |
| DEC-04 | Ai duyệt hợp nhất hồ sơ trùng | Mặc định | **Quản lý kinh doanh.** NVKD chỉ đề nghị. | FR-17 ghi "chưa chốt" |
| DEC-05 | Ai được sửa bảng giá chuẩn, giá theo nhóm | Mặc định | Quyền `pricelist.write` cấp cho **SALES_MANAGER**; có thể cấp thêm cho SALES qua ma trận quyền. Mọi thay đổi ghi audit. | FR-27, FR-28 ghi NVKD "theo quyền hiện hành", thẩm quyền duyệt "cần xác nhận" |
| DEC-06 | Opportunity tạo lúc nào (ADR-04) | **Chốt** | Cuối bước Đánh giá khách hàng, cùng transaction với tạo hoặc dùng lại Account/Contact. Một Lead chuyển thành tối đa một cơ hội. | FR-33; ERD giả định 1 Lead → tối đa 1 Opportunity |
| DEC-07 | Cổng Quản lý ở Phát triển cơ hội (ADR-05) | **Chốt** theo FR | Có cổng; điều kiện lấy từ BR-06. | FR-45, FR-46 |
| DEC-08 | Hoá đơn chính thức do ai phát hành (ADR-08) | Mặc định | **Hệ thống kế toán (ERP) phát hành.** TCKT lập hồ sơ hoá đơn nháp trong SMS, đẩy sang ERP qua adapter, nhận lại số hoá đơn chính thức, rồi gửi cho khách. SMS không tự sinh số hoá đơn chính thức. | FR-67 ghi thẩm quyền "chưa chốt"; ERD 2.4.3: hoá đơn chính thức tham chiếu từ hệ thống kế toán |
| DEC-09 | Kiểm tra hoá đơn nháp có cần người độc lập không | Mặc định | Không bắt buộc; người kiểm tra ghi trong lịch sử. Bật được bằng setting `invoice_independent_review=false`. | FR-66 |
| DEC-10 | Bộ phận triển khai có dùng SMS trực tiếp không | **Chốt** theo FR | **Không.** NVKD ghi nhận tiến độ, kết quả bàn giao theo thông tin bộ phận triển khai cung cấp. SMS không cấp tài khoản hay license. | FR-61, FR-62 (nguồn đã đổi thành NVKD), FR-63; ERD HANDOVER |
| DEC-11 | "Người quản lý tác nhân AI" là ai | Mặc định | Vai trò **AI_MANAGER**, quyền riêng (FR-98): cấu hình kỹ thuật và giám sát Agent; không quản trị tài khoản, không mở rộng quyền dữ liệu của Agent, không duyệt nghiệp vụ bán hàng. Tài khoản demo do ADMIN cấp. Chia việc với QLKD theo DEC-24. | FR-92 → FR-95, FR-98. Vai trò chưa có trong bảng 1.4.2: nhóm cần bổ sung. |
| DEC-12 | Nhà cung cấp mô hình AI | Mặc định | Gọi LLM qua interface `LlmProvider`. Bản cài sẵn: **Claude** (`claude-opus-5-5`, SDK `@anthropic-ai/sdk`). Biến `LLM_PROVIDER=claude`. Không có API key thì chạy `mock`. **Đề xuất cho bài:** ghi khối E05 trên sơ đồ ngữ cảnh là "Dịch vụ mô hình ngôn ngữ (LLM API)" thay vì tên một hãng. Nếu nhóm giữ "OpenAI API", WP-08 thêm adapter OpenAI và đổi mặc định. | Sơ đồ System Context ghi "OpenAI API"; code dùng Claude. |
| DEC-13 | Ký điện tử, cổng thanh toán | **Chốt** | Chỉ làm adapter giả lập (mock) và luồng trạng thái. Không tích hợp nhà cung cấp thật. | FR-55 (Nên có), FR-70 (Tùy chọn) |
| DEC-14 | Đăng nhập | Mặc định | Email + mật khẩu (băm scrypt), đặt lại mật khẩu do ADMIN tạo mã tạm. Không làm SSO. | FR-97; NFR-05 SSO là hướng mở rộng |
| DEC-15 | Cơ sở dữ liệu | **Chốt** cho prototype | SQLite qua `node:sqlite`, file `data/sms.db` (hoặc `SMS_DB_PATH`). Deploy cần ổ đĩa lưu bền (volume). Không chuyển ORM. | Code hiện có; `docs/DEPLOY.md` |
| DEC-16 | Vai trò LEGAL, DELIVERY và loại duyệt `LEGAL_REVIEW` trong code cũ | Mặc định | Giữ trong enum để không vỡ dữ liệu cũ, nhưng **không cấp quyền mới**, bỏ khỏi seed demo, **không tạo bản ghi `approvals.kind='LEGAL_REVIEW'` mới**. Không có FR nào cho Pháp chế hay Triển khai. | Bảng 1.4.2 có hai vai trò này nhưng 100 FR không giao việc nào |
| DEC-17 | Tên vai trò tư vấn | Mặc định | Mã `PRESALES`, nhãn UI **"Chuyên viên tư vấn kỹ thuật"** (tên trong bảng 1.4.2 và đa số FR). Mã `PRESALES_MANAGER`, nhãn **"Quản lý tư vấn giải pháp"** (tên trong FR-42). | Bài đang dùng 5 tên: tư vấn kỹ thuật, tư vấn giải pháp, nhân viên tư vấn giải pháp (FR-48), nhân viên tư vấn kỹ thuật (FR-94), Kỹ sư giải pháp (1.4.1). Nhóm cần thống nhất. |
| DEC-18 | Hủy đơn hàng | **Chốt** | Không làm. 100 FR không có chức năng này. | Bản FR cuối |
| DEC-19 | Tên quy trình và giai đoạn | **Chốt** theo bài | Mã trong code giữ tiếng Anh; **nhãn UI theo tên mới của bài**: QUALIFY = "Đánh giá khách hàng", DEVELOP = "Phát triển cơ hội", PROPOSE = "Đề xuất giải pháp", CLOSE = "Tạo đơn hàng", FULFILL = "Theo dõi hóa đơn và thanh toán". Kết quả cơ hội: WON = "Thành công", LOST = "Thất bại". | Tiêu đề 2.1.1 → 2.1.5 và 2.1.8.1 → 2.1.8.5 bản 22/10; FR-47 |
| DEC-20 | Mô hình dữ liệu | **Chốt** | ERD mục 2.4.3 (61 thực thể) là đích. Bảng đang có **giữ tên**, ánh xạ sang thực thể ERD trong `docs/requirements/DATA-MODEL.md`. Bảng mới đặt tên snake_case số nhiều theo thực thể ERD. Thực thể nào được gộp hoặc lược bỏ ở prototype ghi rõ trong DATA-MODEL. | 2.4.3 và tab *Phụ lục ERD*; ERD tự ghi demo không phải cài đủ 61 thực thể |
| DEC-21 | Một người liên hệ thuộc mấy doanh nghiệp | Mặc định | Một **doanh nghiệp hiện hành** (`contacts.account_id`) + lịch sử trong `affiliations` (`valid_from`, `valid_to`). Tối đa một liên kết đang hiệu lực mỗi người. | ERD có AFFILIATION, mục 2.4.3d ghi FR-14 chưa chốt bội số |
| DEC-22 | Báo giá có phiên bản không | **Chốt** theo ERD | Có. `quotes` là hồ sơ chung; `quote_versions` là từng bản (trạng thái, tổng tiền, hiệu lực, snapshot); `quote_lines` thuộc một phiên bản. Bản đã gửi hoặc đã chấp thuận không sửa; điều chỉnh tạo phiên bản mới. | ERD-03; FR-52, FR-54 |
| DEC-23 | Đơn hàng, thanh toán | Mặc định | Một phiên bản báo giá tạo **tối đa một** đơn (UNIQUE) để chặn tạo trùng. Thanh toán ghi theo doanh nghiệp (`payments.account_id`) và phân bổ vào hoá đơn qua `payment_allocations` (cho phép trả từng phần). Trạng thái cổng thanh toán không đồng nghĩa đã đối soát. | ERD-04 và 2.4.3d (bài tạm cho phép một báo giá nhiều đơn, chưa chốt) |
| DEC-24 | Ai cấu hình Agent | Mặc định | **QLKD**: cấu hình nghiệp vụ (TCP, tiêu chí sàng lọc, chế độ, lịch và điều kiện chạy: FR-88, FR-89); có thể cấp cho NVKD qua ma trận quyền. **AI_MANAGER**: hướng dẫn (prompt), mô hình, ngân sách (FR-91), công cụ và nguồn dữ liệu (FR-93), xử lý lần chạy lỗi (FR-94), báo cáo (FR-95). **ADMIN**: cấp quyền dữ liệu cho Agent (FR-92). NVKD, tư vấn: phản hồi chất lượng (FR-90). | Cột nguồn FR-88 → FR-95. FR-91 đang ghi nguồn "Nhân viên kinh doanh, Chuyên viên tư vấn kỹ thuật (phản hồi)": nhóm nên sửa thành người quản lý tác nhân AI. |
| DEC-25 | Kiến trúc phân lớp | **Chốt** theo NFR-12 | Kiến trúc 3 lớp (Presentation / Business Logic / Data Access) + Service Agents cho hệ thống ngoài. Ánh xạ thư mục ở `AGENTS.md` mục *Kiến trúc 3 lớp*. | NFR-12; tab *3-Layer Architecture* |
| DEC-26 | "Quản lý tư vấn giải pháp" là ai | Mặc định | Vai trò **PRESALES_MANAGER**, chỉ dùng cho rà soát chuyên môn (FR-42). | FR-42. Vai trò chưa có trong bảng 1.4.2: nhóm cần bổ sung. |

## Việc nhóm cần sửa trong bài (code đã chọn mặc định ở trên)

- Mục 2.2.3 và tab *System Context Diagram* còn mô tả Customer Portal (DEC-01).
- Bảng 1.4.2 thiếu "Quản lý tư vấn giải pháp" và "Người quản lý tác nhân AI"; dòng "Người quản trị hệ thống" chưa có mô tả (DEC-11, DEC-26).
- Thống nhất một tên cho vai trò tư vấn (DEC-17).
- Khối E05 "OpenAI API" trên sơ đồ ngữ cảnh (DEC-12).
- Nguồn FR-91 (DEC-24); mô tả FR-33 còn "cần chốt" trong khi cột nguồn đã bỏ (DEC-03).
- Tên FR-22 "Xóa Ngừng kinh doanh…" và FR-24 "Thêm Quản lý danh mục…" có chữ sót.
- Mục 2.6.4 còn trống: duyệt bảng `BUSINESS-RULES.md` rồi chép vào.

## Câu hỏi mở

Ghi thêm vào đây khi gặp chỗ bài làm chưa nói. Mẫu: `- [WP-xx][ngày] Câu hỏi … → Tạm làm theo … (an toàn vì …)`.

- (trống)
