"use client";

import React from "react";

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}) {
  const variants = {
    gold: "bg-[#F5F2EC] text-[#292524] border border-[#D6CEBE] font-semibold",
    stone: "bg-[#FAF8F5] text-[#44403C] border border-[#E7E3DA] font-medium",
    success: "bg-[#15803D]/10 text-[#15803D] border border-[#15803D]/30 font-semibold",
    danger: "bg-[#DC2626]/10 text-[#DC2626] border border-[#DC2626]/30 font-semibold",
    zinc: "bg-stone-100 text-stone-800 border border-stone-300 font-medium",
    default: "bg-[#F5F2EC] text-[#1C1917] border border-[#E7E3DA] font-medium",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-[11px] rounded-md",
    md: "px-2.5 py-0.5 text-xs rounded-md",
    lg: "px-3 py-1 text-sm rounded-lg",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap ${
        variants[variant] || variants.default
      } ${sizes[size] || sizes.md} ${className}`}
    >
      {children}
    </span>
  );
}
