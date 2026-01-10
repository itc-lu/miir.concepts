import Link from 'next/link';

export default function DatenschutzPage() {
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
        <h1 className="text-3xl font-bold text-white mb-8">Datenschutzerklärung</h1>

        <div className="prose prose-invert prose-slate space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Datenschutz auf einen Blick</h2>
            <p className="text-slate-300">
              Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst.
              Diese Datenschutzerklärung informiert Sie darüber, welche Daten
              wir erheben und wie wir diese verwenden.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Datenerfassung auf dieser Website</h2>
            <p className="text-slate-300">
              <strong className="text-white">Wer ist verantwortlich für die Datenerfassung?</strong><br />
              Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber
              miir.concepts.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Cookies</h2>
            <p className="text-slate-300">
              Diese Website verwendet nur technisch notwendige Cookies,
              die für den Betrieb der Website erforderlich sind.
              Tracking-Cookies werden nicht verwendet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Ihre Rechte</h2>
            <p className="text-slate-300">
              Sie haben jederzeit das Recht auf unentgeltliche Auskunft über
              Ihre gespeicherten personenbezogenen Daten, deren Herkunft und
              Empfänger sowie den Zweck der Datenverarbeitung.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Kontakt</h2>
            <p className="text-slate-300">
              Bei Fragen zur Erhebung, Verarbeitung oder Nutzung Ihrer
              personenbezogenen Daten kontaktieren Sie uns unter:<br />
              info@miir.lu
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
