import { render, screen } from "@testing-library/react";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "./protected-route";

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoading: false,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => auth,
}));

function CurrentLocation() {
  const location = useLocation();
  return <span>{location.pathname + location.search}</span>;
}

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/projects?tab=active"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/projects" element={<span>Protected content</span>} />
        </Route>
        <Route path="/login" element={<CurrentLocation />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoading = false;
  });

  it("preserves the requested URL when redirecting an anonymous user", () => {
    renderProtectedRoute();
    expect(
      screen.getByText("/login?next=%2Fprojects%3Ftab%3Dactive"),
    ).toBeInTheDocument();
  });

  it("renders protected content for a restored session", () => {
    auth.isAuthenticated = true;
    renderProtectedRoute();
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
