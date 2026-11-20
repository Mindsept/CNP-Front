import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, type LucideIcon } from "lucide-react";
interface BackProps {
  to?: string;
  label?: string;
}
interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  back?: BackProps;
}
export function PageHeader({
  title,
  description,
  eyebrow,
  icon: Icon,
  actions,
  back,
}: PageHeaderProps) {
  return (
    <div className="min-w-0">
      {back && <BackLink {...back} />}
      <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
        <div className="flex min-w-0 items-start gap-4">
          {Icon && (
            <div className="mt-1 hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-surface sm:flex">
              <Icon
                className="h-5 w-5 text-primary"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-2 break-words">{eyebrow}</p>}
            <h1 className="break-words text-[26px] font-semibold leading-tight tracking-[-0.035em] sm:text-[32px]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
function BackLink({ to, label }: BackProps) {
  const navigate = useNavigate();
  const content = (
    <>
      <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label ? `Back to ${label}` : "Back"}</span>
    </>
  );
  const className = "section-link mb-3 text-xs";
  return to ? (
    <Link to={to} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={() => navigate(-1)}>
      {content}
    </button>
  );
}
