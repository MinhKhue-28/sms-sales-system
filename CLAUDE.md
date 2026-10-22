# SMS Web: Sales Management System (B2B SaaS + triển khai, tích hợp AI Agent)

@AGENTS.md

Đồ án môn Kiến trúc Hệ thống (SA). Toàn bộ quy trình, đặc tả và luật làm việc nằm trong `AGENTS.md` ở trên và thư mục `docs/`. File này chỉ thêm phần riêng cho Claude Code.

## Skills dùng cho dự án

| Việc | Skill |
|---|---|
| Nghiệp vụ, entity, trạng thái, phân quyền | `sms-domain` (project). Khi skill và `docs/requirements/*` lệch nhau, `docs/requirements/*` thắng |
| 2 AI Agent, guardrails, human gates | `sms-ai-agents` (project) + `claude-api` |
| Full-stack, API + UI + bảo mật | `fullstack-guardian`, `secure-code-guardian` |
| Frontend | `nextjs-developer`, `react-expert`, `typescript-pro` |
| Schema, migration, query, ERD | `sql-pro` |
| Dashboard pipeline/forecast | `dataviz` |
| E2E test | `playwright-expert` |

## Nhắc lại ngắn

- Bắt đầu phiên: đọc `docs/TASKBOARD.md`, nhận đúng một WP, đọc `docs/handoff/WP-xx.md`.
- Kết thúc phiên: cập nhật handoff, TASKBOARD, cột Hiện trạng trong `docs/requirements/REQUIREMENTS.md`, commit, push.
