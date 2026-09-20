import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

interface ImportedFile {
  path: string;
  status: string;
  sha256_source: string;
  sha256_repo_copy: string;
  identical_to_source: boolean;
}
const manifest = JSON.parse(
  readFileSync(join(root, "governance/IMPORT-MANIFEST.json"), "utf8"),
) as {
  status: string;
  files: ImportedFile[];
};

describe("governance import (WEB-0 / Design Charter, FROZEN)", () => {
  it("declares every imported file as FROZEN", () => {
    expect(manifest.status).toBe("FROZEN");
    expect(manifest.files).toHaveLength(9);
    for (const f of manifest.files) expect(f.status).toBe("FROZEN");
  });

  it("keeps each copy byte-identical to the recorded source hash", () => {
    for (const f of manifest.files) {
      expect(f.identical_to_source, f.path).toBe(true);
      expect(f.sha256_repo_copy, f.path).toBe(f.sha256_source);
      expect(sha256(join(root, f.path)), f.path).toBe(f.sha256_source);
    }
  });

  it("matches the WEB-0 SHA256SUMS as issued at freeze", () => {
    const dir = join(root, "governance/web-0");
    const lines = readFileSync(join(dir, "SHA256SUMS.txt"), "utf8").split(/\r?\n/).filter(Boolean);
    expect(lines).toHaveLength(8);
    for (const line of lines) {
      const m = /^([0-9a-f]{64}) \*(.+)$/.exec(line);
      expect(m, line).not.toBeNull();
      expect(sha256(join(dir, m![2]!)), m![2]).toBe(m![1]);
    }
  });
});
