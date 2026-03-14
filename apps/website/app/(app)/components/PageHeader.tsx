'use client';

interface PageHeaderProps {
  title: string;
  children?: React.ReactNode;
  /** Optional description or subtitle */
  description?: string;
}

export function PageHeader({ title, children, description }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{title}</h1>
        {description && <p className="text-sm text-slate-600 mt-0.5">{description}</p>}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
