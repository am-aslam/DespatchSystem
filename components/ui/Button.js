"use client";

import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  disabled = false,
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-stone-400 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]";

  const variants = {
    primary:
      "bg-[#292524] text-white hover:bg-[#1C1917] border border-[#292524] shadow-xs",
    secondary:
      "bg-[#F5F2EC] text-[#1C1917] hover:bg-[#E8E4DC] border border-[#E7E3DA]",
    danger:
      "bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-[#DC2626] shadow-xs",
    outline:
      "bg-white text-[#1C1917] hover:bg-[#FAF8F5] border border-[#E7E3DA] shadow-xs",
    ghost:
      "bg-transparent text-[#1C1917] hover:bg-[#FAF8F5] border border-transparent",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs min-h-[34px] gap-1.5",
    md: "px-4 py-2 text-sm min-h-[38px] gap-2",
    lg: "px-5 py-2.5 text-base min-h-[44px] gap-2.5",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 shrink-0 stroke-[2]" />}
      <span>{children}</span>
    </button>
  );
}
