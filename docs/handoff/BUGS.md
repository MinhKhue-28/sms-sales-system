# Lỗi phát hiện khi test

Mẫu: `- [ ] BUG-NNN [WP-xx][mức: cao/trung bình/thấp] Mô tả. Tái hiện: … Mong đợi: … (FR/HG liên quan)`

WP sở hữu sửa trên nhánh `fix/BUG-NNN-…`, kèm test tái hiện, rồi tick khi đã gộp.

## Rà soát an toàn AI ngày 23/10/2026 (đọc code, chưa sửa)

Nguồn: rà code ở commit `1c0f6e6` so với `VIBECODE-GUIDE.md` mục 6, 8, `BUSINESS-RULES.md`, `DECISIONS.md`. Mã FR theo bản 22/10.

### Chống lạm quyền

- [x] BUG-001 [WP-08][mức: cao] Trang `/ai-review` chưa tồn tại. Các link "Kiểm duyệt AI" (`src/app/(app)/layout.tsx`, `page.tsx`, `leads/[id]/page.tsx`, `components/record.tsx`) trả 404; `approveSuggestion`, `rejectSuggestion` trong `src/lib/services/ai-review.ts` không có server action nào gọi. (Đã xử lý: xây dựng trang `/ai-review`, server action, UI duyệt/sửa/từ chối). (FR-06, FR-19, FR-32; HG1, HG2, HG3)
- [x] BUG-002 [WP-08][mức: cao] `approveSuggestion` chỉ kiểm người thao tác là USER, không kiểm vai trò và phạm vi hồ sơ; quyền `ai.review` trong `src/lib/rbac.ts` không xét người phụ trách. (Đã xử lý: bổ sung kiểm quyền `ai.review` và phạm vi `canSee` ở server). (FR-98; HG1)
- [x] BUG-003 [WP-08][mức: trung bình] Công cụ `get_win_history` (`src/lib/agents/tools.ts`) đọc thắng/thua của toàn công ty, không giới hạn theo phạm vi dữ liệu được cấp cho Agent; khi chạy mô hình thật, dữ liệu này gửi sang OpenAI. (Đã xử lý: chỉ đọc lịch sử của chính account đang xử lý, kèm thống kê tổng hợp ẩn danh theo ngành, không lộ mã và giá trị của khách khác). (FR-89, FR-92; DEC-28)
- [x] BUG-004 [WP-08][mức: cao] Công cụ `get_recent_emails` lấy cả email gửi đi (OUT) và email từ người không phải liên hệ đã liên kết; luật "chỉ tạo nhận định từ thư nhận từ liên hệ bên ngoài gắn với cơ hội" mới nằm trong prompt. (Đã xử lý: lọc chỉ email IN từ liên hệ đã liên kết, trả `email_insight_status = NO_INSIGHT` nếu không có). (FR-92; 2.1.7b)
- [x] BUG-005 [WP-08][mức: trung bình] `approveSuggestion` gọi `email.send` bên trong `tx()`; nếu bước ghi sau đó lỗi thì dữ liệu được hoàn lại nhưng email đã gửi, không còn dấu vết trong `email_messages`. (Đã xử lý: ghi trạng thái APPROVED trong transaction trước, gửi qua integration sau commit, cập nhật SENT/FAILED). (FR-19; HG1)

### Chống bịa thông tin

- [x] BUG-006 [WP-08][mức: cao] Căn cứ không được kiểm ở server: `evidence`/`sources` trong `tools.ts` là chuỗi tự do. (Đã xử lý: cài đặt hàm `validateEvidence` kiểm tra đối chiếu DB thật `lead.<field>`, `opportunity.<field>`, `activity:<id>`, web url; ref không tồn tại bị từ chối). (VIBECODE-GUIDE 6.4; NFR-08; ERD AI_EVIDENCE)
- [x] BUG-007 [WP-08][mức: cao] `evidence` cho phép mảng rỗng, nên đề xuất loại, chấm BANT, đề xuất chuyển đổi không có căn cứ vẫn được ghi. (Đã xử lý: bắt buộc `evidence.length >= 1` cho các công cụ kết luận). (2.1.7a "luôn ghi lý do và bằng chứng"; FR-32)
- [x] BUG-008 [WP-08][mức: trung bình] `draft_email` lưu `evidence: []`, không có `facts_used`, nên không kiểm được email nháp có nêu sự thật ngoài dữ liệu hay không. (Đã xử lý: bổ sung `facts_used: Ref[]` và lưu vào bảng `ai_evidence`). (FR-19; VIBECODE-GUIDE 6.4, 8.4)
- [x] BUG-009 [WP-08][mức: trung bình] Công cụ `save_opportunity_research` đơn giản hơn thiết kế: thiếu 6 mục insight, `importance_reason`, `changes_since_last`, `additional_actions`, trạng thái `NO_INSIGHT` cho từng mục và `email_insight_status`. (Đã xử lý: nâng cấp toàn bộ schema Zod theo `OpportunityResearch` ở guide 6.4). (FR-36, FR-44; 2.1.7b)
- [x] BUG-010 [WP-08][mức: trung bình] `propose_bant_score` không có `confidence`, `timeline_bucket`, `outcome`, `missing_info`; không có luật "mâu thuẫn hoặc confidence < 0.6 thì chuyển người". (Đã xử lý: nâng cấp schema `BantProposal`, tự động ép outcome về `NEED_INFO` nếu confidence < 0.6). (FR-32; 2.1.7a)

### Kiểm thử và đánh giá

- [ ] BUG-011 [WP-00, WP-11][mức: cao] Repo chưa có test nào: không có test runner, không có thư mục `tests/`, `scripts/eval`, không có lệnh `npm test`, nên bước "Unit / integration tests" trong CI tự bỏ qua dù CI báo xanh. Mong đợi: WP-00 dựng Vitest (DB `:memory:`, `SMS_AI_MODE=mock`) và lệnh `npm test`; WP-11 viết test cho các mục dưới. (Định nghĩa "xong" trong WORKPLAN)
- [ ] BUG-012 [WP-11][mức: cao] Chưa có test chặn quyền của Agent. Cần ít nhất: Agent gọi công cụ không thuộc danh sách của mình → DENIED; Agent không có cách nào đổi `stage`, `amount`, `close_date`, bảng giá, mục kiểm soát (so DB trước/sau lần chạy); email nháp không gửi được khi chưa duyệt; đề xuất loại không đổi trạng thái Lead khi chưa duyệt; email chứa câu chèn lệnh không làm Agent đổi hành vi. (HG1–HG6; guide 8.3 dòng "Vi phạm quyền", "Làm theo câu chèn lệnh" = 0)
- [ ] BUG-013 [WP-11][mức: cao] Chưa có bộ đánh giá độ chính xác: thiếu `scripts/eval/datasets/qualification.json` (30 ca) và `opportunity.json` (15 ca), runner, báo cáo `docs/eval/report-*.md`. Mong đợi: chạy được ở chế độ `mock` trong CI; chạy với OpenAI theo yêu cầu (hỏi xác nhận chi phí, BR-24); ghi kết quả vào phiên bản `agent_configs` (BR-25); judge theo DEC-29. (NFR-08; guide 8.2–8.5)
