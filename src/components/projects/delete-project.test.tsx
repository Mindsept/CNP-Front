import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { projectService } from "@/services/project.service";
import { DeleteProject } from "./delete-project";

vi.mock("@/services/project.service", () => ({ projectService: { remove: vi.fn() } }));

it("requires the exact name on each opening and returns to projects after deletion", async () => {
  vi.mocked(projectService.remove).mockResolvedValue(undefined);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/settings"]}>
        <Routes>
          <Route path="/settings" element={<DeleteProject id="test-id" name="Démo API" />} />
          <Route path="/projects" element={<h1>Projects</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const open = () => {
    fireEvent.click(screen.getByRole("button", { name: "Delete project" }));
    return within(screen.getByRole("dialog"));
  };
  let dialog = open();
  const confirm = () => dialog.getByRole("button", { name: "Delete project" }) as HTMLButtonElement;
  const type = (name: string) => fireEvent.change(dialog.getByRole("textbox"), { target: { value: name } });
  type("démo API");
  expect(confirm().disabled).toBe(true);
  type("Démo API");
  fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
  expect(projectService.remove).not.toHaveBeenCalled();
  dialog = open();
  expect(confirm().disabled).toBe(true);
  type("Démo API");
  fireEvent.click(confirm());
  expect(await screen.findByRole("heading", { name: "Projects" })).toBeTruthy();
  expect(projectService.remove).toHaveBeenCalledWith("test-id", "Démo API");
});
