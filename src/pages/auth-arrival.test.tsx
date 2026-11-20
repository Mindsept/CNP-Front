import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthArrivalPage } from "./auth-arrival";
import { ArrivalTransitionProvider } from "@/components/auth/arrival-transition";

const state = vi.hoisted(() => ({ isAuthenticated: true, isLoading: false, error: null as Error | null, reduced: false }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ ...state, retryProfile: vi.fn(), logout: vi.fn() }) }));
vi.mock("@/components/auth/space-background", () => ({
  SpaceBackground: ({ tunnel }: { tunnel: boolean }) => <div data-testid="background">{tunnel ? "tunnel" : "galaxy"}</div>,
}));
vi.mock("@/hooks/use-reduced-motion", () => ({ useReducedMotion: () => state.reduced }));
function mount() {
  return render(<MemoryRouter initialEntries={["/auth/arrival?next=%2Fprojects%3Ftab%3Dactive"]}><ArrivalTransitionProvider><Routes>
    <Route path="/auth/arrival" element={<AuthArrivalPage />} />
    <Route path="/projects" element={<div>Protected destination</div>} />
    <Route path="/login" element={<div>Login destination</div>} />
  </Routes></ArrivalTransitionProvider></MemoryRouter>);
}
describe("authenticated arrival", () => {
  beforeEach(() => { Object.assign(state, { isAuthenticated: true, isLoading: false, error: null, reduced: false }); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());
  it("transitions from galaxy to tunnel then to the requested destination", () => {
    mount();
    expect(screen.getByTestId("background")).toHaveTextContent("galaxy");
    expect(screen.getByText("Protected destination").closest('.cnp-destination')).toHaveAttribute('aria-hidden', 'true');
    act(() => vi.advanceTimersByTime(900));
    expect(screen.getByTestId("background")).toHaveTextContent("tunnel");
    act(() => vi.advanceTimersByTime(3300));
    expect(screen.getByTestId("arrival-overlay")).toHaveClass("cnp-arrival-reveal");
    expect(screen.getByText("Protected destination").closest('.cnp-destination')).toHaveClass('cnp-destination-reveal');
    act(() => vi.advanceTimersByTime(1600));
    expect(screen.queryByTestId("arrival-overlay")).not.toBeInTheDocument();
    expect(screen.getByText("Protected destination").closest('.cnp-destination')).not.toHaveAttribute('aria-hidden');
    expect(screen.getByText("Protected destination")).toBeInTheDocument();
  });
  it("waits for the CNP profile before starting the transition", () => {
    state.isLoading = true; state.isAuthenticated = false;
    mount(); act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByTestId("background")).toHaveTextContent("galaxy");
    expect(screen.queryByText("Protected destination")).not.toBeInTheDocument();
  });
  it("shows profile errors instead of entering the dashboard", () => {
    state.error = new Error("Profile unavailable");
    mount(); act(() => vi.advanceTimersByTime(10000));
    expect(screen.getByRole("alert")).toHaveTextContent("Profile unavailable");
    expect(screen.queryByText("Protected destination")).not.toBeInTheDocument();
  });
  it("skips animation for reduced motion", () => {
    state.reduced = true; mount();
    expect(screen.getByText("Protected destination")).toBeInTheDocument();
    expect(screen.queryByTestId("arrival-overlay")).not.toBeInTheDocument();
  });
  it("lets the user skip and cleans up navigation timers", () => {
    mount(); fireEvent.click(screen.getByRole("button", { name: "Skip animation" }));
    expect(screen.getByText("Protected destination")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(20));
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not treat an unauthenticated visit as success", () => {
    state.isAuthenticated = false; mount();
    expect(screen.getByText("Login destination")).toBeInTheDocument();
  });
});
