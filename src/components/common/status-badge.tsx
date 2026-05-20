import { Badge } from "@/components/ui/badge";
import type { OnboardingStatus, StackType } from "@/types/repository";
import type { CiPipelineStatus } from "@/types/ci";
import type { JobStatus } from "@/types/job";
import type { ProjectRole } from "@/types/project";

type Variant = React.ComponentProps<typeof Badge>["variant"];

interface MapEntry {
  label: string;
  variant: Variant;
}

const onboardingMap: Record<OnboardingStatus, MapEntry> = {
  registered: { label: "Registered", variant: "muted" },
  analyzing: { label: "Analyzing", variant: "info" },
  analyzed: { label: "Analyzed", variant: "default" },
  ci_generated: { label: "CI generated", variant: "default" },
  ci_approved: { label: "CI approved", variant: "success" },
  pr_created: { label: "PR created", variant: "success" },
  onboarded: { label: "Onboarded", variant: "success" },
  error: { label: "Error", variant: "danger" },
};

const ciStatusMap: Record<CiPipelineStatus, MapEntry> = {
  draft: { label: "Draft", variant: "muted" },
  generated: { label: "Generated", variant: "default" },
  adapted: { label: "Adapted", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  pr_created: { label: "PR created", variant: "success" },
  committed: { label: "Committed", variant: "success" },
  error: { label: "Error", variant: "danger" },
};

const jobStatusMap: Record<JobStatus, MapEntry> = {
  queued: { label: "Queued", variant: "muted" },
  running: { label: "Running", variant: "info" },
  succeeded: { label: "Succeeded", variant: "success" },
  failed: { label: "Failed", variant: "danger" },
};

const stackMap: Record<StackType, MapEntry> = {
  python_fastapi: { label: "Python · FastAPI", variant: "default" },
  node: { label: "Node.js", variant: "default" },
  java_maven: { label: "Java · Maven", variant: "default" },
  go: { label: "Go", variant: "default" },
  generic_docker: { label: "Docker", variant: "info" },
  unknown: { label: "Unknown stack", variant: "muted" },
};

const roleMap: Record<ProjectRole, MapEntry> = {
  owner: { label: "Owner", variant: "default" },
  maintainer: { label: "Maintainer", variant: "info" },
  viewer: { label: "Viewer", variant: "muted" },
};

export function OnboardingStatusBadge({ status }: { status: OnboardingStatus }) {
  const entry = onboardingMap[status] ?? {
    label: status,
    variant: "muted" as const,
  };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function CiStatusBadge({ status }: { status: CiPipelineStatus }) {
  const entry = ciStatusMap[status] ?? {
    label: status,
    variant: "muted" as const,
  };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const entry = jobStatusMap[status] ?? {
    label: status,
    variant: "muted" as const,
  };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function StackBadge({ stack }: { stack: StackType | null }) {
  const entry = stack
    ? stackMap[stack]
    : { label: "Not analyzed", variant: "muted" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export function RoleBadge({ role }: { role: ProjectRole }) {
  const entry = roleMap[role] ?? { label: role, variant: "muted" as const };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
