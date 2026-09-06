import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IPageHeaderProps {
  title: string;
  description?: string;
  /** Right-aligned slot for primary actions (e.g. a "New product" button). */
  actions?: ReactNode;
  className?: string;
}

/** The single `<h1>` for an admin page, with an optional action slot. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: IPageHeaderProps) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-start justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
