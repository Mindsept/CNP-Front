import { z } from "zod";

// This catalogue is a presentation model. Never use it to build a deployment request.
export const landingZonePreviewSchema = z.object({
  version: z.literal(1),
  applicationType: z.enum(["webapp", "api", "ai"]),
  availability: z.enum(["99.5", "99.9", "99.99"]),
  aiModules: z.array(z.enum(["litellm", "vllm", "rag"])).max(3),
});

export type LandingZonePreview = z.infer<typeof landingZonePreviewSchema>;
export type ApplicationType = LandingZonePreview["applicationType"];

export const applicationProfiles = [
  {
    id: "webapp",
    name: "WebApp",
    description: "Frontend and application API",
    components: ["HTTPS entry", "Kong gateway", "Frontend", "Application API"],
  },
  {
    id: "api",
    name: "API",
    description: "An API without a frontend",
    components: ["HTTPS entry", "Kong gateway", "Application API"],
  },
  {
    id: "ai",
    name: "AI",
    description: "AI API, inference and optional RAG",
    components: ["HTTPS entry", "AI application API"],
  },
] as const;

export const availabilityProfiles = {
  "99.5": { label: "99.5% · 1 target", targets: ["Azure · AKS"] },
  "99.9": { label: "99.9% · 2 targets", targets: ["Azure · AKS", "AWS · EKS"] },
  "99.99": {
    label: "99.99% · 3 targets",
    targets: ["Azure · AKS", "AWS · EKS", "Private · k3s"],
  },
} as const;

export const aiModules = [
  {
    id: "litellm",
    name: "LiteLLM gateway",
    description: "Model routing, usage limits and project keys.",
  },
  {
    id: "vllm",
    name: "vLLM inference",
    description: "A model-serving endpoint for the AI API.",
  },
  {
    id: "rag",
    name: "RAG · pgvector",
    description: "Document search, embeddings and a separate vector database.",
  },
] as const;

export function defaultLandingZonePreview(): LandingZonePreview {
  return {
    version: 1,
    applicationType: "webapp",
    availability: "99.5",
    aiModules: [],
  };
}

function storageKey(userId: string, projectId: string): string {
  return `cnp:landing-zone-preview:v1:${encodeURIComponent(userId)}:${encodeURIComponent(projectId)}`;
}

export function readLandingZonePreview(
  userId: string,
  projectId: string,
): LandingZonePreview | null {
  if (!userId || !projectId) return null;
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(storageKey(userId, projectId)) ?? "null",
    );
    const parsed = landingZonePreviewSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveLandingZonePreview(
  userId: string,
  projectId: string,
  value: LandingZonePreview,
): boolean {
  if (!userId || !projectId) return false;
  try {
    const parsed = landingZonePreviewSchema.parse(value);
    window.localStorage.setItem(
      storageKey(userId, projectId),
      JSON.stringify(parsed),
    );
    return true;
  } catch {
    return false;
  }
}
