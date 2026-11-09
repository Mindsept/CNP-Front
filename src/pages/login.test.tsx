import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "./login";

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
  login: vi.fn<() => Promise<void>>(),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => auth,
}));

describe("LoginPage", () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
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

  it("starts OIDC without collecting a password", async () => {
    render(
      <MemoryRouter
        initialEntries={["/login?next=%2Fprojects%3Ftab%3Dactive"]}
      >
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /continue to sign in/i }),
    );

    await waitFor(() =>
      expect(auth.login).toHaveBeenCalledWith("/projects?tab=active"),
    );
  });
});
