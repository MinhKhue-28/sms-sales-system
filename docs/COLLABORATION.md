# Quy trình làm việc khi nhiều AI cùng code

Áp dụng cho mọi công cụ: Claude Code, Codex, Cursor, OpenCode, Copilot… và cả người. Mục tiêu: AI nào vào sau cũng biết **đang ở đâu, làm tiếp gì, không đụng phần của ai**.

## 1. Bắt đầu một phiên (bắt buộc, theo thứ tự)

1. Đọc `AGENTS.md`.
2. Đọc `docs/TASKBOARD.md`: chọn **một** WP đang "Sẵn sàng" hoặc WP đã được giao cho mình.
3. Đọc phần WP đó trong `docs/WORKPLAN.md` và các FR liên quan trong `docs/requirements/REQUIREMENTS.md`.
4. Đọc `docs/handoff/WP-xx.md` (nếu đã có), làm tiếp từ mục **"Việc tiếp theo"**.
5. Đọc `docs/handoff/REQUESTS.md` và `docs/handoff/BUGS.md`, xem có việc nào gửi cho WP mình không.
6. Lấy code mới nhất, tạo hoặc chuyển nhánh: `git checkout main && git pull && git checkout -b wp-xx/<viec-ngan>` (hoặc tiếp tục nhánh cũ của WP).
7. Chạy `npm run check` trước khi sửa, để biết lỗi có sẵn.

## 2. Trong khi làm

- **Chỉ sửa file thuộc WP mình** (cột "Sở hữu" trong WORKPLAN).
- **Cần thay đổi ở phần của WP khác:** không tự sửa. Ghi vào `docs/handoff/REQUESTS.md` theo mẫu:
  `- [ ] [WP-03 → WP-02][19/10] Cần hàm priceFor() trả thêm thuế suất. Lý do: FR-38.`
- **Thay đổi dữ liệu:** chỉ qua file migration `src/lib/db/migrations/wpXX_NNN_<ten>.ts`. Không sửa migration đã gộp vào `main`; muốn đổi thì viết migration mới.
- **Gặp chỗ bài làm không nói rõ:**
  1. Tra `docs/requirements/BUSINESS-RULES.md`, rồi `DECISIONS.md`.
  2. Không có thì ghi vào mục *Câu hỏi mở* của `DECISIONS.md` và chọn phương án an toàn: có người duyệt, không tự động.
- **Commit nhỏ**, thông điệp bắt đầu bằng WP và FR: `WP-03 FR-43: rủi ro có trạng thái Bỏ qua kèm lý do`.
- **Test** đặt tên bắt đầu bằng mã FR hoặc mã cổng: `FR-33: …`, `HG3: …`. Dùng mã FR bản 22/10 (bảng đổi mã cuối `REQUIREMENTS.md`).
- **Không đưa API key vào code**, log hay commit. Key chỉ nằm trong `.env.local` hoặc biến môi trường của nơi deploy.

## 3. Kết thúc một phiên (bắt buộc, kể cả khi chưa xong)

1. Chạy `npm run check`. Nếu đỏ do phần mình làm, sửa hoặc ghi rõ trong handoff.
2. Cập nhật `docs/handoff/WP-xx.md` theo mẫu `docs/handoff/_TEMPLATE.md`: đã xong FR nào, đang dở gì, quyết định đã dùng, câu hỏi, **việc tiếp theo** cụ thể đến mức AI khác đọc là làm được.
3. Cập nhật cột *Hiện trạng* của các FR đã xong trong `REQUIREMENTS.md`.
4. Commit và push nhánh. Nếu WP hoặc một phần WP đã xong: mở Pull Request vào `main`, tiêu đề `WP-xx: <tóm tắt>`, mô tả liệt kê FR đã cài và cách test.
5. Cập nhật dòng của WP trong `TASKBOARD.md` (trạng thái, người hoặc AI, ngày, link PR).

## 4. Luân phiên giữa các AI

- **Một WP chỉ do một AI làm tại một thời điểm.** File handoff là "gậy tiếp sức": AI sau đọc mục "Việc tiếp theo" của AI trước.
- **Chia một WP lớn cho nhiều AI:** người điều phối tách thành WP con trong TASKBOARD, ví dụ `WP-03a` (Đánh giá khách hàng: FR-30, FR-31, FR-33, FR-34) và `WP-03b` (Phát triển cơ hội: FR-35, FR-37 → FR-43, FR-45 → FR-47). Mỗi WP con phải được ghi rõ file sở hữu riêng.
- **Gợi ý phân việc theo thế mạnh:**
  - AI mạnh về suy luận làm WP-00, WP-03, WP-08 (nhiều quy tắc, nhiều cổng).
  - AI nhanh làm WP-02, WP-07, WP-09 (CRUD nhiều).
  - Một AI riêng làm WP-11 (kiểm thử) để không tự chấm bài mình.

## 5. Gộp code (người điều phối hoặc AI được giao vai "integrator")

1. **Mỗi PR phải:**
   - CI xanh (typecheck, lint, test, build).
   - Chỉ chạm file của WP đó, hoặc có REQUEST đã duyệt.
   - Có test cho FR đã khai.
2. **Thứ tự gộp theo đợt** trong WORKPLAN. PR phụ thuộc vào PR chưa gộp thì để Draft.
3. **Trước khi gộp:** `git pull --rebase origin main`, chạy lại `npm run check`.
4. **Sau khi gộp:** bản `main` tự deploy lên môi trường test (`docs/DEPLOY.md`). Kiểm nhanh trên link test, ghi lỗi vào `docs/handoff/BUGS.md`.
5. **Xung đột ở file dùng chung:** người điều phối quyết định, không để AI tự giải bằng cách xoá phần của WP khác.

## 6. Báo lỗi và sửa

- Ai phát hiện lỗi (người test, WP-11, AI khác) ghi vào `docs/handoff/BUGS.md`:
  `- [ ] BUG-007 [WP-04][mức: cao] Báo giá vượt 10 % vẫn gửi được (HG7). Tái hiện: … Mong đợi: …`
- WP sở hữu sửa trên nhánh `fix/BUG-007-…`, thêm test tái hiện lỗi, mở PR, tick lỗi khi đã gộp.

## 7. Những điều không được làm

- Không đổi câu chữ FR trong `REQUIREMENTS.md` cho "dễ code". Thấy FR sai thì ghi câu hỏi.
- Không thêm Customer Portal, Agent thứ ba, chức năng huỷ đơn, đổi DB hoặc ORM (xem `DECISIONS.md`).
- Không để Agent tự gửi email, tự đổi trạng thái, tự gộp hồ sơ, tự sửa trường lõi.
- Không tắt test, không `--no-verify`, không xoá test của WP khác để CI xanh.
- Không commit `.env.local`, `data/*.db`.
