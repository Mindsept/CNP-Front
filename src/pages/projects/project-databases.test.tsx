import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectDatabasesPage } from "./project-databases";
import { projectService } from "@/services/project.service";
import { cloudTargetService } from "@/services/cloud-target.service";
import { dbaasService } from "@/services/dbaas.service";

vi.mock("@/services/project.service", () => ({ projectService: { get: vi.fn() } }));
vi.mock("@/services/cloud-target.service", () => ({ cloudTargetService: { list: vi.fn() } }));
vi.mock("@/services/dbaas.service", () => ({ dbaasService: {
  awsDatabases: vi.fn(), azureDatabases: vi.fn(), createAwsDatabase: vi.fn(), createAzureDatabase: vi.fn(),
} }));
beforeEach(() => {
  vi.mocked(projectService.get).mockResolvedValue({ slug: "demo" } as never);
  vi.mocked(cloudTargetService.list).mockResolvedValue({ items: [
    { id: "eks", name: "aws-demo", provider: "aws", cluster_type: "eks", region: "eu-west-3", cluster_name: "eks" },
    { id: "aks", name: "azure-demo", provider: "azure", cluster_type: "aks", region: "austriaeast", cluster_name: "aks" },
  ] } as never);
  vi.mocked(dbaasService.awsDatabases).mockResolvedValue({ items: [] });
  vi.mocked(dbaasService.azureDatabases).mockResolvedValue({ items: [] });
});
function page(initialCloud?: "aws" | "azure") {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={["/projects/project/databases"]}><Routes><Route path="/projects/:projectId/databases" element={<ProjectDatabasesPage initialCloud={initialCloud} />} /></Routes></MemoryRouter>
  </QueryClientProvider>);
}
describe("PostgreSQL provider selection", () => {
  it("switches between the real AWS and Azure forms without creating resources", async () => {
    page();
    expect(await screen.findByText("Cluster Amazon EKS")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fournisseur cloud"), { target: { value: "azure" } });
    expect(await screen.findByText("Cluster Azure AKS")).toBeInTheDocument();
    expect(screen.queryByText("Cluster Amazon EKS")).not.toBeInTheDocument();
    expect(dbaasService.createAwsDatabase).not.toHaveBeenCalled();
    expect(dbaasService.createAzureDatabase).not.toHaveBeenCalled();
    expect(screen.getAllByRole("heading", { name: "Bases PostgreSQL" })).toHaveLength(1);
  });
  it("preserves an Azure entry point instead of selecting AWS", async () => {
    page("azure");
    expect(screen.getByLabelText("Fournisseur cloud")).toHaveValue("azure");
    expect(await screen.findByText("Cluster Azure AKS")).toBeInTheDocument();
  });
});
