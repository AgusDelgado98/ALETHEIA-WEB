"use client";
import { useEffect, useState } from "react";

type Level = "resumen" | "detalle" | "auditoria";
const LABELS: [Level, string][] = [["resumen", "Resumen"], ["detalle", "Detalle"], ["auditoria", "Auditoría"]];

export default function RastroLevels({ detail, audit }: { detail: string[]; audit: string[] }) {
  const [ready, setReady] = useState(false);
  const [level, setLevel] = useState<Level>("resumen");
  useEffect(() => setReady(true), []);
  const show = (l: Level) => !ready || level === l;
  return (
    <div className="levels">
      <div role="group" aria-label="Profundidad del Rastro" hidden={!ready}>
        {LABELS.map(([l, t]) => (
          <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)}>{t}</button>
        ))}
      </div>
      <div className="level-panel" hidden={!show("detalle")}>{detail.map((t) => <p key={t}>{t}</p>)}</div>
      <div className="level-panel" hidden={!show("auditoria")}>{audit.map((t) => <p key={t}>{t}</p>)}</div>
    </div>
  );
}
