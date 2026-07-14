import { useEffect } from 'react';
import type { ReactNode } from 'react';

/** Shared modal chrome: dimmed backdrop, click-outside + Escape to close. */
export default function Modal({
  onClose,
  maxWidth = 'max-w-md',
  padded = true,
  children,
}: {
  onClose: () => void;
  maxWidth?: string;
  padded?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidth} rounded-lg border border-neutral-800 bg-neutral-950 overflow-hidden ${
          padded ? 'p-6' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
