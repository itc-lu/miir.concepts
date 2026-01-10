import Link from 'next/link';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Zurück zum Kinoprogramm
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-8">Impressum</h1>

        <div className="prose prose-invert prose-slate">
          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Angaben gemäß § 5 TMG</h2>
            <p className="text-slate-300">
              miir.concepts<br />
              Musterstraße 1<br />
              1234 Luxembourg
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Kontakt</h2>
            <p className="text-slate-300">
              E-Mail: info@miir.lu<br />
              Telefon: +352 XXX XXX
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Verantwortlich für den Inhalt</h2>
            <p className="text-slate-300">
              miir.concepts<br />
              Musterstraße 1<br />
              1234 Luxembourg
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4">Haftungsausschluss</h2>
            <p className="text-slate-300">
              Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt.
              Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte
              können wir jedoch keine Gewähr übernehmen.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
