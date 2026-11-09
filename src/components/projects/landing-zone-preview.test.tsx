import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectLandingZone } from "./project-landing-zone";
import {
  defaultLandingZonePreview,
  readLandingZonePreview,
  saveLandingZonePreview,
} from "@/lib/landing-zone-preview";
import { projectService } from "@/services/project.service";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "demo-user" } }),
}));
vi.mock("@/services/project.service", () => ({
  projectService: { create: vi.fn() },
}));
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock("@/hooks/use-toast-error", () => ({ useToastError: () => vi.fn() }));

function Location() {
  const location = useLocation();
  return (
    <output aria-label="Current route">
      {location.pathname}
      {location.search}
    </output>
  );
}

function creationDialog() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <MemoryRouter>
        <CreateProjectDialog open onOpenChange={vi.fn()} />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(projectService.create).mockReset();
  vi.mocked(projectService.create).mockResolvedValue({
    id: "new-project",
    name: "Demo",
    slug: "demo",
    description: null,
    owner_id: "demo-user",
  });
});

describe("Landing zone preview boundaries", () => {
  it("creates a real project with only supported API fields and keeps the AI scenario locally", async () => {
    creationDialog();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Demo" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "AI" }));
    fireEvent.change(screen.getByLabelText("Requested SLA"), {
      target: { value: "99.99" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Add LiteLLM gateway to preview" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await waitFor(() =>
      expect(projectService.create).toHaveBeenCalledWith({
        name: "Demo",
        slug: "demo",
        description: undefined,
      }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Current route")).toHaveTextContent(
        "/projects/new-project?view=landing-zone",
      ),
    );
    expect(readLandingZonePreview("demo-user", "new-project")).toEqual({
      version: 1,
      applicationType: "ai",
      availability: "99.99",
      aiModules: ["litellm"],
    });
    expect(projectService.create).toHaveBeenCalledTimes(1);
  });

  it("does not save a preview or leave the form when project creation fails", async () => {
    vi.mocked(projectService.create).mockRejectedValue(
      new Error("Unavailable"),
    );
    creationDialog();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Demo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(projectService.create).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create project" }),
      ).toBeEnabled(),
    );
    expect(readLandingZonePreview("demo-user", "new-project")).toBeNull();
    expect(screen.getByLabelText("Current route")).toHaveTextContent(/^\/$/);
  });

  it("warns when the project exists but local preview storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    creationDialog();
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Demo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() =>
      expect(toast.warning).toHaveBeenCalledWith(
        expect.stringContaining("could not be saved"),
      ),
    );
    expect(projectService.create).toHaveBeenCalledTimes(1);
  });

  it("shows one, two and three simulated targets while retaining Azure for demo execution", () => {
    render(<ProjectLandingZone projectId="p" userId="u" />);
    expect(screen.getByText("1 simulated target")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Requested SLA"), {
      target: { value: "99.9" },
    });
    expect(screen.getByText("2 simulated targets")).toBeInTheDocument();
    expect(screen.getByText("AWS · EKS")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Requested SLA"), {
      target: { value: "99.99" },
    });
    expect(screen.getByText("Private · k3s")).toBeInTheDocument();
    expect(screen.getByText(/Demo execution target:/)).toHaveTextContent(
      "Azure · AKS",
    );
    expect(projectService.create).not.toHaveBeenCalled();
  });

  it("saves AI selections, restores them after remount and discards uncommitted changes", () => {
    const first = render(<ProjectLandingZone projectId="p" userId="u" />);
    fireEvent.click(screen.getByRole("radio", { name: "AI" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Add vLLM inference to preview" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save preview" }));
    first.unmount();
    render(<ProjectLandingZone projectId="p" userId="u" />);
    expect(screen.getByRole("radio", { name: "AI" })).toBeChecked();
    expect(
      screen.getByRole("button", {
        name: "Remove vLLM inference from preview",
      }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("radio", { name: "API" }));
    expect(
      screen.queryByRole("button", { name: /vLLM inference/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(screen.getByRole("radio", { name: "AI" })).toBeChecked();
    expect(projectService.create).not.toHaveBeenCalled();
  });

  it("keeps previews separate for different users and projects", () => {
    saveLandingZonePreview("u", "p", {
      ...defaultLandingZonePreview(),
      applicationType: "api",
    });
    expect(readLandingZonePreview("u", "p")?.applicationType).toBe("api");
    expect(readLandingZonePreview("other-user", "p")).toBeNull();
    expect(readLandingZonePreview("u", "other-project")).toBeNull();
  });

  it("recovers from invalid stored data and reports save failures without a false success", () => {
    saveLandingZonePreview("u", "p", defaultLandingZonePreview());
    const key = window.localStorage.key(0)!;
    window.localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        applicationType: "unsupported",
        availability: "100",
      }),
    );
    expect(readLandingZonePreview("u", "p")).toBeNull();
    render(<ProjectLandingZone projectId="p" userId="u" />);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage blocked");
    });
    fireEvent.click(screen.getByRole("button", { name: "Save preview" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save");
    expect(screen.getByRole("button", { name: "Save preview" })).toBeEnabled();
  });
});
