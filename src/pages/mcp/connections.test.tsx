import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";
import { mcpService } from "@/services/mcp.service";
import { projectService } from "@/services/project.service";
import { McpConnectionsPage } from "./connections";

vi.mock("@/services/mcp.service", () => ({ mcpService: { connections: vi.fn(), addConnectionProject: vi.fn(), revoke: vi.fn() } }));
vi.mock("@/services/project.service", () => ({ projectService: { list: vi.fn() } }));

it("adds a manually selected project to the active connection and refreshes its count", async () => {
  const connection = { id: "grant-123", client_name: "Desktop", scopes: ["cnp:read"], project_ids: ["old"], created_at: "2026-11-24", revoked_at: null };
  let linked = false;
  vi.mocked(mcpService.connections).mockImplementation(async () => ({ items: [
    { ...connection, project_ids: linked ? ["old","new"] : ["old"] },
    { ...connection, id: "revoked", revoked_at: "2026-11-24" },
  ] }));
  vi.mocked(projectService.list).mockResolvedValue({
    items: ["old","new"].map(id => ({ id, name: id, slug: id, role: "owner", created_at: "", repositories_count: 0 })),
  });
  vi.mocked(mcpService.addConnectionProject).mockImplementation(async () => { linked = true; });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><McpConnectionsPage /></QueryClientProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Ajouter un projet" }));
  const select = await screen.findByRole("combobox", { name: "Projet" });
  expect(screen.queryByRole("option", { name: "old (/old)" })).toBeNull();
  const submit = screen.getByRole("button", { name: "Autoriser ce projet" });
  expect(submit).toBeDisabled();
  fireEvent.change(select, { target: { value: "new" } });
  fireEvent.click(submit);
  await waitFor(() => expect(mcpService.addConnectionProject).toHaveBeenCalledWith("grant-123", "new"));
  expect(await screen.findByText("2 authorized projects")).toBeInTheDocument();
});
