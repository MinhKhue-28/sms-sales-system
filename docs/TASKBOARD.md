# Bảng việc

Cập nhật dòng của WP mình khi bắt đầu và khi kết thúc phiên (xem `docs/COLLABORATION.md`).

Trạng thái:
- **Chờ**: còn phụ thuộc WP chưa xong.
- **Sẵn sàng**: nhận được.
- **Đang làm**: đã có người hoặc AI nhận.
- **Chờ review**: đã mở PR.
- **Xong**: đã gộp vào `main`.

| WP | Tên | FR | Đợt | Phụ thuộc | Trạng thái | Người / AI | Cập nhật | PR / ghi chú |
|---|---|---|---|---|---|---|---|---|
| WP-00 | Nền móng và hợp đồng chung | — | 0 | — | Sẵn sàng | | | Phải xong trước mọi WP khác |
| WP-01 | Quản lý khách hàng | FR-01 → FR-17 | 1 | WP-00 | Chờ | | | |
| WP-02 | Sản phẩm, dịch vụ, bảng giá | FR-18 → FR-26 | 1 | WP-00 | Chờ | | | |
| WP-07 | Đội ngũ Sales | FR-69 → FR-81 | 1 | WP-00 | Chờ | | | |
| WP-09 | Quản trị hệ thống | FR-96 → FR-100 | 1 | WP-00, WP-07 (Pod) | Chờ | | | |
| WP-10 | Tích hợp, dữ liệu mẫu, triển khai | — | 1 | WP-00 | Chờ | | | |
| WP-03 | Qualify và Develop | FR-27 → FR-41 | 2 | WP-01, WP-02 | Chờ | | | Có thể tách 03a (FR-27 → FR-30) / 03b (FR-31 → FR-41) |
| WP-08 | AI Agent | FR-82 → FR-95 | 2 | WP-01, WP-03, WP-07 | Chờ | | | Phần cấu hình và giám sát (FR-82 → FR-85) làm được từ đợt 1 |
| WP-04 | Đề xuất và báo giá | FR-42 → FR-49 | 3 | WP-02, WP-03 | Chờ | | | |
| WP-05 | Đơn hàng | FR-50 → FR-57 | 4 | WP-04 | Chờ | | | |
| WP-06 | Hoá đơn và thanh toán | FR-58 → FR-68 | 5 | WP-05, WP-10 | Chờ | | | |
| WP-11 | Kiểm thử và đánh giá | 10 cổng, NFR | liên tục | WP-00 | Chờ | | | Bắt đầu ngay sau WP-00 |

## Quyết định cần nhóm chốt (ảnh hưởng code)

Xem `docs/requirements/DECISIONS.md`. Các mục **Mặc định** quan trọng nhất:

- **DEC-12:** nhà cung cấp mô hình AI (sơ đồ ghi OpenAI, code dùng Claude).
- **DEC-11:** vai trò "Người quản lý tác nhân AI".
- **DEC-08:** ai phát hành hoá đơn.
- **DEC-03:** Agent có tự chuyển đổi Lead không.
