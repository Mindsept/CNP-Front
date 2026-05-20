import { Outlet } from "react-router-dom";
import { Brand } from "@/components/common/brand";

export function AuthLayout() {
  return (
    <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Marketing / hero side */}
      <div className="relative hidden overflow-hidden border-r border-border lg:block">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Brand size="md" />
          <div className="max-w-md space-y-6">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary/80">
              Onboard any repository
            </p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">
              Ship a production-ready{" "}
              <span className="text-gradient">CI pipeline</span> in minutes.
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Import a GitHub repository, analyze its stack, generate a tailored
              workflow, then open a Pull Request — all from one developer
              console.
            </p>
            <ul className="space-y-3 text-sm text-foreground/90">
              {[
                "Repository analysis with stack & test detection",
                "Deterministic CI scaffolding for GitHub Actions",
                "AI-assisted adaptations with diff summaries",
                "Project-scoped secrets management",
              ].map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2.5 leading-relaxed"
                >
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Cloud Native Platform · Internal
            developer tooling
          </p>
        </div>
      </div>

      {/* Form side */}
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="lg:hidden absolute left-6 top-6">
          <Brand size="sm" />
        </div>
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
