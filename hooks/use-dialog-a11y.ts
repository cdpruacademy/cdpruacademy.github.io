"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog behaviour for a panel: moves focus inside on open, keeps Tab inside,
 * closes on Escape and returns focus to whatever opened it. Attach the returned ref
 * to the element that has role="dialog".
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(isOpen: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const node = ref.current;
    const opener = document.activeElement as HTMLElement | null;

    const focusables = () =>
      node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null) : [];

    if (node && !node.contains(document.activeElement)) {
      const first = node.querySelector<HTMLElement>("[autofocus]") || focusables()[0];
      (first || node).focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (!node) return;
      // A confirm dialog stacked on top owns the keyboard until it closes
      const topConfirm = document.querySelector('[role="alertdialog"]');
      if (topConfirm && !node.contains(topConfirm)) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !node.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !node.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  return ref;
}
