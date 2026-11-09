import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Github,
  ScrollText,
  ShieldCheck,
  Cable,
  Server,
  ArrowUpRight,
} from "lucide-react";
import { Brand } from "@/components/common/brand";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const groups = [
  {
    title: "Workspace",
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/projects", label: "Projects", icon: FolderKanban, end: false },
      { to: "/github", label: "GitHub", icon: Github, end: false },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        to: "/mcp/reviews",
        label: "Human reviews",
        icon: ShieldCheck,
        end: false,
      },
      { to: "/audit", label: "Audit log", icon: ScrollText, end: false },
      {
        to: "/mcp/connections",
        label: "MCP connections",
        icon: Cable,
        end: false,
      },
    ],
  },
];
export function Sidebar({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const { user } = useAuth();
  const location = useLocation();
  return (
    <aside
      className={cn(
        "h-full shrink-0 flex-col bg-surface",
        mobile
          ? "flex w-full"
          : "hidden w-[232px] border-r border-border lg:flex",
      )}
    >
      <NavLink
        to="/"
        onClick={onNavigate}
        className="flex h-24 shrink-0 items-center px-6"
        aria-label="CNP home"
      >
        <Brand />
      </NavLink>
      <div className="mx-5 mb-6 rounded-md border border-border bg-background/40 px-3 py-2.5">
        <p className="text-xs font-medium">Developer workspace</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Build. Deploy. Observe.
        </p>
      </div>
      <nav
        aria-label={mobile ? "Mobile navigation" : "Main navigation"}
        className="min-h-0 flex-1 space-y-7 overflow-y-auto px-3"
      >
        {groups.map((group) => (
          <div key={group.title}>
            <p className="eyebrow px-3 pb-2">{group.title}</p>
            <div className="space-y-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "relative flex min-h-11 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors",
                      isActive ||
                        (to === "/projects" &&
                          location.pathname.startsWith("/repositories/"))
                        ? "bg-primary/10 text-primary before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:bg-primary"
                        : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                    )
                  }
                >
                  <Icon
                    aria-hidden="true"
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.6}
                  />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
        {user?.role === "admin" && (
          <div>
            <p className="eyebrow px-3 pb-2">Administration</p>
            <NavLink
              to="/admin/infrastructure"
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-md px-3 text-[13px]",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                )
              }
            >
              <Server className="h-[18px] w-[18px]" aria-hidden="true" />
              Infrastructure
            </NavLink>
          </div>
        )}
      </nav>
      <div className="m-3 mt-6 border-t border-border px-3 pt-4">
        <NavLink
          to="/github"
          onClick={onNavigate}
          className="group flex items-center justify-between py-2 text-xs text-muted-foreground hover:text-primary"
        >
          Connect a repository
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </NavLink>
        <p className="pb-4 pt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/80">
          CNP / Developer platform
        </p>
      </div>
    </aside>
  );
}
