"use client";

import React, { forwardRef } from "react";

const Select = forwardRef(function Select(
  {
    label,
    options = [],
    error,
    icon: Icon,
    className = "",
    required = false,
    children,
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
        <select
          ref={ref}
          className={`w-full bg-white text-[#1C1917] text-sm rounded-lg border border-[#E7E3DA] focus:outline-none focus:border-[#292524] focus:ring-1 focus:ring-[#292524] min-h-[38px] transition-colors cursor-pointer appearance-none ${
            Icon ? "pl-9 pr-8" : "px-3 pr-8"
          } ${error ? "border-[#DC2626]" : ""} ${className}`}
          {...props}
        >
          {children ? (
            children
          ) : (
            options.map((opt) => (
              <option key={opt.value || opt} value={opt.value || opt}>
                {opt.label || opt}
              </option>
            ))
          )}
        </select>
        <div className="absolute right-3 pointer-events-none text-[#78716C]">
          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

      {error && <span className="text-xs font-semibold text-[#DC2626]">{error}</span>}
    </div>
  );
});

export default Select;
