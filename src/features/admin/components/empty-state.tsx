import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IEmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** One or two sentences explaining what would put content here. */
  description?: string;
  /** Optional call to action, usually a Button. */
  action?: ReactNode;
  className?: string;
}

/** "Nothing here yet" panel — the empty state for every admin data surface. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: IEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="text-muted-foreground size-6" aria-hidden="true" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-muted-foreground mt-1 max-w-sm text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
