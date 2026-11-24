import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login";

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  error: null as Error | null,
  login: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => auth,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
    auth.error = null;
    auth.login.mockReset().mockResolvedValue(undefined);
  });

  it("shows a persistent error and allows another attempt when OIDC fails", async () => {
    auth.login.mockRejectedValueOnce(new Error("request timed out"));
    render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Secure sign-in could not be started");
    const button = screen.getByRole("button", { name: /continue to sign in/i });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(auth.login).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the portal open until sign-in is requested, then preserves the return path", async () => {
    render(
      <MemoryRouter
        initialEntries={["/login?next=%2Fprojects%3Ftab%3Dactive"]}
      >
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();

    expect(auth.login).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));
    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith("/projects?tab=active"),
    );
  });

  it("unblocks retry when the OIDC library resolves a failed redirect and exposes error in context", async () => {
    let complete!: () => void;
    auth.login.mockImplementationOnce(() => new Promise<void>(resolve => { complete = resolve; }));
    const view = render(<MemoryRouter><LoginPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));
    expect(screen.getByRole("button", { name: /continue to sign in/i })).toBeDisabled();
    await act(async () => { auth.error = new Error("Failed to fetch"); complete(); });
    view.rerender(<MemoryRouter><LoginPage /></MemoryRouter>);
    expect(screen.getByRole("alert")).toHaveTextContent("Check that Keycloak is available");
    const retry = screen.getByRole("button", { name: /continue to sign in/i });
    expect(retry).toBeEnabled();
    auth.error = null;
    fireEvent.click(retry);
    expect(auth.login).toHaveBeenCalledTimes(2);
  });

  it("waits for an explicit sign-in when the session expired", () => {
    render(<MemoryRouter initialEntries={["/login?reason=session-expired"]}><LoginPage /></MemoryRouter>);
    expect(auth.login).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /continue to sign in/i }));
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
});
