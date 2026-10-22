// Bộ icon nét mảnh theo tinh thần Fluent System Icons (vẽ lại, không dùng tài nguyên của Microsoft).
const PATHS: Record<string, string> = {
  waffle: "M5 5h2v2H5zM11 5h2v2h-2zM17 5h2v2h-2zM5 11h2v2H5zM11 11h2v2h-2zM17 11h2v2h-2zM5 17h2v2H5zM11 17h2v2h-2zM17 17h2v2h-2z",
  home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  lead: "M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 20c0-3.6 2.9-6 6.5-6 1.2 0 2.3.3 3.2.8M18 14v6M15 17h6",
  account: "M4 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14M14 10h5a1 1 0 0 1 1 1v9M3 20h18M7.5 8.5h3M7.5 12h3M7.5 15.5h3M17 13.5v.01M17 16.5v.01",
  contact: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.5a2.5 2.5 0 0 1 0 5M18 14c1.8.6 3 2.2 3 4.5",
  opportunity: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 12.01V12",
  quote: "M7 3.5h7l4.5 4.5v12a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V4a.5.5 0 0 1 .5-.5zM14 3.5V8h4.5M9.5 12h6M9.5 15h6M9.5 18h3.5",
  order: "M3.5 5h2l2 10.5h10l2-7.5H6.5M9.5 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM17 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z",
  invoice: "M6 3.5h12v17l-2.5-1.5-2 1.5-1.5-1.5-1.5 1.5-2-1.5L6 20.5zM9 8h6M9 11.5h6M9 15h3.5",
  approval: "M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6zM8.8 12.2l2.2 2.2 4.3-4.6",
  sparkle: "M12 3.5l1.8 4.8 4.7 1.7-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.7zM18.5 15.5l.8 2 2 .7-2 .8-.8 2-.7-2-2-.8 2-.7z",
  product: "M12 3.5 20 7.5v9L12 20.5 4 16.5v-9zM4 7.5l8 4 8-4M12 11.5v9",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5l1.3 1-1.8 3.1-1.6-.5a7.4 7.4 0 0 1-1.7 1l-.3 1.7h-3.6l-.3-1.7a7.4 7.4 0 0 1-1.7-1l-1.6.5-1.8-3.1 1.3-1a7 7 0 0 1 0-2l-1.3-1 1.8-3.1 1.6.5a7.4 7.4 0 0 1 1.7-1l.3-1.7h3.6l.3 1.7a7.4 7.4 0 0 1 1.7 1l1.6-.5 1.8 3.1-1.3 1a7 7 0 0 1 0 2z",
  bell: "M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM15.5 15.5 20 20",
  add: "M12 5v14M5 12h14",
  save: "M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM8 4v5h7V4M8 20v-6h8v6",
  play: "M8 5.5v13l10-6.5z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  checkCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 12.3l2.3 2.3 4.7-5",
  dismiss: "M6 6l12 12M18 6 6 18",
  dismissCircle: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6",
  chevronRight: "M9.5 6l6 6-6 6",
  chevronDown: "M6 9.5l6 6 6-6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4",
  delete: "M5 7h14M10 4h4M7 7l1 13h8l1-13M10.5 10.5v6M13.5 10.5v6",
  flag: "M6 21V4M6 4h11l-2 4 2 4H6",
  warning: "M12 4 21 19.5H3zM12 10v4.5M12 17v.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5v.01",
  send: "M4 12 20 4l-4 16-4-6.5zM12 13.5 20 4",
  edit: "M5 19h3.5L19 8.5 15.5 5 5 15.5zM13.5 7l3.5 3.5",
  person: "M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5",
  signOut: "M14 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10",
  history: "M12 21a9 9 0 1 0-8.5-6M3 20v-5h5M12 7.5V12l3 2",
  money: "M3.5 7h17v10h-17zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 10v.01M17.5 14v.01",
  calendar: "M4.5 6h15v14h-15zM4.5 10h15M8.5 3.5v4M15.5 3.5v4",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M16 5.5a2.5 2.5 0 0 1 0 5M18 14c1.8.6 3 2.2 3 4.5",
  copy: "M8 8h11v12H8zM5 16V4h11",
  task: "M5 5h14v14H5zM8.5 12l2.5 2.5 4.5-5",
  shield: "M12 3.5 19 6v5.5c0 4.3-3 7.6-7 9-4-1.4-7-4.7-7-9V6z",
  bot: "M7 9h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2zM12 9V5.5M12 5.5a1 1 0 1 0 0-2M9.5 14h.01M14.5 14h.01M3 13v2M21 13v2",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  filter: "M4 5h16l-6 7.5V19l-4-2v-4.5z",
  box: "M4 7.5 12 4l8 3.5v9L12 20l-8-3.5zM4 7.5l8 3.5 8-3.5M12 11v9",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, className, strokeWidth = 1.5 }: { name: IconName; size?: number; className?: string; strokeWidth?: number }) {
  const filled = name === "waffle" || name === "play";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
