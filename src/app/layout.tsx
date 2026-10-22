import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Sales Hub", template: "%s · Sales Hub" },
  description: "Sales Management System cho doanh nghiệp B2B SaaS kết hợp dịch vụ triển khai, tích hợp AI Agent",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
