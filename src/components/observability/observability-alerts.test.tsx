import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BindingAlertPolicy, ObservabilityIncidents } from "./observability-alerts";
import { observabilityService as obs, openBindingGrafana } from "@/services/observability.service";
import type { ObservabilityAlertPolicy, ObservabilityIncident } from "@/types/observability";
vi.mock("@/services/observability.service", () => ({ observabilityService: { incidents: vi.fn(), acknowledgeIncident: vi.fn(), alertPolicy: vi.fn(), saveAlertPolicy: vi.fn() }, openBindingGrafana: vi.fn() }));
const incident: ObservabilityIncident = { id: "incident", project_id: "project", binding_id: "binding", service_key: "api", environment: "dev", kind: "http_errors", title: "HTTP errors exceeded the threshold", severity: "critical", technical_state: "firing", started_at: "2026-10-29T12:00:00Z", last_observed_at: "2026-10-29T12:01:00Z", resolved_at: null, acknowledged_at: null, acknowledged_by: null, observed_value: 8, revision: 1 };
const policy: ObservabilityAlertPolicy = { binding_id: "binding", enabled: true, latency_budget_ms: null, status: "pending", reason_code: "observability_alerts_waiting_activation", suspended_until: null, applied_revision: null, last_reconciled_at: null, sms_enabled: false, availability_supported: false };
function mount(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}
beforeEach(() => {
  Object.values(obs).forEach(mock => vi.mocked(mock).mockReset());
  vi.mocked(obs.incidents).mockResolvedValue({ items: [incident], total: 1, limit: 20, offset: 0 });
  vi.mocked(obs.acknowledgeIncident).mockResolvedValue({ ...incident, acknowledged_at: "2026-10-29T12:02:00Z", acknowledged_by: "user" });
  vi.mocked(obs.alertPolicy).mockResolvedValue(policy);
  vi.mocked(obs.saveAlertPolicy).mockResolvedValue({ ...policy, latency_budget_ms: 250 });
  vi.mocked(openBindingGrafana).mockReset().mockResolvedValue();
});
it("shows severity, technical state and acknowledgement independently", async () => {
  mount(<ObservabilityIncidents projectId="project" canManage/>);
  await screen.findByText(incident.title);
  expect(screen.getByText("Critical")).toBeInTheDocument(); expect(screen.getByText("Open", { exact: true })).toBeInTheDocument();
  vi.mocked(obs.incidents).mockResolvedValue({ items: [{ ...incident, acknowledged_at: "2026-10-29T12:02:00Z", acknowledged_by: "user" }], total: 1, limit: 20, offset: 0 });
  fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }));
  await screen.findByText(/^Acknowledged /);
  expect(screen.getByText("Open", { exact: true })).toBeInTheDocument();
  expect(obs.acknowledgeIncident).toHaveBeenCalledWith("incident");
});
it("prevents duplicate acknowledgement while the response is pending", async () => {
  vi.mocked(obs.acknowledgeIncident).mockImplementation(() => new Promise(() => {}));
  mount(<ObservabilityIncidents projectId="project" canManage/>);
  const button = await screen.findByRole("button", { name: "Acknowledge" });
  fireEvent.click(button); fireEvent.click(button);
  expect(obs.acknowledgeIncident).toHaveBeenCalledOnce();
});
it("keeps Viewer read access and disallows acknowledgement", async () => {
  mount(<ObservabilityIncidents projectId="project" bindingId="binding" canManage={false}/>);
  const button = await screen.findByRole("button", { name: "Acknowledge" }); expect(button).toBeDisabled();
  fireEvent.click(button); expect(obs.acknowledgeIncident).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Open metrics for api (opens a new tab)" }));
  await waitFor(() => expect(openBindingGrafana).toHaveBeenCalledWith("binding", "metrics"));
  expect(obs.incidents).toHaveBeenCalledWith("project", "binding", "firing", 0, expect.any(AbortSignal));
});
it("does not present a read error as zero incidents", async () => {
  vi.mocked(obs.incidents).mockRejectedValue(new Error("Unavailable"));
  mount(<ObservabilityIncidents projectId="project" canManage/>);
  await screen.findByText(/Incidents could not be loaded/);
  expect(screen.queryByText("No open incidents.")).not.toBeInTheDocument();
});
it("rejects incident data from another project", async () => {
  vi.mocked(obs.incidents).mockResolvedValue({ items: [{ ...incident, project_id: "foreign" }], total: 1, limit: 20, offset: 0 });
  mount(<ObservabilityIncidents projectId="project" canManage/>);
  await screen.findByText(/Incidents could not be loaded/); expect(screen.queryByText(incident.title)).not.toBeInTheDocument();
});
it("filters resolved incidents server-side", async () => {
  mount(<ObservabilityIncidents projectId="project" canManage/>); await screen.findByText(incident.title);
  fireEvent.change(screen.getByRole("combobox", { name: "Incident status" }), { target: { value: "resolved" } });
  await waitFor(() => expect(obs.incidents).toHaveBeenLastCalledWith("project", undefined, "resolved", 0, expect.any(AbortSignal)));
});
it("distinguishes queued WhatsApp from delivery and discloses fixed trial content", async () => {
  vi.mocked(obs.incidents).mockResolvedValue({ items: [{ ...incident, notifications: [{
    id: "delivery", channel: "whatsapp", transition: "firing", content_mode: "trial_template",
    status: "queued", reason_code: null, updated_at: "2026-11-02T17:00:00Z",
  }] }], total: 1, limit: 20, offset: 0 });
  mount(<ObservabilityIncidents projectId="project" canManage/>);
  await screen.findByText("Queued by Twilio");
  expect(screen.queryByText("Delivered", { exact: true })).not.toBeInTheDocument();
  expect(screen.getByText(/this message contains no incident details/)).toBeInTheDocument();
});
it("identifies incident content without claiming queued messages were delivered", async () => {
  vi.mocked(obs.incidents).mockResolvedValue({ items: [{ ...incident, notifications: [{
    id: "custom", channel: "whatsapp", transition: "resolved", content_mode: "incident_template",
    status: "queued", reason_code: null, updated_at: "2026-11-02T17:00:00Z",
  }] }], total: 1, limit: 20, offset: 0 });
  mount(<ObservabilityIncidents projectId="project" canManage/>);
  await screen.findByText(/Incident notification with application/);
  expect(screen.queryByText(/this message contains no incident details/)).not.toBeInTheDocument();
  expect(screen.queryByText("Delivered", { exact: true })).not.toBeInTheDocument();
});
it("keeps a pending policy distinct from active rules and saves an explicit latency budget", async () => {
  mount(<BindingAlertPolicy bindingId="binding" canManage/>);
  await screen.findByText(/Rule status: Waiting for configuration/);
  expect(screen.getByText(/Rules will be applied after observability/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Configure collection alerts"));
  const budget = screen.getByRole("spinbutton", { name: "Optional p95 latency budget (ms)" });
  expect(budget).toHaveValue(null);
  fireEvent.change(budget, { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: "Save alert policy" }));
  await waitFor(() => expect(obs.saveAlertPolicy).toHaveBeenCalledWith("binding", { enabled: true, latency_budget_ms: 250 }));
  expect(screen.getByText(/Rule status: Waiting for configuration/)).toBeInTheDocument();
});
it("leaves SMS and independent availability unavailable instead of promising delivery", async () => {
  mount(<BindingAlertPolicy bindingId="binding" canManage={false}/>);
  await screen.findByText("SMS delivery is not enabled.");
  expect(screen.getByText(/Independent availability alerts are not supported/)).toBeInTheDocument();
  fireEvent.click(screen.getByText("Configure collection alerts"));
  expect(screen.getByRole("checkbox", { name: "Enable collection alert rules" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Save alert policy" })).toBeDisabled();
});
it("shows failed policy persistence without inventing active rules", async () => {
  vi.mocked(obs.saveAlertPolicy).mockRejectedValue(new Error("Policy rejected"));
  mount(<BindingAlertPolicy bindingId="binding" canManage/>);
  await screen.findByText(/Rule status: Waiting for configuration/); fireEvent.click(screen.getByText("Configure collection alerts"));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "500" } }); fireEvent.click(screen.getByRole("button", { name: "Save alert policy" }));
  await screen.findByText("Policy rejected");
  expect(screen.getByText(/Rule status: Waiting for configuration/)).toBeInTheDocument();
});
