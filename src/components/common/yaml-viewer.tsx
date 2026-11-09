import { useState } from "react";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface YamlViewerProps {
  yaml: string;
  filename?: string;
  className?: string;
  maxHeight?: number | string;
  language?: "yaml" | "json" | "bash" | "tsx" | "ts";
}

const cnpTheme: PrismTheme = {
  plain: {
    color: "#E5E7EB",
    backgroundColor: "transparent",
  },
  styles: [
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#9DA5AA", fontStyle: "italic" },
    },
    {
      types: ["punctuation"],
      style: { color: "#94A3B8" },
    },
    {
      types: ["property", "tag", "boolean", "number", "constant", "symbol"],
      style: { color: "#9FCBDC" },
    },
    {
      types: ["selector", "attr-name", "string", "char", "builtin"],
      style: { color: "#93C8AD" },
    },
    {
      types: ["operator", "entity", "url", "variable"],
      style: { color: "#E5BF7A" },
    },
    {
      types: ["atrule", "attr-value", "keyword"],
      style: { color: "#9FCBDC" },
    },
    {
      types: ["function", "class-name"],
      style: { color: "#93C8AD" },
    },
    {
      types: ["regex", "important"],
      style: { color: "#E5BF7A" },
    },
    {
      types: ["important", "bold"],
      style: { fontWeight: "bold" },
    },
    {
      types: ["italic"],
      style: { fontStyle: "italic" },
    },
    {
      types: ["deleted"],
      style: { color: "#F29186" },
    },
    {
      types: ["inserted"],
      style: { color: "#93C8AD" },
    },
    // YAML-specific anchors
    {
      types: ["key"],
      style: { color: "#9FCBDC", fontWeight: "500" },
    },
    {
      types: ["scalar"],
      style: { color: "#E5E7EB" },
    },
  ],
};

export function YamlViewer({
  yaml,
  filename = ".github/workflows/ci.yml",
  className,
  maxHeight = 540,
  language = "yaml",
}: YamlViewerProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(yaml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border border-border bg-background",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-surface/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/70" />
          <span className="truncate font-mono">{filename}</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </Button>
      </div>

      <div
        className="overflow-auto text-xs leading-relaxed"
        style={{ maxHeight }}
      >
        <Highlight code={yaml} language={language} theme={cnpTheme}>
          {({ className: hlClass, style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className={cn(
                hlClass,
                "m-0 grid grid-cols-[auto_1fr] gap-x-3 px-0 py-4 font-mono",
              )}
              style={{ ...style, background: "transparent" }}
            >
              {tokens.map((line, i) => {
                const { key: lineKey, ...lineProps } = getLineProps({
                  line,
                  key: i,
                });
                return (
                  <div
                    key={lineKey as React.Key}
                    {...lineProps}
                    className="contents"
                  >
                    <span
                      aria-hidden
                      className="select-none pl-4 pr-2 text-right text-muted-foreground/60 tabular-nums"
                    >
                      {i + 1}
                    </span>
                    <span className="whitespace-pre pr-4">
                      {line.map((token, key) => {
                        const { key: tKey, ...tokenProps } = getTokenProps({
                          token,
                          key,
                        });
                        return <span key={tKey as React.Key} {...tokenProps} />;
                      })}
                    </span>
                  </div>
                );
              })}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
