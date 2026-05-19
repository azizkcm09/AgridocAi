/**
 * StatusBadge — one shared component for every DocumentStatus pill.
 *
 * Before this component each page rendered its own inline JSX with
 * hand-picked Tailwind classes (slate/indigo/amber/emerald/rose). They
 * drifted apart. This component is the only place that knows how a status
 * should look, so swapping the palette later is a one-file change.
 *
 * Colors map onto the design tokens declared in globals.css (var(--brand)
 * etc.) so the badge stays in sync with the rest of the agrifood palette.
 */

import type { ReactNode } from 'react';

export type DocumentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'REVIEW_REQUIRED'
  | 'VALIDATED'
  | 'REJECTED'
  | 'ERROR';

type Variant = {
  label: string;
  bg: string;
  fg: string;
  ring: string;
  icon: ReactNode;
};

const ICON_BASE = 'w-3 h-3';

const VARIANTS: Record<DocumentStatus, Variant> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-[color-mix(in_srgb,var(--foreground-muted)_10%,transparent)]',
    fg: 'text-[color:var(--foreground-muted)]',
    ring: 'ring-1 ring-[color:var(--border)]',
    icon: (
      <svg className={ICON_BASE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" strokeWidth={1.6} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M12 7v5l3 2" />
      </svg>
    ),
  },
  PROCESSING: {
    label: 'Processing',
    bg: 'bg-[color:var(--info-soft)]',
    fg: 'text-[color:var(--info)]',
    ring: 'ring-1 ring-[color:var(--info)]/30',
    icon: (
      <svg className={`${ICON_BASE} animate-spin`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeWidth={2}
          d="M12 3a9 9 0 019 9" />
      </svg>
    ),
  },
  REVIEW_REQUIRED: {
    label: 'Review required',
    bg: 'bg-[color:var(--warning-soft)]',
    fg: 'text-[color:var(--warning)]',
    ring: 'ring-1 ring-[color:var(--warning)]/30',
    icon: (
      <svg className={ICON_BASE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M12 9v3m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  VALIDATED: {
    label: 'Validated',
    bg: 'bg-[color:var(--success-soft)]',
    fg: 'text-[color:var(--success)]',
    ring: 'ring-1 ring-[color:var(--success)]/30',
    icon: (
      <svg className={ICON_BASE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-[color:var(--danger-soft)]',
    fg: 'text-[color:var(--danger)]',
    ring: 'ring-1 ring-[color:var(--danger)]/30',
    icon: (
      <svg className={ICON_BASE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  },
  ERROR: {
    label: 'Error',
    bg: 'bg-[color:var(--danger-soft)]',
    fg: 'text-[color:var(--danger)]',
    ring: 'ring-1 ring-[color:var(--danger)]/40 font-semibold',
    icon: (
      <svg className={ICON_BASE} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v5m0 3h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
      </svg>
    ),
  },
};

const FALLBACK: Variant = {
  label: 'Unknown',
  bg: 'bg-[color-mix(in_srgb,var(--foreground-muted)_10%,transparent)]',
  fg: 'text-[color:var(--foreground-muted)]',
  ring: 'ring-1 ring-[color:var(--border)]',
  icon: null,
};

type Props = {
  status: string;
  /** If false, only the label is shown — useful inside dense tables. */
  showIcon?: boolean;
  className?: string;
};

export default function StatusBadge({ status, showIcon = true, className = '' }: Props) {
  const variant = (VARIANTS as Record<string, Variant>)[status] ?? FALLBACK;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${variant.bg} ${variant.fg} ${variant.ring} ${className}`}
    >
      {showIcon && variant.icon}
      <span>{variant.label}</span>
    </span>
  );
}
