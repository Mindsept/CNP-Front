import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpaceBackground } from "./space-background";

const effects = vi.hoisted(() => ({ reduced: false, tunnelFails: false }));

vi.mock("@/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => effects.reduced,
}));

// Reject the lazy module itself, as happens when a deployed chunk is unavailable.
vi.mock("./react-bits/Galaxy", () => {
  throw new TypeError("Failed to fetch dynamically imported module: Galaxy.js");
});

vi.mock("./react-bits/LightTunnel", () => ({
  default: () => {
    if (effects.tunnelFails) throw new Error("WebGL initialization failed");
    return <canvas data-testid="tunnel" />;
  },
}));

describe("SpaceBackground failure isolation", () => {
  beforeEach(() => {
    effects.reduced = false;
    effects.tunnelFails = false;
    // React reports caught errors to the console in development.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps the page interactive and the other effect visible when Galaxy import rejects", async () => {
    const signIn = vi.fn();
    const { container } = render(<>
      <SpaceBackground tunnel />
      <button onClick={signIn}>Sign in</button>
    </>);

    expect(await screen.findByTestId("tunnel")).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector(".cnp-space-galaxy")).toBeNull());
    expect(container.querySelector(".cnp-space-shade")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(signIn).toHaveBeenCalledOnce();
  });

  it("retains the CSS background and page when both effects fail", async () => {
    effects.tunnelFails = true;
    const { container } = render(<>
      <SpaceBackground tunnel />
      <h1>Workspace</h1>
    </>);

    await waitFor(() => {
      expect(container.querySelector(".cnp-space-galaxy")).toBeNull();
      expect(container.querySelector(".cnp-space-tunnel")).toBeNull();
    });
    expect(screen.getByRole("heading", { name: "Workspace" })).toBeInTheDocument();
    expect(container.querySelector(".cnp-space")).toBeInTheDocument();
    expect(container.querySelector(".cnp-space-shade")).toBeInTheDocument();
  });

  it("keeps reduced-motion mode free of animated effects", () => {
    effects.reduced = true;
    const { container } = render(<SpaceBackground tunnel />);
    expect(container.querySelector(".cnp-space-galaxy")).toBeNull();
    expect(container.querySelector(".cnp-space-tunnel")).toBeNull();
    expect(container.querySelector(".cnp-space-shade")).toBeInTheDocument();
  });
});
