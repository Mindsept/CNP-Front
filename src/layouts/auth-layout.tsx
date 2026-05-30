import { Outlet } from "react-router-dom";
import { Check, GitBranch } from "lucide-react";
import { Brand } from "@/components/common/brand";
import { PlasmaWave } from "@/components/common/plasma-wave";

const FEATURES = [
  "Repository analysis with stack & test detection",
  "CI & CD scaffolding for GitHub Actions and Kubernetes",
  "One-click deploy to Azure AKS via generated Pull Requests",
  "Live deployment tracking with project & app secrets",
];

export function AuthLayout() {
  return (
    <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_minmax(0,520px)]">
      {/* Marketing / hero side */}
      <div className="relative hidden overflow-hidden border-r border-border lg:block">
        {/* Plasma background */}
        <div className="absolute inset-0">
          <PlasmaWave
            colors={["#A855F7", "#06B6D4"]}
            speed1={0.05}
            speed2={0.05}
            focalLength={0.8}
            bend1={1}
            bend2={0.5}
            dir2={1}
            rotationDeg={0}
          />
        </div>

        {/* Readability overlays */}
        <div className="pointer-events-none absolute inset-0 bg-background/55" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/80 via-background/30 to-background/80" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(7,8,20,0.55)_70%,rgba(7,8,20,0.9)_100%)]" />

        {/* Content */}
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Brand size="md" />

          <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 backdrop-blur-md">
              <GitBranch className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-primary/90">
                From repository to production
              </span>
            </span>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl">
              Build, ship and{" "}
              <span className="text-gradient">deploy</span>
              <br />
              your apps in minutes.
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-foreground/75 xl:text-lg">
              Import a GitHub repository, analyze its stack, generate CI and CD
              workflows, deploy to Kubernetes through a Pull Request, then track
              the live deployment — all from one developer console.
            </p>

            <ul className="grid w-full grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              {FEATURES.map((line) => (
                <li
                  key={line}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-surface/40 px-4 py-3 backdrop-blur-md transition-colors hover:border-primary/40 hover:bg-surface/60"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 ring-1 ring-primary/30">
                    <Check className="h-3 w-3 text-primary" />
                  </span>
                  <span className="text-sm leading-snug text-foreground/90">
                    {line}
                  </span>
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
