import { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const main = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [location.pathname]);
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>
      <Sidebar />
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuButton.current?.focus();
          }}
          className="inset-y-0 left-0 h-dvh max-h-none w-[min(320px,90vw)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l-0 p-0"
        >
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <DialogDescription className="sr-only">
            Navigate your CNP workspace.
          </DialogDescription>
          <Sidebar mobile onNavigate={() => setMenuOpen(false)} />
        </DialogContent>
      </Dialog>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          menuButtonRef={menuButton}
          onMenuOpen={() => setMenuOpen(true)}
        />
        <main
          ref={main}
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
