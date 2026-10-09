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
        <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>}
      </div>
      {children && (
        <div className="flex w-full flex-wrap items-stretch gap-2 sm:w-auto sm:items-center [&>a]:inline-flex [&>a]:min-h-[44px] [&>a]:flex-1 [&>a]:items-center [&>a]:justify-center [&>button]:inline-flex [&>button]:min-h-[44px] [&>button]:flex-1 [&>button]:items-center [&>button]:justify-center sm:[&>a]:flex-none sm:[&>button]:flex-none">
          {children}
        </div>
      )}
    </div>
  );
}
