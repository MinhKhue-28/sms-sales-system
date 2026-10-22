# Bảng việc

Cập nhật dòng của WP mình khi bắt đầu và khi kết thúc phiên (xem `docs/COLLABORATION.md`). Mã FR theo bản đọc ngày 22/10/2026.

Trạng thái:
- **Chờ**: còn phụ thuộc WP chưa xong.
- **Sẵn sàng**: nhận được.
- **Đang làm**: đã có người hoặc AI nhận.
- **Chờ review**: đã mở PR.
- **Xong**: đã gộp vào `main`.

| WP | Tên | FR | Đợt | Phụ thuộc | Trạng thái | Người / AI | Cập nhật | PR / ghi chú |
|---|---|---|---|---|---|---|---|---|
| WP-00 | Nền móng và hợp đồng chung | — | 0 | — | Sẵn sàng | | | Phải xong trước mọi WP khác |
| WP-01 | Quản lý khách hàng | FR-01 → FR-05, FR-07 → FR-18 | 1 | WP-00 | Chờ | | | |
| WP-02 | Sản phẩm, dịch vụ, bảng giá | FR-21 → FR-29 | 1 | WP-00 | Chờ | | | |
| WP-07 | Đội ngũ Sales | FR-75 → FR-87 | 1 | WP-00 | Chờ | | | |
| WP-09 | Quản trị hệ thống | FR-96 → FR-100 | 1 | WP-00, WP-07 (`teams`) | Chờ | | | |
| WP-10 | Tích hợp, dữ liệu mẫu, triển khai | — | 1 | WP-00 | Chờ | | | |
| WP-03 | Đánh giá khách hàng và Phát triển cơ hội | FR-30, FR-31, FR-33 → FR-35, FR-37 → FR-43, FR-45 → FR-47 | 2 | WP-01, WP-02 | Chờ | | | Có thể tách 03a (FR-30, FR-31, FR-33, FR-34) / 03b (phần còn lại) |
| WP-08 | AI Agent | FR-06, FR-19, FR-20, FR-32, FR-36, FR-44, FR-88 → FR-95 | 2 | WP-01, WP-03, WP-07 | Chờ | | | Phần cấu hình và giám sát (FR-88 → FR-91) làm được từ đợt 1 |
| WP-04 | Đề xuất giải pháp và báo giá | FR-48 → FR-55 | 3 | WP-02, WP-03 | Chờ | | | |
| WP-05 | Đơn hàng | FR-56 → FR-63 | 4 | WP-04 | Chờ | | | |
| WP-06 | Hoá đơn và thanh toán | FR-64 → FR-74 | 5 | WP-05, WP-10 | Chờ | | | |
| WP-11 | Kiểm thử và đánh giá | 10 cổng, NFR | liên tục | WP-00 | Chờ | | | Bắt đầu ngay sau WP-00 |

## Quyết định cần nhóm chốt (ảnh hưởng code)

Xem `docs/requirements/DECISIONS.md`, mục *Việc nhóm cần sửa trong bài*. Các mục **Mặc định** quan trọng nhất:

- **DEC-12 (đã chốt OpenAI):** WP-08 phải viết adapter OpenAI; code hiện chỉ có adapter Claude.
- **DEC-11, DEC-24, DEC-26:** vai trò "Người quản lý tác nhân AI", "Quản lý tư vấn giải pháp" và ai cấu hình Agent.
- **DEC-21, DEC-23:** người liên hệ nhiều doanh nghiệp; báo giá – đơn 1:1, thanh toán từng phần.
- **DEC-08:** ai phát hành hoá đơn.
- **DEC-03:** Agent có tự chuyển đổi Lead không.
