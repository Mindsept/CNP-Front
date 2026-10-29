import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectTrafficSection } from "./project-traffic-section";
import { mcpService } from "@/services/mcp.service";
import { ApiError } from "@/lib/errors";

vi.mock("@/services/mcp.service", () => ({ mcpService: { traffic: vi.fn(), prepareTraffic: vi.fn(), reconcileTraffic: vi.fn() } }));
vi.mock("@/hooks/use-toast-error", () => ({ useToastError: () => vi.fn() }));
const connected = {
  state: "connected", configuration: { pending_action_id: null, version: 1 },
  common_url: "http://demo.trafficmanager.net", preferred: "aws", effective: "aws", ttl: 30,
  dns: { state: "matches_destination" }, history: [],
  destinations: [{ name: "aws", cloud: "aws", target: "aws.example", health: "Online", priority: 1 },
    { name: "azure", cloud: "azure", target: "azure.example", health: "Online", priority: 2 }],
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mcpService.traffic).mockResolvedValue(connected as never);
  vi.mocked(mcpService.prepareTraffic).mockResolvedValue({ id: "review-one" } as never);
});
function page(role = "owner") {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter><Routes><Route path="/" element={<ProjectTrafficSection projectId="project" repositories={[{ id: "repo", full_name: "team/app" }]} role={role} />} />
      <Route path="/mcp/reviews/:id" element={<p>Confirmation humaine</p>} /></Routes></MemoryRouter>
  </QueryClientProvider>);
}
describe("Application traffic controls", () => {
  it("prepares an exact review rather than immediately switching traffic", async () => {
    page();
    expect(await screen.findByRole("link", { name: connected.common_url })).toHaveAttribute("href", connected.common_url);
    expect(screen.getByRole("button", { name: "Cloud préféré" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Basculer vers AZURE" }));
    expect(await screen.findByText("Confirmation humaine")).toBeInTheDocument();
    expect(mcpService.prepareTraffic).toHaveBeenCalledTimes(1);
    expect(mcpService.prepareTraffic).toHaveBeenCalledWith("repo", "azure");
    expect(mcpService.reconcileTraffic).not.toHaveBeenCalled();
  });
  it("blocks an unhealthy backup", async () => {
    vi.mocked(mcpService.traffic).mockResolvedValue({ ...connected, destinations: connected.destinations.map(d => d.name === "azure" ? { ...d, health: "Degraded" } : d) } as never);
    page();
    expect(await screen.findByRole("button", { name: "Basculer vers AZURE" })).toBeDisabled();
    expect(mcpService.prepareTraffic).not.toHaveBeenCalled();
  });
  it("keeps viewers in read-only mode", async () => {
    page("viewer");
    await screen.findByRole("link", { name: connected.common_url });
    expect(screen.queryByRole("button", { name: /Basculer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Configurer le routage" })).not.toBeInTheDocument();
  });
  it("does not claim an unconfigured profile is deployed", async () => {
    vi.mocked(mcpService.traffic).mockRejectedValue(new ApiError("Configure routing", 404, "traffic_not_configured"));
    page();
    expect(await screen.findByText(/Aucun routage commun configuré/)).toBeInTheDocument();
    expect(screen.queryByText("Cloud préféré")).not.toBeInTheDocument();
  });
  it("reconciles an uncertain result without preparing another switch", async () => {
    vi.mocked(mcpService.traffic).mockResolvedValue({ ...connected, configuration: { pending_action_id: "pending-one", version: 1 },
      history: [{ id: "pending-one", status: "indeterminate", destination: "azure", created_at: "2026-10-29T12:00:00Z" }] } as never);
    vi.mocked(mcpService.reconcileTraffic).mockResolvedValue({ status: "succeeded" } as never);
    page();
    expect(await screen.findByRole("button", { name: "Basculer vers AZURE" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Vérifier le résultat sans réessayer" }));
    await waitFor(() => expect(mcpService.reconcileTraffic).toHaveBeenCalledWith("pending-one"));
    expect(mcpService.prepareTraffic).not.toHaveBeenCalled();
  });
});
