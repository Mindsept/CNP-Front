import { Link } from "react-router-dom";
import { ArrowLeft, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center pt-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
        <Compass className="h-7 w-7" />
      </div>
      <p className="mt-6 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The link you followed might be outdated, or the resource was removed.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </Button>
    </div>
  );
}
