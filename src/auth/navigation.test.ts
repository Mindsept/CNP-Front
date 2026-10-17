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
    ["/auth/callback?code=leak", "/"],
    [undefined, "/"],
  ])("rejects unsafe return target %s", (value, expected) => {
    expect(safeReturnTo(value)).toBe(expected);
  });
});
