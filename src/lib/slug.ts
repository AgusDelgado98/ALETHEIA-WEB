export function questionSlug(id: string): string {
  return id.replace(/^LAB-/, "").toLowerCase();
}
