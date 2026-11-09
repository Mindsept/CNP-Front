import { useId } from "react";
import {
  BrainCircuit,
  Check,
  Code2,
  Globe,
  ArrowRight,
  Layers2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  aiModules,
  applicationProfiles,
  availabilityProfiles,
  type LandingZonePreview,
} from "@/lib/landing-zone-preview";
import { cn } from "@/lib/utils";

const profileIcons = { webapp: Globe, api: Code2, ai: BrainCircuit };

interface LandingZoneFieldsProps {
  value: LandingZonePreview;
  onChange: (value: LandingZonePreview) => void;
  disabled?: boolean;
  wide?: boolean;
}

export function LandingZoneFields({
  value,
  onChange,
  disabled = false,
  wide = false,
}: LandingZoneFieldsProps) {
  const id = useId();
  const profile = applicationProfiles.find(
    (item) => item.id === value.applicationType,
  )!;
  const availability = availabilityProfiles[value.availability];
  return (
    <div className={cn("grid gap-5", wide && "lg:grid-cols-2")}>
      <div className="col-span-full flex flex-wrap items-center gap-2">
        <Layers2 aria-hidden="true" className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Landing zone</span>
        <Badge variant="muted">Preview</Badge>
      </div>
      <p className="col-span-full text-sm text-muted-foreground">
        Explore a project setup. These choices are simulated; real demo
        deployments use Azure AKS.
      </p>
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Application type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {applicationProfiles.map((item) => {
            const Icon = profileIcons[item.id];
            return (
              <label
                key={item.id}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring",
                  value.applicationType === item.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-secondary/50",
                  disabled && "cursor-wait opacity-60",
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm font-medium">
                    {item.name}
                  </span>
                  <input
                    type="radio"
                    name={`${id}-application-type`}
                    value={item.id}
                    checked={value.applicationType === item.id}
                    onChange={() =>
                      onChange({ ...value, applicationType: item.id })
                    }
                    aria-label={item.name}
                    className="h-4 w-4 accent-primary"
                  />
                </span>
                <span className="text-xs leading-5 text-muted-foreground">
                  {item.description}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor={`${id}-sla`} className="text-sm font-medium">
          Requested SLA
        </label>
        <select
          id={`${id}-sla`}
          value={value.availability}
          disabled={disabled}
          aria-describedby={`${id}-sla-help`}
          onChange={(event) =>
            onChange({
              ...value,
              availability: event.target
                .value as LandingZonePreview["availability"],
            })
          }
          className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          {Object.entries(availabilityProfiles).map(([key, item]) => (
            <option key={key} value={key}>
              {item.label}
            </option>
          ))}
        </select>
        <p
          id={`${id}-sla-help`}
          className="text-xs leading-5 text-muted-foreground"
        >
          Demo scenarios, not a guaranteed SLA. Targets represent clusters, not
          worker nodes.
        </p>
      </div>

      <div
        aria-live="polite"
        aria-atomic="true"
        className="col-span-full rounded-md border border-border bg-background/40 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{profile.name} landing zone</p>
          <span className="text-xs text-muted-foreground">
            {availability.targets.length} simulated{" "}
            {availability.targets.length === 1 ? "target" : "targets"}
          </span>
        </div>
        <ol
          aria-label="Proposed application path"
          className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
        >
          {profile.components.map((component, index) => (
            <li key={component} className="flex items-center gap-2">
              {index > 0 && (
                <ArrowRight aria-hidden="true" className="h-3 w-3" />
              )}
              <span className="rounded border border-border bg-surface px-2 py-1.5">
                {component}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {availability.targets.map((target) => (
            <Badge key={target} variant="outline">
              {target}
            </Badge>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Demo execution target:{" "}
          <strong className="font-medium text-foreground">Azure · AKS</strong>.
          This preview creates no cloud resources.
        </p>
      </div>

      {value.applicationType === "ai" && (
        <fieldset disabled={disabled} className="col-span-full space-y-2">
          <legend className="mb-2 text-sm font-medium">
            AI services · mockup
          </legend>
          <div className={cn("grid gap-2", wide && "lg:grid-cols-3")}>
            {aiModules.map((module) => {
              const selected = value.aiModules.includes(module.id);
              return (
                <div
                  key={module.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3",
                    wide && "lg:flex-col lg:items-start",
                  )}
                >
                  <div
                    className={cn(
                      "min-w-0 flex-1 basis-48",
                      wide && "lg:basis-auto",
                    )}
                  >
                    <p className="text-sm font-medium">{module.name}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "secondary" : "outline"}
                    disabled={disabled}
                    aria-label={`${selected ? "Remove" : "Add"} ${module.name} ${selected ? "from" : "to"} preview`}
                    aria-pressed={selected}
                    onClick={() =>
                      onChange({
                        ...value,
                        aiModules: selected
                          ? value.aiModules.filter((item) => item !== module.id)
                          : [...value.aiModules, module.id],
                      })
                    }
                  >
                    {selected && (
                      <Check aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {selected ? "Selected" : "Add to preview"}
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Selections only: no inference, model download or document ingestion
            is started.
          </p>
        </fieldset>
      )}
    </div>
  );
}
