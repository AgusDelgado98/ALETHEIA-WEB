import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pins = JSON.parse(readFileSync(join(root, "corpus-pins/corpus-pins.json"), "utf8")) as {
  pins: {
    v1: Pin;
    labor: Pin & {
      expected_counts: Counts;
      counts_observed_from_git_objects: Counts;
      questions_with_claims: number;
    };
  };
};

interface Pin {
  source_path: string;
  remote: string | null;
  branch: string;
  freeze_tag: string;
  tag_object: string;
  commit: string;
  tree: string;
}
interface Counts {
  questions: number;
  claims: number;
  hypotheses: number;
  claim_states: Record<string, number>;
}

const HEX40 = /^[0-9a-f]{40}$/;

describe("corpus pins", () => {
  it("pins V1 and LABOR to a tag, commit and tree", () => {
    const { v1, labor } = pins.pins;
    expect(v1.freeze_tag).toBe("aletheia-research-foundation-v1.0.0");
    expect(v1.commit).toBe("2da6a2b59cf08ef23b0fc68dce394b46626b5f12");
    expect(labor.freeze_tag).toBe("aletheia-labor-v1.0.0");
    expect(labor.commit).toBe("ca6a85e12b05df28e73e60ac406c90ad16352ed3");
    for (const p of [v1, labor]) {
      expect(p.branch).toBe("main");
      expect(p.remote).toBeNull();
      for (const h of [p.tag_object, p.commit, p.tree]) expect(h).toMatch(HEX40);
    }
  });

  it("registers the expected LABOR counts", () => {
    const { expected_counts: e, counts_observed_from_git_objects: o } = pins.pins.labor;
    expect(e.questions).toBe(18);
    expect(e.claims).toBe(14);
    expect(e.hypotheses).toBe(9);
    expect(e.claim_states).toEqual({
      OBSERVED_IN_SOURCE: 10,
      REFUTED_WITHIN_SCOPE: 1,
      INSUFFICIENT_EVIDENCE: 3,
      ESTABLISHED: 0,
      CONVERGENT: 0,
      DIVERGENT: 0,
    });
    expect(o).toEqual(e);
  });

  it("keeps the claim-state counts consistent with the claim total", () => {
    const { expected_counts: e } = pins.pins.labor;
    const total = Object.values(e.claim_states).reduce((a, b) => a + b, 0);
    expect(total).toBe(e.claims);
    expect(pins.pins.labor.questions_with_claims).toBeLessThanOrEqual(e.questions);
  });
});
