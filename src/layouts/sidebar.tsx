import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Github,
  ScrollText,
  Settings2,
  Sparkles,
  ArrowRight,
  Server,
  type LucideIcon,
} from "lucide-react";
import { env } from "@/config/env";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  matchPrefix?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const baseNavGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    title: "Workspace",
    items: [
      {
        to: "/projects",
        label: "Projects",
        icon: FolderKanban,
        matchPrefix: "/projects/",
      },
      { to: "/github", label: "GitHub", icon: Github },
    ],
  },
  {
    title: "System",
    items: [{ to: "/audit", label: "Audit log", icon: ScrollText }],
  },
];

const adminNavGroup: NavGroup = {
  title: "Admin",
  items: [
    {
      to: "/admin/infrastructure",
      label: "Platform Infrastructure",
      icon: Server,
      matchPrefix: "/admin/infrastructure",
    },
  ],
};

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [logoFailed, setLogoFailed] = useState(false);

  const navGroups = isAdmin
    ? [...baseNavGroups, adminNavGroup]
    : baseNavGroups;

  return (
    <aside className="hidden h-full w-[264px] shrink-0 flex-col border-r border-border bg-surface/60 backdrop-blur-xl md:flex">
      {/* Brand header */}
      <div className="relative px-5 pb-5 pt-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative">
            {logoFailed ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 font-mono text-xs font-semibold text-primary ring-1 ring-primary/40">
                CNP
              </div>
            ) : (
              <img
                src="/logo.png"
                alt={env.appName}
                onError={() => setLogoFailed(true)}
                className="h-10 w-10 rounded-xl object-contain bg-gradient-to-br from-primary/15 to-accent/10 p-1 ring-1 ring-primary/25"
              />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/50" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold leading-tight tracking-tight">
                Cloud Native
              </span>
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-primary ring-1 ring-inset ring-primary/25">
                Beta
              </span>
            </div>
            <span className="mt-1 block truncate text-[11px] leading-tight text-muted-foreground">
              Internal developer platform
            </span>
          </div>
        </div>
      </div>

      <div className="mx-5 h-px bg-border" />

      {/* Nav groups */}
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {group.title}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const prefixMatch =
                item.matchPrefix &&
                location.pathname.startsWith(item.matchPrefix);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => {
                    const active = isActive || prefixMatch;
                    return cn(
                      "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-surface-elevated hover:text-foreground",
                    );
                  }}
                >
                  {({ isActive }) => {
                    const active = isActive || prefixMatch;
                    return (
                      <>
                        <span
                          className={cn(
                            "absolute -left-0.5 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary transition-all",
                            active
                              ? "opacity-100 shadow-[0_0_12px_rgba(168,85,247,0.6)]"
                              : "opacity-0",
                          )}
                        />
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                            active
                              ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/25"
                              : "text-muted-foreground group-hover:text-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                      </>
                    );
                  }}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Quickstart card */}
      <div className="px-3 pb-3">
        <NavLink
          to="/github"
          className="group relative block overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface/80 to-surface p-3.5 transition-colors hover:border-primary/40"
        >
          <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/15 blur-2xl transition-opacity group-hover:bg-primary/25" />
          <div className="relative">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary/90">
                Quickstart
              </span>
            </div>
            <p className="text-[12px] leading-snug text-muted-foreground">
              Import a repo, ship CI/CD and deploy to Kubernetes in minutes.
            </p>
            <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/90 transition-colors group-hover:text-primary">
              Onboard repository
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </NavLink>
      </div>

      {/* Footer */}
      <div className="border-t border-border">
        <div className="flex cursor-not-allowed items-center gap-2.5 px-5 py-2.5 text-xs text-muted-foreground">
          <Settings2 className="h-3.5 w-3.5" />
          <span>Platform settings</span>
          <span className="ml-auto rounded-full bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
            Soon
          </span>
        </div>
        <div className="flex items-center justify-between border-t border-border/60 px-5 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <span className="text-[10px] text-muted-foreground">
              All systems normal
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/70">
            v0.1.0
          </span>
        </div>
      </div>
    </aside>
  );
}
