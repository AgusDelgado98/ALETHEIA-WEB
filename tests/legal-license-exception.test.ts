import { describe, expect, it } from "vitest";
import {
  isLegalLicenseLink,
  LEGAL_LICENSE_ROUTE,
  LEGAL_LICENSE_URL,
  runGate,
} from "../scripts/gates/gates.ts";
import type { GateContext } from "../scripts/gates/context.ts";
import { cloneCtx, realContext, ROUTE } from "./helpers.ts";

/**
 * Excepción legal WEB-2 (G-LEG-02/G-LEG-03): solo el <a href> de /sobre a la URL exacta de CC BY-SA 4.0.
 * Estos tests fijan que la excepción admite eso y nada más.
 */
const EXACT = "https://creativecommons.org/licenses/by-sa/4.0/";
const ctx = realContext();
const sobre = ctx.html.get(LEGAL_LICENSE_ROUTE);
const has = sobre !== undefined;
const RESTRICTED = ["G-PRV-03", "G-PERF-04", "G-EDI-08"] as const;

const withSobre = (mutate: (html: string) => string): GateContext => {
  const c = cloneCtx(ctx);
  c.html.set(LEGAL_LICENSE_ROUTE, mutate(sobre ?? ""));
  return c;
};
const failing = (c: GateContext): string[] =>
  RESTRICTED.filter((id) => runGate(id, c).status === "FAIL");

describe("excepción legal de la licencia: predicado", () => {
  it("la constante es exactamente la URL oficial aprobada", () => {
    expect(LEGAL_LICENSE_URL).toBe(EXACT);
    expect(LEGAL_LICENSE_ROUTE).toBe("/sobre");
  });
  it("solo acepta <a> en /sobre con la URL exacta", () => {
    expect(isLegalLicenseLink("/sobre", "a", EXACT)).toBe(true);
    expect(isLegalLicenseLink("/metodo", "a", EXACT)).toBe(false);
    expect(isLegalLicenseLink(ROUTE, "a", EXACT)).toBe(false);
    for (const tag of ["link", "script", "img", "iframe", "source"])
      expect(isLegalLicenseLink("/sobre", tag, EXACT), tag).toBe(false);
    for (const url of [
      "https://creativecommons.org/licenses/by-sa/4.0",
      "https://creativecommons.org/licenses/by-sa/4.0/?x=1",
      "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
      "http://creativecommons.org/licenses/by-sa/4.0/",
      "https://creativecommons.org/licenses/by-sa/3.0/",
      "https://creativecommons.org/licenses/by/4.0/",
      "https://creativecommons.org/",
      "https://www.creativecommons.org/licenses/by-sa/4.0/",
      "https://creativecommons.org.evil.example/licenses/by-sa/4.0/",
      "https://example.org/dato",
      "",
    ])
      expect(isLegalLicenseLink("/sobre", "a", url), url).toBe(false);
  });
});

describe.skipIf(!has)("excepción legal de la licencia: gates sobre el HTML real", () => {
  it("A. el /sobre real, con el enlace exacto, no falla G-PRV-03, G-PERF-04 ni G-EDI-08", () => {
    expect(sobre).toContain(`href="${EXACT}"`);
    expect(failing(cloneCtx(ctx))).toEqual([]);
    expect(runGate("G-FIG-03", cloneCtx(ctx)).status).toBe("PASS");
  });

  it("B. otra URL de la misma familia en /sobre sigue fallando", () => {
    const other = "https://creativecommons.org/licenses/by-sa/3.0/";
    expect(failing(withSobre((h) => h.replaceAll(EXACT, other)))).toEqual([...RESTRICTED]);
  });

  it("B. otra URL externa cualquiera agregada a /sobre sigue fallando", () => {
    const c = withSobre((h) =>
      h.replace("</main>", '<a href="https://example.org/dato">x</a></main>'),
    );
    expect(runGate("G-PRV-03", c).status).toBe("FAIL");
    expect(runGate("G-PERF-04", c).status).toBe("FAIL");
  });

  it("B. la URL exacta en otra ruta sigue fallando", () => {
    const c = cloneCtx(ctx);
    c.html.set(
      ROUTE,
      (c.html.get(ROUTE) ?? "").replace("</main>", `<a href="${EXACT}">x</a></main>`),
    );
    expect(runGate("G-PRV-03", c).status).toBe("FAIL");
    expect(runGate("G-PERF-04", c).status).toBe("FAIL");
  });

  it("B. la URL exacta como recurso (link, img) en /sobre sigue fallando en G-PERF-04", () => {
    for (const snippet of [
      `<link rel="stylesheet" href="${EXACT}">`,
      `<img src="${EXACT}" alt="">`,
    ]) {
      const c = withSobre((h) => h.replace("</main>", `${snippet}</main>`));
      expect(runGate("G-PERF-04", c).status, snippet).toBe("FAIL");
    }
  });

  it("B. la URL exacta como <script src> en /sobre sigue fallando (G-UX-05: 0 scripts)", () => {
    const c = withSobre((h) => h.replace("</main>", `<script src="${EXACT}"></script></main>`));
    expect(runGate("G-UX-05", c).status).toBe("FAIL");
  });

  it("B. variantes de la URL (sin barra final, con query, http) siguen fallando", () => {
    for (const variant of [
      "https://creativecommons.org/licenses/by-sa/4.0",
      `${EXACT}?x=1`,
      "http://creativecommons.org/licenses/by-sa/4.0/",
    ]) {
      const c = withSobre((h) => h.replaceAll(EXACT, variant));
      expect(runGate("G-PRV-03", c).status, variant).toBe("FAIL");
      expect(runGate("G-PERF-04", c).status, variant).toBe("FAIL");
      expect(runGate("G-EDI-08", c).status, variant).toBe("FAIL");
    }
  });

  it("B. la URL exacta como texto en otra ruta no queda explicada por G-EDI-08", () => {
    const c = cloneCtx(ctx);
    c.html.set(ROUTE, (c.html.get(ROUTE) ?? "").replace("</main>", `<p>${EXACT}</p></main>`));
    expect(runGate("G-EDI-08", c).status).toBe("FAIL");
  });
});
