import { Outlet } from "react-router-dom";
import { Brand } from "@/components/common/brand";
import { SpaceBackground } from "@/components/auth/space-background";
export function AuthLayout() {
  return <div className="cnp-login-shell">
    <SpaceBackground />
    <header className="cnp-login-brand"><Brand size="lg" /></header>
    <main className="cnp-login-main"><div className="cnp-login-card"><Outlet /></div></main>
    <footer className="cnp-login-footer">Cloud Native Platform · Your developer workspace</footer>
  </div>;
}
