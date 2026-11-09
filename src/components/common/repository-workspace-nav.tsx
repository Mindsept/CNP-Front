import { NavLink } from "react-router-dom";
import { GitBranch, Microscope, Rocket, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";

export function RepositoryWorkspaceNav({
  repositoryId,
}: {
  repositoryId: string;
}) {
  const root = `/repositories/${repositoryId}`;
  const links = [
    { to: root, label: "Repository", icon: GitBranch },
    { to: `${root}/analysis`, label: "Analysis", icon: Microscope },
    { to: `${root}/ci`, label: "Continuous integration", icon: Workflow },
    { to: `${root}/cd`, label: "Delivery & observability", icon: Rocket },
  ];
  return (
    <nav
      aria-label="Repository workspace"
      className="flex min-w-0 gap-1 overflow-x-auto border-b border-border"
    >
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          end
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )
          }
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
