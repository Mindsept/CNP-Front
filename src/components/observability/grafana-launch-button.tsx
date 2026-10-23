import { useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/errors";
import { openProjectGrafana } from "@/services/observability.service";
export function GrafanaLaunchButton({ projectId }: {
  projectId: string;
}) {
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function open() {
    if (locked.current)
      return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await openProjectGrafana(projectId);
    }
    catch (e) {
      setError(getErrorMessage(e, "Grafana could not be opened."));
    }
    finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return <div className="space-y-2"><Button variant="outline" onClick={() => void open()} loading={busy}><ExternalLink className="h-4 w-4"/>Open Grafana</Button>{error && <p role="alert" className="max-w-sm text-sm text-destructive">{error}</p>}</div>;
}
