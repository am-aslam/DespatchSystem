"use client";

import React, { useEffect } from "react";
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";
  const isDanger = toast.type === "danger";

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in max-w-md w-full no-print">
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 bg-white ${
          isSuccess
            ? "border-[#15803D]/40 text-[#15803D]"
            : isDanger
            ? "border-[#DC2626]/40 text-[#DC2626]"
            : "border-[#B8860B]/40 text-[#B8860B]"
        }`}
      >
        <div className="shrink-0">
          {isSuccess && <CheckCircleIcon className="w-7 h-7 text-[#15803D]" />}
          {isDanger && <XCircleIcon className="w-7 h-7 text-[#DC2626]" />}
          {!isSuccess && !isDanger && <InformationCircleIcon className="w-7 h-7 text-[#B8860B]" />}
        </div>
        <div className="flex-1 font-semibold text-base text-[#1C1917]">
          {toast.message}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
          aria-label="Close notification"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
