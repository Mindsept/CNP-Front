import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProjectDetailPage } from "./project-detail";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "viewer", role: "user" } }),
}));
vi.mock("@/services/project.service", () => ({
  projectService: {
    get: async () => ({
      id: "p",
      name: "Demo project",
      slug: "demo",
      members: [
        { user_id: "viewer", email: "demo@example.com", role: "viewer" },
      ],
    }),
  },
}));
vi.mock("@/services/repository.service", () => ({
  repositoryService: { list: async () => ({ items: [] }) },
}));
vi.mock("@/services/cloud-target.service", () => ({
  cloudTargetService: {
    list: async () => ({
      items: [
        {
          id: "t",
          name: "AKS demo",
          provider: "azure",
          cluster_type: "aks",
          environment: "demo",
        },
      ],
    }),
  },
}));
vi.mock("@/components/cd/project-deployments-section", () => ({
  ProjectDeploymentsSection: () => <div>Deployment history</div>,
}));
vi.mock("@/components/observability/project-observability-card", () => ({
  ProjectObservabilityCard: () => <div>Project telemetry</div>,
}));
function Location() {
  const location = useLocation();
  return <output data-testid="location">{location.search}</output>;
}

describe("Project workspace", () => {
  it("restores a linked tab and preserves unrelated URL parameters when switching", async () => {
    render(
      <QueryClientProvider
        client={
          new QueryClient({ defaultOptions: { queries: { retry: false } } })
        }
      >
        <MemoryRouter
          initialEntries={["/projects/p?view=observability&source=demo"]}
        >
          <Routes>
            <Route
              path="/projects/:projectId"
              element={
                <>
                  <ProjectDetailPage />
                  <Location />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText("Project telemetry")).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Overview" }), {
      button: 0,
      ctrlKey: false,
    });
    expect(await screen.findByText("AKS demo")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent(
      "view=overview&source=demo",
    );
    expect(
      screen.queryByRole("link", { name: "Azure databases" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Configured")).toBeInTheDocument();
  });
});
