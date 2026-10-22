// Giá trị mặc định của tham số cấu hình (metadata). Admin chỉnh trong trang Quản trị.
export const SETTING_DEFAULTS: Record<string, { value: string; description: string }> = {
  bant_threshold: { value: "60", description: "Điểm BANT tối thiểu (0–100) để Lead đủ chuẩn chuyển đổi" },
  discount_threshold_pct: { value: "10", description: "Chiết khấu (%) vượt mức này cần Sales Manager duyệt" },
  manager_gate_mode: {
    value: "HIGH_OR_OPEN_RISK",
    description: "ADR-05: điều kiện Manager rà soát trước khi chuyển Develop→Propose (HIGH_OR_OPEN_RISK | ALWAYS | NEVER)",
  },
  ai_auto_convert: { value: "false", description: "ADR-03: AI được tự chuyển đổi Lead đơn lẻ (mặc định false = chỉ đề xuất)" },
  allow_direct_order: { value: "false", description: "ADR-07: cho phép tạo Order không qua Quote được chấp thuận (chưa hỗ trợ)" },
  agent_qualification_enabled: { value: "true", description: "Bật Sales Qualification Agent" },
  agent_opportunity_enabled: { value: "true", description: "Bật Sales Opportunity Agent" },
  opp_refresh_hours: { value: "6", description: "Chu kỳ làm mới nghiên cứu Opportunity (giờ) — tham số thiết kế, không phải SLA" },
  email_window_days: { value: "30", description: "Cửa sổ email Opportunity Agent được đọc (ngày)" },
  qualification_tcp: {
    value: "Doanh nghiệp B2B 50+ nhân sự, có đội Sales từ 5 người, ngành sản xuất / phân phối / dịch vụ CNTT, khu vực Việt Nam",
    description: "Hồ sơ khách hàng mục tiêu (TCP) — tiêu chí Admin cấu hình cho Agent",
  },
};
