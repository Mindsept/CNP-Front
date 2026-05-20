import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const onError = useToastError();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const next = params.get("next") ?? "/";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldError(null);

    if (!email || !password) {
      setFieldError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ email: email.trim(), password });
      toast.success(`Welcome back, ${user.full_name?.split(" ")[0] ?? "developer"}`);
      navigate(next, { replace: true });
    } catch (err) {
      onError(err, "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Sign in
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to your platform
        </h1>
        <p className="text-sm text-muted-foreground">
          Use your work email to access projects, repositories and CI workflows.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <span className="text-xs text-muted-foreground">8+ characters</span>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {fieldError ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {fieldError}
          </div>
        ) : null}

        <Button type="submit" className="w-full" loading={submitting} size="lg">
          Sign in
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          to="/register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}
