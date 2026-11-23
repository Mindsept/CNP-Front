import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { mcpService } from "@/services/mcp.service";
import { ReviewedDeploymentStatus } from "./reviewed-deployment-status";

vi.mock("@/services/mcp.service", () => ({ mcpService: { deployment: vi.fn() } }));

it("shows the observed workflow outcome and refreshes the address", async () => {
  vi.mocked(mcpService.deployment)
    .mockResolvedValueOnce({ status: "failed", replicas_ready: false, public_address: null })
    .mockResolvedValueOnce({
      status: "succeeded", replicas_ready: true, available_replicas: 1,
      public_address: "192.0.2.1", public_url: "http://192.0.2.1",
    });
  render(<QueryClientProvider client={new QueryClient()}>
    <ReviewedDeploymentStatus actionId="operation" />
  </QueryClientProvider>);
  await screen.findByText("Deployment · failed");
  expect(screen.queryByRole("link", { name: "Open deployed app" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Refresh deployment status" }));
  const link = await screen.findByRole("link", { name: "Open deployed app" });
  expect(link.getAttribute("href")).toBe("http://192.0.2.1");
  expect(screen.getByText("192.0.2.1")).toBeTruthy();
});
