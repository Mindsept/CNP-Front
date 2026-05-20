import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Github,
  ScrollText,
  Settings2,
} from "lucide-react";
import { Brand } from "@/components/common/brand";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/github", label: "GitHub", icon: Github },
  { to: "/audit", label: "Audit log", icon: ScrollText },
];

export function Sidebar() {
  const location = useLocation();
  const projectDetailMatch =
    location.pathname.startsWith("/projects/") &&
    location.pathname !== "/projects";

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur-xl md:flex">
      <div className="flex h-16 items-center px-5">
        <Brand size="sm" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Overview
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                (isActive || (item.to === "/projects" && projectDetailMatch)) &&
                  "bg-primary/10 text-foreground ring-1 ring-inset ring-primary/20",
              )
            }
          >
            <item.icon className="h-4 w-4 text-current" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <NavLink
          to="/settings"
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-surface-elevated hover:text-foreground"
        >
          <Settings2 className="h-3.5 w-3.5" />
          Platform settings
          <span className="ml-auto rounded-full bg-muted/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Soon
          </span>
        </NavLink>
      </div>
    </aside>
  );
}
