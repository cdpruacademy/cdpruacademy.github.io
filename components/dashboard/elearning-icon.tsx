import * as React from "react";

interface ElearningMonitorIconProps {
  className?: string;
  color?: "red" | "blue" | "gray";
}

export function ElearningMonitorIcon({ className, color = "red" }: ElearningMonitorIconProps) {
  let borderColor = "border-[#ED1C24]";
  let strokeColor = "#ED1C24";
  let title = "Current Active Phase Milestone";

  if (color === "blue") {
    borderColor = "border-[#0066CC]";
    strokeColor = "#0066CC";
  } else if (color === "gray") {
    borderColor = "border-gray-300";
    strokeColor = "#9CA3AF";
    title = "Inactive Phase Icon";
  }

  return (
    <div
      className={`relative flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 ${borderColor} shadow-xs transition-colors`}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className || "w-4 h-4"}
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
        {/* Open book / document inside monitor */}
        <path d="M7 8c1.5-1 3.5-1 5 0v5c-1.5-1-3.5-1-5 0V8z" strokeWidth="1.5" />
        <path d="M12 8c1.5-1 3.5-1 5 0v5c-1.5-1-3.5-1-5 0V8z" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
