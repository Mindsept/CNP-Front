import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ProjectObservabilityCard } from "./project-observability-card";
import { observabilityService, openProjectGrafana } from "@/services/observability.service";
import type { ObservabilityBinding } from "@/types/observability";
vi.mock("@/services/observability.service", () => ({ observabilityService: { list: vi.fn() }, openProjectGrafana: vi.fn() }));
const row = { binding_id: "b", repository_id: "repo", service_key: "commerce", environment: "dev", cloud_target_id: "t", status: "active" } as ObservabilityBinding;
beforeEach(() => { vi.mocked(observabilityService.list).mockReset().mockResolvedValue({ items: [row], total: 1, offset: 0, limit: 20 }); vi.mocked(openProjectGrafana).mockReset().mockResolvedValue(); });
function setup() { const q = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={q}><MemoryRouter><ProjectObservabilityCard projectId="a" targets={[{ id: "t", name: "AKS Dev" }]}/></MemoryRouter></QueryClientProvider>); }
it("reads server state and opens external Grafana for this project", async () => {
  setup();
  await screen.findByText("commerce");
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByText(/AKS Dev/)).toBeInTheDocument();
  expect(observabilityService.list).toHaveBeenCalledWith("a", undefined, 0, undefined, undefined);
  fireEvent.click(screen.getByRole("button", { name: "Open Grafana" }));
  await waitFor(() => expect(openProjectGrafana).toHaveBeenCalledWith("a"));
});
it("paginates without hiding configurations beyond the first twenty", async () => {
  vi.mocked(observabilityService.list).mockImplementation(async (_p, _r, offset) => ({ items: [{ ...row, service_key: offset ? "stock" : "commerce" }], total: 21, limit: 20, offset: offset ?? 0 }));
  setup();
  await screen.findByText("commerce");
  fireEvent.click(screen.getByRole("button", { name: "Next applications" }));
  await screen.findByText("stock");
  expect(screen.queryByText("commerce")).not.toBeInTheDocument();
});
it("shows an unavailable status instead of a false Disabled state", async () => {
  vi.mocked(observabilityService.list).mockRejectedValue(new Error("Offline"));
  setup();
  await screen.findByText(/Observability status is unavailable/);
  expect(screen.queryByText("Disabled")).not.toBeInTheDocument();
});
