import { lazy, Suspense } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { AnimationBoundary } from "./animation-boundary";
import "./space.css";
const Galaxy = lazy(() => import("./react-bits/Galaxy"));
const LightTunnel = lazy(() => import("./react-bits/LightTunnel"));

export function SpaceBackground({ tunnel = false }: { tunnel?: boolean }) {
  const reduced = useReducedMotion();
  return <div className={`cnp-space ${tunnel ? "cnp-space-travel" : ""}`} aria-hidden="true">
    {!reduced && <><AnimationBoundary><Suspense fallback={null}>
      <div className="cnp-space-galaxy"><Galaxy starColors={["#9fcbdc", "#d9e8ee", "#607e9c"]} density={0.8} speed={0.45} glowIntensity={0.25} twinkleIntensity={0.15} mouseInteraction={false} clickWarp={false} intro={false} dpr={1} /></div>
      </Suspense></AnimationBoundary>
      {tunnel && <AnimationBoundary><Suspense fallback={null}><div className="cnp-space-tunnel"><LightTunnel cableColor="#476c85" pulseColor="#b9e4ef" tunnelColor="#0a1019" colorVariance={false} speed={0.55} pulseSpeed={0.65} glow={0.3} mouseInteraction={false} clickSurge={false} intro={false} dpr={1} /></div></Suspense></AnimationBoundary>}
    </>}
    <div className="cnp-space-shade" />
  </div>;
}
