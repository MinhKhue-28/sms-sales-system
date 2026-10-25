# SMS – Sales Management System

Hệ thống quản lý hoạt động Sales cho doanh nghiệp B2B SaaS có dịch vụ triển khai, tích hợp 2 AI Agent:

- **Sales Qualification Agent:** sàng lọc khách hàng tiềm năng.  
- **Sales Opportunity Agent:** nghiên cứu và theo dõi cơ hội.

Đồ án môn Kiến trúc Hệ thống, UEH.

## Bắt đầu

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Mở [http\://localhost:3000](http://localhost:3000). Lần chạy đầu hệ thống tự tạo dữ liệu mẫu trong `data/sms.db`.

## Tài liệu

| Tài liệu | Nội dung |
| :---- | :---- |
| [AGENTS.md](http://AGENTS.md) | Điểm bắt đầu cho mọi AI và người code |
| [docs/requirements/REQUIREMENTS.md](http://docs/requirements/REQUIREMENTS.md) | 100 yêu cầu chức năng, 15 yêu cầu phi chức năng |
| [docs/requirements/BUSINESS-RULES.md](http://docs/requirements/BUSINESS-RULES.md) | Quy tắc nghiệp vụ và con số mặc định |
| [docs/requirements/DECISIONS.md](http://docs/requirements/DECISIONS.md) | Quyết định thiết kế đã chốt và mặc định |
| [docs/requirements/ROLES.md](http://docs/requirements/ROLES.md) | Vai trò, quyền, phạm vi dữ liệu |
| [docs/requirements/DATA-MODEL.md](http://docs/requirements/DATA-MODEL.md) | Thực thể ERD của bài ↔ bảng trong code |
| [docs/WORKPLAN.md](http://docs/WORKPLAN.md) | 12 gói việc và file thuộc từng gói |
| [docs/COLLABORATION.md](http://docs/COLLABORATION.md) | Quy trình nhiều AI làm song song |
| [docs/TASKBOARD.md](http://docs/TASKBOARD.md) | Bảng trạng thái các gói việc |
| [docs/DEPLOY.md](http://docs/DEPLOY.md) | Đưa lên môi trường test |
| [docs/VIBECODE-GUIDE.md](http://docs/VIBECODE-GUIDE.md) | Đặc tả kỹ thuật Agent và khung đánh giá |

## Các lệnh kiểm tra và phát triển

```sh
npm run dev          # Khởi động máy chủ dev
npm run typecheck    # Sinh type route và kiểm tra kiểu TypeScript
npm run lint         # Kiểm tra chuẩn mã nguồn bằng ESLint
npm test             # Chạy bộ test Vitest (DB in-memory, mock AI)
npm run check        # Kiểm tra toàn diện (= typecheck + lint + test)
npm run db:reset     # Xóa và tạo mới cơ sở dữ liệu mẫu
npm run fr:coverage  # Báo cáo độ phủ kiểm thử các mã FR và HG
npm run build        # Build ứng dụng cho môi trường production
```

## Tài khoản demo

Đăng nhập bằng Email và Mật khẩu (DEC-14, FR-97) hoặc chọn nhanh tài khoản tại trang `/login`:

**Mật khẩu dùng chung cho tất cả tài khoản demo:** `Password123!`

| Vai trò | Nhãn hiển thị | Email | Họ và tên | Chức danh | Mã NV |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `SALES` | Nhân viên kinh doanh | `an.nguyen@sms.local` | Nguyễn Văn An | SDR (Sales Development Rep) | `EMP-001` |
| `SALES` | Nhân viên kinh doanh | `binh.tran@sms.local` | Trần Thị Bình | Account Executive (AE) | `EMP-002` |
| `PRESALES` | Chuyên viên tư vấn kỹ thuật | `chau.le@sms.local` | Lê Minh Châu | Solution Engineer (SE) | `EMP-003` |
| `PRESALES_MANAGER` | Quản lý tư vấn giải pháp | `phuc.ngo@sms.local` | Ngô Tuấn Phúc | Quản lý tư vấn giải pháp | `EMP-004` |
| `SALES_MANAGER` | Quản lý kinh doanh | `dung.pham@sms.local` | Phạm Quốc Dũng | Quản lý kinh doanh | `EMP-005` |
| `FINANCE` | Nhân viên Tài chính – Kế toán | `ha.vo@sms.local` | Võ Thu Hà | Kế toán công nợ | `EMP-006` |
| `AI_MANAGER` | Người quản lý tác nhân AI | `tuan.le@sms.local` | Lê Hoàng Tuấn | Quản lý tác nhân AI | `EMP-007` |
| `ADMIN` | Người quản trị hệ thống | `khanh.hoang@sms.local` | Hoàng Gia Khánh | Quản trị hệ thống | `EMP-008` |