import { Outlet } from "react-router-dom";
import {
  GitBranch,
  Layers2,
  ShieldCheck,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Brand } from "@/components/common/brand";
const steps = [
  {
    icon: GitBranch,
    number: "01",
    title: "Connect your code",
    text: "Bring your GitHub repositories into a shared project.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "Ship with confidence",
    text: "Review your CI/CD workflows before deployment.",
  },
  {
    icon: Activity,
    number: "03",
    title: "Understand every service",
    text: "Follow deployments, telemetry and incidents in one place.",
  },
];
export function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between border-r border-border bg-surface p-12 lg:flex xl:p-16">
        <Brand size="lg" />
        <div className="max-w-lg py-16">
          <p className="eyebrow mb-5">Your developer workspace</p>
          <h1 className="text-5xl font-medium leading-[1.12] tracking-[-.045em]">
            From the first commit.
            <br />
            <span className="text-primary">To the full picture.</span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Your code, deployments and observability. Connected in one platform,
            with control at every step.
          </p>
          <div className="mt-10 divide-y divide-border">
            {steps.map(({ icon: Icon, number, title, text }) => (
              <div key={number} className="flex gap-4 py-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background">
                  <Icon className="h-4 w-4 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                  {number}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Cloud Native Platform</span>
          <span className="flex items-center gap-2">
            <Layers2 className="h-3.5 w-3.5" />
            Built for your team
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
      <div className="flex min-h-dvh flex-col bg-background p-6 sm:p-10">
        <div className="lg:hidden">
          <Brand size="sm" />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-14">
          <Outlet />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          CNP · Cloud Native Platform
        </p>
      </div>
    </div>
  );
}
