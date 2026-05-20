import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  children: string;
  className?: string;
}

const components: Components = {
  h1: ({ className, ...props }) => (
    <h1
      className={cn(
        "mt-3 mb-2 text-base font-semibold tracking-tight text-foreground first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  h2: ({ className, ...props }) => (
    <h2
      className={cn(
        "mt-4 mb-2 text-sm font-semibold tracking-tight text-foreground first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  h3: ({ className, ...props }) => (
    <h3
      className={cn(
        "mt-3 mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  h4: ({ className, ...props }) => (
    <h4
      className={cn(
        "mt-3 mb-1 text-xs font-semibold text-foreground first:mt-0",
        className,
      )}
      {...props}
    />
  ),
  p: ({ className, ...props }) => (
    <p
      className={cn(
        "my-2 text-sm leading-relaxed text-foreground/90 first:mt-0 last:mb-0",
        className,
      )}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul
      className={cn(
        "my-2 ml-4 list-disc space-y-1 text-sm text-foreground/90 first:mt-0 last:mb-0 marker:text-primary/70",
        className,
      )}
      {...props}
    />
  ),
  ol: ({ className, ...props }) => (
    <ol
      className={cn(
        "my-2 ml-5 list-decimal space-y-1 text-sm text-foreground/90 first:mt-0 last:mb-0 marker:text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  li: ({ className, children, ...props }) => (
    <li
      className={cn(
        "pl-1 leading-relaxed [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1",
        className,
      )}
      {...props}
    >
      {children}
    </li>
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("font-semibold text-foreground", className)}
      {...props}
    />
  ),
  em: ({ className, ...props }) => (
    <em className={cn("italic text-foreground/95", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn(
        "font-medium text-primary underline-offset-2 hover:underline",
        className,
      )}
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ className, children, ...props }) => {
    const isInline = !/language-/.test(className ?? "");
    if (isInline) {
      return (
        <code
          className={cn(
            "rounded bg-surface-elevated px-1.5 py-0.5 font-mono text-[0.78rem] text-primary ring-1 ring-inset ring-border",
            className,
          )}
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <code
        className={cn("font-mono text-xs leading-relaxed", className)}
        {...props}
      >
        {children}
      </code>
    );
  },
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-3 overflow-x-auto rounded-md border border-border bg-[#080a13] p-3 text-xs",
        className,
      )}
      {...props}
    />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "my-3 border-l-2 border-primary/40 pl-3 text-sm italic text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr
      className={cn("my-4 border-border", className)}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="my-3 overflow-x-auto rounded-md border border-border">
      <table
        className={cn("w-full text-left text-sm", className)}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead
      className={cn(
        "border-b border-border bg-surface-elevated text-xs uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn("px-3 py-2 font-semibold", className)}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn("border-t border-border/60 px-3 py-2", className)}
      {...props}
    />
  ),
};

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={cn(
        "markdown-body [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
