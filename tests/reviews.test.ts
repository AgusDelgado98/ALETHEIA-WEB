import { describe, expect, it } from "vitest";
import { RELEASE_GATES, runGate } from "../scripts/gates/gates.ts";
import { WEB2_REVIEWED_COMMIT } from "../tools/reviews/constants.ts";
import { buildInventory, detectDrift, readPin } from "../tools/reviews/inventory.ts";
import {
  emptyHumanSkeleton,
  emptyLegalSkeleton,
  evaluateLeg02,
  evaluateLeg03,
  evaluateOd14,
} from "../tools/reviews/status.ts";
import { realContext, ROOT } from "./helpers.ts";

const inv = buildInventory(ROOT);

describe("reconciliación editorial WEB-2R", () => {
  it("363 textos: la suma de veredictos es exacta", () => {
    const sum = Object.values(inv.verdicts.by_verdict).reduce((a, b) => a + b, 0);
    expect(inv.verdicts.total_units).toBe(363);
    expect(sum).toBe(363);
  });
  it("18 public_question APPROVED; 345 PENDING_AUTHOR_REVIEW; 0 REVISED/REJECTED", () => {
    expect(inv.verdicts.public_question.research_questions).toBe(18);
    expect(inv.verdicts.public_question.records).toBe(18);
    expect(inv.verdicts.public_question.APPROVED).toBe(18);
    expect(inv.verdicts.public_question.REVISED_AND_APPROVED).toBe(0);
    expect(inv.verdicts.public_question.PENDING_AUTHOR_REVIEW).toBe(0);
    expect(inv.verdicts.public_question.REJECTED).toBe(0);
    expect(inv.verdicts.by_verdict.APPROVED).toBe(18);
    expect(inv.verdicts.by_verdict.PENDING_AUTHOR_REVIEW).toBe(345);
    expect(inv.verdicts.by_verdict.REVISED_AND_APPROVED ?? 0).toBe(0);
    expect(inv.verdicts.by_verdict.REJECTED ?? 0).toBe(0);
  });
  it("los 4 registros fuera del recuento «14» son public_question APPROVED de fichas destacadas", () => {
    const ids = inv.verdicts.unexplained_non_pending_non_fourteen.map((u) => u.string_id).sort();
    expect(ids).toEqual([
      "labor/LAB-Q-0003#public_question",
      "labor/LAB-Q-0004#public_question",
      "labor/LAB-Q-0005#public_question",
      "labor/LAB-Q-0011#public_question",
    ]);
    expect(
      inv.verdicts.unexplained_non_pending_non_fourteen.every((u) => u.verdict === "APPROVED"),
    ).toBe(true);
  });
});

describe("OD-14 plantilla PENDING", () => {
  it("vacía ⇒ OPEN y no PASS", () => {
    const r = evaluateOd14(emptyHumanSkeleton());
    expect(r.status).toBe("OPEN");
    expect(r.failures.some((f) => f.includes("PENDING"))).toBe(true);
  });
  it("reviewer = author ⇒ no satisfecho", () => {
    const base = emptyHumanSkeleton();
    const r = evaluateOd14({
      ...base,
      status: "COMPLETED",
      reviewer: "Ada Example",
      author_name: "Ada Example",
      reviewer_equals_author: true,
      review_date: "2026-09-20",
      signature: "Ada Example",
      decision: "APPROVED",
      checklist: base.checklist.map((c) => ({ ...c, result: "PASS" as const })),
    });
    expect(r.status).not.toBe("PASS");
    expect(r.failures.some((f) => f.includes("reviewer = author"))).toBe(true);
  });
});

describe("G-LEG-03 plantilla PENDING", () => {
  const legal = emptyLegalSkeleton(inv);
  it("registro incompleto ⇒ OPEN", () => {
    const r = evaluateLeg03(legal, inv);
    expect(r.status).toBe("OPEN");
    expect(r.failures.some((f) => f.includes("PENDING"))).toBe(true);
  });
  it("decisión legal vacía ⇒ no clearance", () => {
    const r = evaluateLeg03(legal, inv);
    expect(r.failures.some((f) => f.includes("decisión legal vacía"))).toBe(true);
  });
  it("Source pública faltante del inventario ⇒ FAIL/OPEN", () => {
    const missing = {
      ...legal,
      items: legal.items.filter((i) => i.id !== "LAB-ROOT-0002"),
    };
    const r = evaluateLeg03(missing, inv);
    expect(r.status).not.toBe("PASS");
    expect(r.failures.some((f) => f.includes("LAB-ROOT-0002") && f.includes("faltante"))).toBe(
      true,
    );
  });
  it("Source no pública correctamente excluida no se exige", () => {
    const nonPublic = inv.sources
      .filter((s) => s.materialization === "NOT_PUBLICLY_MATERIALIZED")
      .map((s) => s.id);
    expect(nonPublic.length).toBeGreaterThan(0);
    const excluded = {
      ...legal,
      items: legal.items.filter((i) => !nonPublic.includes(i.id)),
    };
    const r = evaluateLeg03(excluded, inv);
    expect(
      r.failures.some((f) => f.includes("faltante") && nonPublic.some((id) => f.includes(id))),
    ).toBe(false);
  });
});

describe("G-LEG-02", () => {
  it("/sobre actual no cumple atribuciones", () => {
    const html = realContext().html.get("/sobre");
    const r = evaluateLeg02(html ?? "<html><body>Sobre ALETHEIA aviso</body></html>", inv);
    expect(r.status).toBe("OPEN");
    expect(r.failures.length).toBeGreaterThan(0);
  });
});

describe("drift y gates humanos", () => {
  it("el pin está atado al commit WEB-2 y los hashes coinciden", () => {
    const pin = readPin(ROOT);
    expect(pin).not.toBeNull();
    const drift = detectDrift(ROOT, pin!);
    expect(drift.reviewed_commit).toBe(WEB2_REVIEWED_COMMIT);
    expect(drift.invalidated).toBe(false);
    expect(drift.editorial_manifest_changed).toBe(false);
    expect(drift.inventory_changed).toBe(false);
  });
  it("ningún gate humano PENDING pasa", () => {
    const ctx = realContext();
    for (const id of ["G-OD-14", "G-LEG-02", "G-LEG-03"]) {
      const r = runGate(id, ctx);
      expect(r.status, `${id}: ${r.detail}`).toBe("FAIL");
    }
    expect(RELEASE_GATES.map((g) => g.id)).toEqual(
      expect.arrayContaining(["G-OD-14", "G-LEG-02", "G-LEG-03"]),
    );
  });
  it("drift de material invalida la revisión", () => {
    const pin = readPin(ROOT)!;
    const r = detectDrift(ROOT, {
      ...pin,
      editorial_manifest_sha256: "0".repeat(64),
    });
    expect(r.invalidated).toBe(true);
    expect(r.detail).toBe("REVIEW INVALIDATED BY DRIFT");
  });
});
