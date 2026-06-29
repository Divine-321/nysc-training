"use client";

import { useCallback, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

type ConfirmOptions = {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmState = {
  message: string;
  options: ConfirmOptions;
};

export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(
    (message: string, options: ConfirmOptions = {}) => {
      setState({ message, options });

      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [],
  );

  const handleChoice = (value: boolean) => {
    setState(null);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  const dialog = state ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            state.options.danger ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          <AlertTriangle
            size={22}
            className={state.options.danger ? "text-red-600" : "text-amber-700"}
          />
        </div>

        <h3 className="mb-2 text-lg font-bold text-gray-800">
          {state.options.title ?? "Are you sure?"}
        </h3>

        <p className="mb-5 text-sm text-gray-600">{state.message}</p>

        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => handleChoice(false)}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
          >
            {state.options.cancelLabel ?? "Cancel"}
          </button>

          <button
            type="button"
            onClick={() => handleChoice(true)}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white transition ${
              state.options.danger
                ? "bg-red-600 hover:bg-red-700"
                : "bg-[#1a6b3c] hover:bg-[#145530]"
            }`}
          >
            {state.options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
