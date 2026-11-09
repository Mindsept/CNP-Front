import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Topbar } from "./topbar";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/services/project.service", () => ({ projectService: { list } }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: { full_name: "Demo", email: "demo@example.com" },
    logout: vi.fn(),
  }),
}));
function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}
function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Topbar onMenuOpen={vi.fn()} />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
describe("Workspace search", () => {
  beforeEach(() =>
    list.mockReset().mockResolvedValue({
      items: [
        {
          id: "rabbit",
          name: "RabbitMQ demo",
          slug: "rabbitmq-demo",
          repositories_count: 2,
        },
        {
          id: "other",
          name: "Another project",
          slug: "other",
          repositories_count: 1,
        },
      ],
    }),
  );
  it("opens from the keyboard and navigates to a real filtered project", async () => {
    setup();
    expect(list).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    const search = screen.getByRole("textbox", {
      name: "Search projects and pages",
    });
    fireEvent.change(search, { target: { value: "rabbit" } });
    fireEvent.click(
      await screen.findByRole("button", { name: /RabbitMQ demo/ }),
    );
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/projects/rabbit",
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Search projects and pages" }),
      ).toHaveFocus(),
    );
  });
  it("keeps a retry available when the project service fails", async () => {
    list.mockRejectedValueOnce(new Error("offline"));
    setup();
    fireEvent.click(
      screen.getByRole("button", { name: "Search projects and pages" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Projects could not be loaded",
    );
    expect(screen.queryByText("No matching projects.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("button", { name: /RabbitMQ demo/ }),
    ).toBeInTheDocument();
  });
});
