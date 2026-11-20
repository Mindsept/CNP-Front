import { createContext, useContext } from "react";

export const ArrivalContext = createContext<(() => void) | null>(null);
export function useArrivalTransition() {
  const start = useContext(ArrivalContext);
  if (!start) throw new Error("ArrivalTransitionProvider is required");
  return start;
}
