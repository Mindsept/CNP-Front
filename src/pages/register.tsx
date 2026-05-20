import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToastError } from "@/hooks/use-toast-error";

interface FieldErrors {
  email?: string;
  password?: string;
  full_name?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const onError = useToastError();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function validate(): boolean {
    const next: FieldErrors = {};
    if (!fullName.trim()) next.full_name = "Full name is required.";
    if (!email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      next.email = "Enter a valid email address.";
    if (!password) next.password = "Password is required.";
    else if (password.length < 8)
      next.password = "Use at least 8 characters.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await register({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
      });
      try {
        await login({ email: email.trim(), password });
        toast.success("Account created. Welcome!");
        navigate("/", { replace: true });
      } catch {
        toast.success("Account created. Please sign in.");
        navigate("/login", { replace: true });
      }
    } catch (err) {
      onError(err, "Could not create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">
          Create account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Get started in seconds
        </h1>
        <p className="text-sm text-muted-foreground">
          One account to manage every project, repository and CI workflow.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            autoComplete="name"
            placeholder="Jane Developer"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {errors.full_name ? (
            <p className="text-xs text-destructive">{errors.full_name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email ? (
            <p className="text-xs text-destructive">{errors.email}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password ? (
            <p className="text-xs text-destructive">{errors.password}</p>
          ) : null}
        </div>

        <Button type="submit" className="w-full" loading={submitting} size="lg">
          Create account
        </Button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
