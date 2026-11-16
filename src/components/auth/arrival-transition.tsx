import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react";
import { Check } from "lucide-react";
import { ArrivalContext } from "./arrival-context";
import { SpaceBackground } from "./space-background";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { Brand } from "@/components/common/brand";
import { Button } from "@/components/ui/button";

type Phase = "idle" | "welcome" | "travel" | "reveal";

// Lives above the router: navigation mounts the real destination behind the
// overlay, without destroying/restarting the tunnel at the route boundary.
export function ArrivalTransitionProvider({ children }: PropsWithChildren) {
  const [phase, setPhase] = useState<Phase>("idle");
  const active = useRef(false);
  const content = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const start = useCallback(() => {
    if (active.current || reduced) return;
    active.current = true;
    setPhase("welcome");
  }, [reduced]);
  const finish = useCallback(() => {
    active.current = false;
    setPhase("idle");
    requestAnimationFrame(() => content.current?.querySelector<HTMLElement>("#main-content")?.focus({ preventScroll: true }));
  }, []);

  useEffect(() => {
    if (phase === "idle") return;
    if (reduced) { finish(); return; }
    const delay = phase === "welcome" ? 900 : phase === "travel" ? 3300 : 1600;
    const timer = window.setTimeout(() => {
      if (phase === "welcome") setPhase("travel");
      else if (phase === "travel") setPhase("reveal");
      else finish();
    }, delay);
    return () => clearTimeout(timer);
  }, [phase, reduced, finish]);

  useEffect(() => {
    if (content.current) content.current.inert = phase !== "idle";
  }, [phase]);

  return <ArrivalContext.Provider value={start}>
    <div ref={content} className={`cnp-destination cnp-destination-${phase}`} aria-hidden={phase !== "idle" ? true : undefined}>{children}</div>
    {phase !== "idle" && <div className={`cnp-arrival-overlay cnp-arrival-${phase}`} data-testid="arrival-overlay">
      <SpaceBackground tunnel={phase !== "welcome"} />
      <header className="cnp-login-brand"><Brand size="lg" /></header>
      <main className="cnp-login-main"><div className={`cnp-login-card cnp-arrival-card ${phase !== "welcome" ? "is-leaving" : ""}`}>
        <Check aria-hidden="true" className="mx-auto mb-5 h-8 w-8 text-primary" />
        <p className="eyebrow">Signed in</p><h1 className="mt-3 text-3xl font-medium tracking-tight">Welcome aboard.</h1>
        <p className="mt-4 text-sm text-muted-foreground" role="status">Entering your workspace…</p>
      </div></main>
      <Button className="cnp-skip-intro" variant="outline" onClick={finish}>Skip animation</Button>
    </div>}
  </ArrivalContext.Provider>;
}
