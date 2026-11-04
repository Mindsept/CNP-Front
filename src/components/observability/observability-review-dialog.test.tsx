import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ObservabilityPlan } from "@/types/observability";
import { ObservabilityReviewDialog } from "./observability-review-dialog";

const plan = {
  plan_id: "plan", binding_revision: 1, enabled: true, status: "preview", files: {},
  prerequisites: [], artifact_digest: "f".repeat(64), image_reference: "image@sha256:" + "a".repeat(64),
} as unknown as ObservabilityPlan;
const handlers = { onClose: vi.fn(), onApprove: vi.fn() };
describe("certificate renewal review", () => {
  it("shows the frozen policy while retaining explicit approval", () => {
    render(<ObservabilityReviewDialog plan={{ ...plan, certificate_renewal: "automatic-v1" }} canManage busy={false} error={null} {...handlers} />);
    expect(screen.getByText("Automatic certificate renewal")).toBeInTheDocument();
    expect(screen.getByText(/24 hours.*8 hours.*15 minutes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve activation" })).toBeDisabled();
  });
  it("does not silently label an older plan as renewable", () => {
    render(<ObservabilityReviewDialog plan={plan} canManage busy={false} error={null} {...handlers} />);
    expect(screen.queryByText("Automatic certificate renewal")).not.toBeInTheDocument();
  });
});
