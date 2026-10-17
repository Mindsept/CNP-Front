import { describe, expect, it } from "vitest";
import { getReturnToFromState, safeReturnTo } from "./navigation";

describe("OIDC return navigation", () => {
  it("keeps a local protected path", () => {
    expect(safeReturnTo("/projects/42?tab=settings")).toBe(
      "/projects/42?tab=settings",
    );
    expect(
      getReturnToFromState({ returnTo: "/repositories/7/analysis" }),
    ).toBe("/repositories/7/analysis");
  });

  it.each([
    ["https://attacker.example", "/"],
    ["//attacker.example", "/"],
    ["/\\attacker.example", "/"],
    ["/\n/attacker.example", "/"],
    ["/auth/callback?code=leak", "/"],
    [undefined, "/"],
  ])("rejects unsafe return target %s", (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });

  it("preserves an MCP consent request through the OIDC callback", () => {
    const returnTo = "/mcp/consent?client_id=desktop&state=nonce&scope=projects%3Aread";
    expect(getReturnToFromState({ returnTo })).toBe(returnTo);
  });
});
