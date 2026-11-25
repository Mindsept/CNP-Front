import { act, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import type { AnalysisJob } from "@/types/job";
import { RepositoryAnalysisPage } from "./repository-analysis";

const api = vi.hoisted(() => ({
  get: vi.fn().mockResolvedValue({ full_name: "demo/orders", default_branch: "main" }),
  latestAnalysis: vi.fn().mockResolvedValue(null),
  analysisJob: vi.fn<() => Promise<AnalysisJob | null>>(),
  analyze: vi.fn(),
}));
vi.mock("@/services/repository.service", () => ({ repositoryService: api }));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "operator" } }) }));

function openPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/repositories/r/analysis"]}>
        <Routes>
          <Route path="/repositories/:repositoryId/analysis" element={<RepositoryAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { client, view };
}

it("recovers a pending job after a fresh page load and displays its final status", async () => {
  const job: AnalysisJob = {
    id: "job-1", status: "queued", error: null,
    created_at: new Date().toISOString(), started_at: null, finished_at: null,
  };
  api.analysisJob.mockResolvedValue(job);
  const first = openPage();
  expect(await screen.findByText("Waiting for a worker")).toBeVisible();
  expect(screen.getByRole("button", { name: "Analyze repository" })).toBeDisabled();
  first.view.unmount();
  first.client.clear();

  api.analysisJob.mockResolvedValue({ ...job, status: "running", started_at: job.created_at });
  const reopened = openPage();
  expect(await screen.findByText("Worker is analyzing this repository")).toBeVisible();
  expect(screen.getByRole("link", { name: "View job" })).toHaveAttribute("href", "/jobs/job-1");
  expect(api.analyze).not.toHaveBeenCalled();
  api.analysisJob.mockResolvedValue({ ...job, status: "succeeded", finished_at: job.created_at });
  await act(() => reopened.client.invalidateQueries({ queryKey: ["repository", "r", "analysis-job"] }));
  expect(await screen.findByText("Analysis complete")).toBeVisible();
  expect(screen.getAllByRole("button", { name: "Analyze repository" })[0]).toBeEnabled();
});
