import React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200">
          <h3 id="modal-title" className="text-lg font-semibold text-slate-800">
            {title}
          </h3>
        </div>
        <div className="px-5 py-4 text-slate-700">{children}</div>
        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
          {footer}
        </div>
      </div>
    </div>
  );
}
