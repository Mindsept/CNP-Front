import { useState } from "react";
import { SectionCard } from "@/components/common/section-card";
import { Button } from "@/components/ui/button";
import { LandingZoneFields } from "./landing-zone-fields";
import {
  defaultLandingZonePreview,
  readLandingZonePreview,
  saveLandingZonePreview,
} from "@/lib/landing-zone-preview";

interface ProjectLandingZoneProps {
  projectId: string;
  userId: string;
}

export function ProjectLandingZone({
  projectId,
  userId,
}: ProjectLandingZoneProps) {
  const [saved, setSaved] = useState(() =>
    readLandingZonePreview(userId, projectId),
  );
  const [draft, setDraft] = useState(
    () => saved ?? defaultLandingZonePreview(),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!saveLandingZonePreview(userId, projectId, draft)) {
      setError(
        "Could not save the preview in this browser. Allow local storage, then try again.",
      );
      setMessage("");
      return;
    }
    setSaved(draft);
    setError("");
    setMessage("Preview saved in this browser. No deployment was started.");
  }

  return (
    <SectionCard
      title="Landing zone preview"
      description="Design a deployment scenario for the demo. The saved preview belongs to your account in this browser and is not shared with the project team."
    >
      <form onSubmit={save} className="space-y-6">
        <LandingZoneFields
          value={draft}
          onChange={(value) => {
            setDraft(value);
            setMessage("");
            setError("");
          }}
          disabled={!userId}
          wide
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Button type="submit" disabled={!dirty || !userId}>
            Save preview
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!dirty}
            onClick={() => {
              setDraft(saved ?? defaultLandingZonePreview());
              setMessage("");
              setError("");
            }}
          >
            Discard changes
          </Button>
          <span className="text-xs text-muted-foreground">
            {dirty ? "Unsaved preview" : "Saved locally"}
          </span>
        </div>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </form>
    </SectionCard>
  );
}
