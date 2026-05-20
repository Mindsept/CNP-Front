import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
  maxHeight?: number | string;
}

export function CodeBlock({
  code,
  language,
  filename,
  className,
  maxHeight = 480,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-[#080a13]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-surface/60 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary/70" />
          <span className="font-mono">{filename ?? language ?? "code"}</span>
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
      <pre
        className="overflow-auto p-4 text-xs leading-relaxed text-foreground/90"
        style={{ maxHeight }}
      >
        <code className="font-mono">{code}</code>
      </pre>
    </div>
  );
}
