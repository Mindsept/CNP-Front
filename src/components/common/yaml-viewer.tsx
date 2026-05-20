import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

interface YamlViewerProps {
  yaml: string;
  filename?: string;
  className?: string;
  maxHeight?: number | string;
}

function highlightYaml(yaml: string): string {
  return yaml;
}

export function YamlViewer({
  yaml,
  filename = ".github/workflows/ci.yml",
  className,
  maxHeight = 540,
}: YamlViewerProps) {
  const formatted = useMemo(() => highlightYaml(yaml), [yaml]);

  return (
    <div className={cn("space-y-2", className)}>
      <CodeBlock
        code={formatted}
        language="yaml"
        filename={filename}
        maxHeight={maxHeight}
      />
    </div>
  );
}
