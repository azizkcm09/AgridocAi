'use client';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-lg bg-[color:var(--surface-muted)] flex items-center justify-center mb-4 text-[color:var(--brand)]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-[color:var(--foreground)]">{title}</h3>
      {description && (
        <p className="text-sm text-[color:var(--foreground-muted)] mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 bg-[color:var(--brand)] text-[color:var(--brand-contrast)] text-sm font-medium rounded-md hover:bg-[color:var(--brand-strong)] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
