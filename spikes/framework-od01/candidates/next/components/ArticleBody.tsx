import c from "../content.json";
import RastroLevels from "./RastroLevels";

function RastroSvg() {
  const xs = c.rastro.map((_, i) => 45 + i * 143);
  return (
    <svg viewBox="0 0 520 70" role="img" aria-labelledby="rt rd">
      <title id="rt">Rastro de la afirmación</title>
      <desc id="rd">{c.rastro.map((r) => `${r[0]}: ${r[1]}`).join(" → ")}</desc>
      <line x1="45" y1="24" x2="474" y2="24" stroke="currentColor" strokeWidth="1" />
      {xs.map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="24" r="6" fill={i === xs.length - 1 ? "#1f6f63" : "#f6f3ec"} stroke="currentColor" />
          <text x={x} y="56" textAnchor="middle" fontSize="12" fill="currentColor">{c.rastro[i][0]}</text>
        </g>
      ))}
    </svg>
  );
}

export default function ArticleBody({ interactive = false }: { interactive?: boolean }) {
  return (
    <>
      <header className="site-header wrap">
        <span className="wordmark">{c.site.name}</span>
        <span className="descriptor">{c.site.descriptor}</span>
      </header>
      <main className="wrap">
        <p className="notice">{c.fixtureNotice}</p>
        <article>
          <p className="kicker">Pregunta · {c.question.id}</p>
          <h1>{c.question.text}</h1>
          <figure className="figure">
            <p className="figure-num">{c.figure.value}</p>
            <p className="figure-unit">{c.figure.unit}</p>
            <figcaption>{c.figure.caption}</figcaption>
            <div className="encuadre">
              <dl>
                {c.figure.encuadre.map(([k, v]) => (
                  <div key={k} style={{ display: "contents" }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </figure>
          <section aria-labelledby="h-yn">
            <h2 id="h-yn">Lo que sí / Lo que no</h2>
            <div className="yesno">
              <div>
                <h3>Lo que sí</h3>
                <ul>{c.yes.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
              <div>
                <h3>Lo que no</h3>
                <ul>{c.no.map((t) => <li key={t}>{t}</li>)}</ul>
              </div>
            </div>
          </section>
          <section className="rastro" aria-labelledby="h-rt">
            <h2 id="h-rt">Rastro</h2>
            <RastroSvg />
            <ol>{c.rastro.map((r) => <li key={r[0]}>{r[0]}: {r[1]}</li>)}</ol>
            {interactive ? <RastroLevels detail={c.rastroDetail} audit={c.rastroAudit} /> : null}
          </section>
        </article>
      </main>
      <footer className="wrap">{c.resultLabel} · {c.figure.encuadre[3][1]}</footer>
    </>
  );
}
