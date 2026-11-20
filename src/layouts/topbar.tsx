import { useEffect, useRef, useState, type Ref } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  FolderKanban,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Github,
  ScrollText,
  ArrowUpRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { projectService } from "@/services/project.service";

const destinations = [
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "GitHub", to: "/github", icon: Github },
  { label: "Human reviews", to: "/mcp/reviews", icon: ShieldCheck },
  { label: "Audit log", to: "/audit", icon: ScrollText },
];
export function Topbar({
  onMenuOpen,
  menuButtonRef,
}: {
  onMenuOpen: () => void;
  menuButtonRef?: Ref<HTMLButtonElement>;
}) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchButton = useRef<HTMLButtonElement>(null);
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => projectService.list(),
    enabled: searchOpen,
  });
  const section = pathname.startsWith("/repositories")
    ? "Repositories"
    : pathname.startsWith("/projects")
      ? "Projects"
      : pathname.startsWith("/github")
        ? "GitHub"
        : pathname.startsWith("/mcp")
          ? "Operations"
          : pathname.startsWith("/admin")
            ? "Infrastructure"
            : pathname.startsWith("/audit")
              ? "Audit log"
              : pathname.startsWith("/jobs")
                ? "Jobs"
                : "Overview";
  const identity = user?.full_name || user?.email || "Account";
  const initials = identity
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function go(to: string) {
    setSearchOpen(false);
    setSearch("");
    navigate(to);
  }
  const matchingProjects =
    projects.data?.items.filter((p) =>
      (p.name + " " + p.slug).toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const matchingDestinations = destinations.filter((d) =>
    d.label.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-7 lg:px-9">
      <Button
        ref={menuButtonRef}
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onMenuOpen}
      >
        <Menu />
      </Button>
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 items-center gap-2 text-xs"
      >
        <Link
          to="/"
          className="hidden text-muted-foreground hover:text-foreground sm:block"
        >
          Workspace
        </Link>
        <ChevronRight
          className="hidden h-3 w-3 text-muted-foreground sm:block"
          aria-hidden="true"
        />
        <span className="truncate">{section}</span>
      </nav>
      <div className="flex-1" />
      <Button
        ref={searchButton}
        variant="ghost"
        onClick={() => setSearchOpen(true)}
        className="gap-2 text-muted-foreground"
        aria-label="Search projects and pages"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search workspace</span>
        <kbd className="ml-4 hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] md:inline">
          Ctrl K
        </kbd>
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="max-w-[220px] gap-2 px-1.5"
            aria-label="Account menu"
          >
            <Avatar className="h-7 w-7">
              <AvatarFallback className="bg-secondary text-[10px] text-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden truncate text-xs sm:inline">
              {identity}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="normal-case tracking-normal">
            <div className="truncate text-sm text-foreground">
              {user?.full_name || "Signed in"}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {user?.email}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logout()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent
          className="sm:max-w-xl"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            searchButton.current?.focus();
          }}
        >
          <DialogTitle>Find your workspace</DialogTitle>
          <DialogDescription>
            Search projects or jump to a page.
          </DialogDescription>
          <Input
            aria-label="Search projects and pages"
            placeholder="Project name or page…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="max-h-[55vh] space-y-4 overflow-y-auto">
            {matchingDestinations.length > 0 && (
              <div>
                <p className="eyebrow mb-2">Pages</p>
                {matchingDestinations.map(({ to, label, icon: Icon }) => (
                  <button
                    key={to}
                    onClick={() => go(to)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-surface-elevated"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {label}
                    <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
            <div>
              <p className="eyebrow mb-2">Projects</p>
              {projects.isPending ? (
                <p role="status" className="text-sm text-muted-foreground">
                  Loading projects…
                </p>
              ) : projects.isError ? (
                <div role="alert" className="text-sm text-muted-foreground">
                  Projects could not be loaded.
                  <Button
                    variant="link"
                    onClick={() => void projects.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : matchingProjects.length ? (
                matchingProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => go(`/projects/${p.id}`)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm hover:bg-surface-elevated"
                  >
                    <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 truncate">{p.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {p.repositories_count} repos
                    </span>
                  </button>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  No matching projects.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
