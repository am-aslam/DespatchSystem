"use client";

import React, { forwardRef } from "react";

const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    className = "",
    type = "text",
    required = false,
    ...props
  },
  ref
) {
  return (
    <div className="w-full flex flex-col gap-1">
      {label && (
        <label className="text-xs font-semibold text-[#1C1917] flex items-center gap-1">
          {label}
          {required && <span className="text-[#DC2626] font-bold">*</span>}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {Icon && (
          <div className="absolute left-3 pointer-events-none text-[#78716C]">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          type={type}
          className={`w-full bg-white text-[#1C1917] text-sm placeholder-[#A89F91] rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:ring-1 focus:ring-[#292524] min-h-[38px] transition-colors ${
            Icon ? "pl-9 pr-3" : "px-3"
          } ${error ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]" : ""} ${className}`}
          {...props}
        />
      </div>

      {error && (
        <span className="text-xs font-semibold text-[#DC2626]">{error}</span>
      )}
      {helperText && !error && (
        <span className="text-xs text-[#78716C]">{helperText}</span>
      )}
    </div>
  );
});

export default Input;
