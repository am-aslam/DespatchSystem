"use client";

import React, { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-xl",
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C1917]/50 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-6">
        <div
          className={`relative w-full ${maxWidth} transform overflow-hidden rounded-2xl bg-white p-6 sm:p-8 text-left shadow-xl border border-[#E7E2D9] transition-all duration-200 animate-fade-in`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-[#E7E2D9] mb-6">
            <div>
              <h3 className="text-2xl font-bold text-[#1C1917] tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-base text-[#78716C] mt-1">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#FAF9F6] transition-colors"
              aria-label="Close modal"
            >
              <XMarkIcon className="w-6 h-6 stroke-[2.2]" />
            </button>
          </div>

          {/* Content Body */}
          <div className="w-full">{children}</div>
        </div>
      </div>
    </div>
  );
}
