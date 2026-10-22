# SMS – Sales Management System

Hệ thống quản lý hoạt động Sales cho doanh nghiệp B2B SaaS có dịch vụ triển khai, tích hợp 2 AI Agent:
- **Sales Qualification Agent:** sàng lọc khách hàng tiềm năng.
- **Sales Opportunity Agent:** nghiên cứu và theo dõi cơ hội.

Đồ án môn Kiến trúc Hệ thống, UEH.

## Bắt đầu

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Mở http://localhost:3000. Lần chạy đầu hệ thống tự tạo dữ liệu mẫu trong `data/sms.db`.

## Tài liệu

| Tài liệu | Nội dung |
|---|---|
| [AGENTS.md](AGENTS.md) | Điểm bắt đầu cho mọi AI và người code |
| [docs/requirements/REQUIREMENTS.md](docs/requirements/REQUIREMENTS.md) | 100 yêu cầu chức năng, 15 yêu cầu phi chức năng |
| [docs/requirements/BUSINESS-RULES.md](docs/requirements/BUSINESS-RULES.md) | Quy tắc nghiệp vụ và con số mặc định |
| [docs/requirements/DECISIONS.md](docs/requirements/DECISIONS.md) | Quyết định thiết kế đã chốt và mặc định |
| [docs/requirements/ROLES.md](docs/requirements/ROLES.md) | Vai trò, quyền, phạm vi dữ liệu |
| [docs/requirements/DATA-MODEL.md](docs/requirements/DATA-MODEL.md) | Thực thể ERD của bài ↔ bảng trong code |
| [docs/WORKPLAN.md](docs/WORKPLAN.md) | 12 gói việc và file thuộc từng gói |
| [docs/COLLABORATION.md](docs/COLLABORATION.md) | Quy trình nhiều AI làm song song |
| [docs/TASKBOARD.md](docs/TASKBOARD.md) | Bảng trạng thái các gói việc |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Đưa lên môi trường test |
| [docs/VIBECODE-GUIDE.md](docs/VIBECODE-GUIDE.md) | Đặc tả kỹ thuật Agent và khung đánh giá |

## Tài khoản demo

Hiện đăng nhập bằng cách chọn người dùng mẫu. WP-00 sẽ chuyển sang email + mật khẩu (DEC-14) và cập nhật danh sách tài khoản, mật khẩu demo tại đây.
