import { useMemo, useState } from "react";
import { CheckSquare, FileCheck2, LoaderCircle, ScanText, Sparkles } from "lucide-react";
import { parseFinancialDocument } from "../utils/ocrParser";

async function runOcr(file) {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("fra");
  const result = await worker.recognize(file);
  await worker.terminate();
  return result.data.text || "";
}

const PAYMENT_FILTERS = [
  { value: "all", label: "Tous" },
  { value: "unpaid", label: "Non payes" },
  { value: "paid", label: "Deja encaisses" },
];

function StatusBadge({ paymentStatus }) {
  const paid = paymentStatus === "paid";
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        paid ? "border-[#9fe3b9]/24 bg-[#9fe3b9]/10 text-[#9fe3b9]" : "border-[#ffaf66]/25 bg-[#ffaf66]/10 text-[#ffaf66]"
      }`}
    >
      {paid ? "Deja encaisse" : "Non paye"}
    </span>
  );
}

function CategoryChip({ value, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        selected
          ? "border-[#61d2c0]/38 bg-[#61d2c0]/14 text-[#61d2c0]"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/18 hover:text-white"
      }`}
    >
      {selected ? "✓ " : ""}{value}
    </button>
  );
}

export function DocumentsIngestionModule({
  records,
  drivers,
  incomeCategories = [],
  canWrite,
  onAnalyzeDocument,
  onCreateFromDocument,
  onUpdateDocument = () => {},
  formatCurrency,
  title = "Documents recus (OCR)",
  description = "Ingestion WhatsApp/PDF/Image, extraction OCR et pre-remplissage encaissement.",
  encaissementOnly = false,
}) {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("whatsapp");
  const [manualText, setManualText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateSort, setDateSort] = useState("desc");

  function resolveDocumentDate(record) {
    return record?.documentDate || record?.parsed?.date || record?.date || "";
  }

  const filteredRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const left = Date.parse(resolveDocumentDate(a));
      const right = Date.parse(resolveDocumentDate(b));
      const leftSafe = Number.isNaN(left) ? 0 : left;
      const rightSafe = Number.isNaN(right) ? 0 : right;
      return dateSort === "asc" ? leftSafe - rightSafe : rightSafe - leftSafe;
    });
    if (paymentFilter === "all") return sorted;
    return sorted.filter((item) => item.paymentStatus === paymentFilter);
  }, [records, paymentFilter, dateSort]);

  const unpaidCount = useMemo(() => records.filter((item) => item.paymentStatus !== "paid").length, [records]);
  const paidCount = useMemo(() => records.filter((item) => item.paymentStatus === "paid").length, [records]);

  async function submitAnalyze(event) {
    event.preventDefault();
    if (!canWrite || !file) return;
    setError("");
    setIsAnalyzing(true);

    try {
      let extractedText = manualText.trim();
      if (!extractedText && file.type.startsWith("image/")) {
        extractedText = await runOcr(file);
      }
      if (!extractedText) {
        setError("Impossible d'extraire le texte automatiquement. Ajoute un texte manuel.");
        setIsAnalyzing(false);
        return;
      }

      const parsed = parseFinancialDocument(extractedText, drivers);
      onAnalyzeDocument({
        source,
        file,
        extractedText,
        parsed,
      });
      setFile(null);
      setManualText("");
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Erreur OCR.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateStatus(docId, paymentStatus) {
    onUpdateDocument(docId, { paymentStatus });
  }

  function updateCategory(docId, selectedCategory) {
    onUpdateDocument(docId, { selectedCategory });
  }

  function updateDocumentDate(docId, documentDate) {
    onUpdateDocument(docId, { documentDate });
  }

  return (
    <section className="space-y-6">
      <section className="rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <p className="mt-1 text-sm text-white/50">{description}</p>

        <form className="mt-4 grid gap-3 xl:grid-cols-[160px,1fr,1fr,auto]" onSubmit={submitAnalyze}>
          <select value={source} onChange={(event) => setSource(event.target.value)} className="h-11 rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none focus:border-[#cf5d56]">
            <option value="whatsapp">WhatsApp</option>
            <option value="manual">Depot manuel</option>
            <option value="email">Email</option>
          </select>
          <input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="block h-11 w-full rounded-xl border border-white/8 bg-black/25 px-3 py-2 text-xs text-white/65 file:mr-2 file:rounded-lg file:border file:border-white/12 file:bg-white/[0.05] file:px-3 file:py-1.5" />
          <input value={manualText} onChange={(event) => setManualText(event.target.value)} placeholder="Texte OCR manuel (optionnel)" className="h-11 rounded-xl border border-white/8 bg-black/25 px-3 text-sm outline-none focus:border-[#cf5d56]" />
          <button type="submit" disabled={!canWrite || !file || isAnalyzing} className="h-11 rounded-full border border-[#cf5d56]/45 bg-[#cf5d56] px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55">
            {isAnalyzing ? <span className="inline-flex items-center gap-2"><LoaderCircle className="size-4 animate-spin" />Analyse...</span> : "Analyser"}
          </button>
        </form>

        {error ? <p className="mt-3 rounded-xl border border-[#cf5d56]/25 bg-[#cf5d56]/10 px-3 py-2 text-sm text-[#ffb2ab]">{error}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {PAYMENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setPaymentFilter(filter.value)}
              className={`rounded-full border px-3 py-1.5 transition ${
                paymentFilter === filter.value
                  ? "border-[#cf5d56]/36 bg-[#cf5d56]/15 text-[#ff8f84]"
                  : "border-white/10 bg-white/[0.02] text-white/64 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          ))}
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60">{unpaidCount} non payes</span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/60">{paidCount} encaisses</span>
          <select
            value={dateSort}
            onChange={(event) => setDateSort(event.target.value)}
            className="h-8 rounded-full border border-white/10 bg-white/[0.03] px-3 text-xs text-white/76 outline-none"
          >
            <option value="desc">Date recente</option>
            <option value="asc">Date ancienne</option>
          </select>
        </div>
      </section>

      <section className="space-y-4">
        {filteredRecords.map((doc) => (
          <article key={doc.id} className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,#161616_0%,#101010_100%)] p-5 text-white">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#cf5d56]">{doc.source}</p>
                <h4 className="mt-2 text-lg font-semibold">{doc.fileName}</h4>
                <p className="mt-1 text-xs text-white/45">Date document: {resolveDocumentDate(doc) || "-"}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge paymentStatus={doc.paymentStatus} />
                <span className={`rounded-full border px-3 py-1 text-xs ${doc.status === "validated" ? "border-[#9fe3b9]/24 bg-[#9fe3b9]/10 text-[#9fe3b9]" : "border-[#ffaf66]/25 bg-[#ffaf66]/10 text-[#ffaf66]"}`}>
                  {doc.status === "validated" ? "Valide" : "Analyse"}
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs text-white/70">
                Date doc
                <input
                  type="date"
                  value={resolveDocumentDate(doc)}
                  onChange={(event) => updateDocumentDate(doc.id, event.target.value)}
                  disabled={!canWrite}
                  className="h-6 rounded-md border border-white/10 bg-black/35 px-2 text-xs text-white outline-none disabled:cursor-not-allowed disabled:opacity-45"
                />
              </label>
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => updateStatus(doc.id, "unpaid")}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  doc.paymentStatus === "unpaid"
                    ? "border-[#ffaf66]/32 bg-[#ffaf66]/12 text-[#ffaf66]"
                    : "border-white/10 bg-white/[0.02] text-white/64"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                Non paye
              </button>
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => updateStatus(doc.id, "paid")}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  doc.paymentStatus === "paid"
                    ? "border-[#9fe3b9]/32 bg-[#9fe3b9]/12 text-[#9fe3b9]"
                    : "border-white/10 bg-white/[0.02] text-white/64"
                } disabled:cursor-not-allowed disabled:opacity-45`}
              >
                Deja encaisse
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.02fr,0.98fr]">
              <div className="rounded-xl border border-white/8 bg-black/18 p-4">
                <p className="flex items-center gap-2 text-sm text-white/52"><ScanText className="size-4" />Texte extrait</p>
                <pre className="mt-2 max-h-[180px] overflow-auto whitespace-pre-wrap text-xs text-white/68">{doc.extractedText}</pre>
                {doc.fileType?.startsWith("image/") ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-white/8 bg-black/26">
                    <img
                      src={doc.fileUrl}
                      alt={doc.fileName}
                      className="h-48 w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>

              <div className="rounded-xl border border-white/8 bg-black/18 p-4">
                <p className="flex items-center gap-2 text-sm text-white/52"><Sparkles className="size-4" />Classification</p>
                <div className="mt-2 space-y-1 text-sm text-white/74">
                  <p>Type detecte: {doc.parsed.type}</p>
                  <p>Client: {doc.parsed.client || "-"}</p>
                  <p>Date: {doc.parsed.date || "-"}</p>
                  <p>Montant: {formatCurrency(doc.parsed.amount || 0)}</p>
                  <p>Reference: {doc.parsed.reference || "-"}</p>
                </div>

                <div className="mt-3">
                  <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/45">
                    <CheckSquare className="size-3.5" />
                    Categorie a cocher
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {incomeCategories.map((category) => (
                      <CategoryChip
                        key={category}
                        value={category}
                        selected={(doc.selectedCategory || doc.parsed.category) === category}
                        onClick={() => updateCategory(doc.id, category)}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {!encaissementOnly && (
                    <button
                      type="button"
                      disabled={!canWrite || doc.status === "validated"}
                      onClick={() => onCreateFromDocument(doc.id, "depense")}
                      className="rounded-full border border-[#cf5d56]/35 bg-[#cf5d56]/14 px-3 py-1.5 text-xs text-[#ff8f84] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Creer depense
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!canWrite || doc.status === "validated"}
                    onClick={() => onCreateFromDocument(doc.id, "encaissement")}
                    className="rounded-full border border-[#61d2c0]/35 bg-[#61d2c0]/14 px-3 py-1.5 text-xs text-[#61d2c0] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Creer encaissement
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/75"
              >
                <FileCheck2 className="size-3.5" />
                Ouvrir le document
              </a>
            </div>
          </article>
        ))}
        {!filteredRecords.length ? <p className="rounded-xl border border-white/8 bg-black/18 px-4 py-3 text-sm text-white/46">Aucun document sur ce filtre.</p> : null}
      </section>
    </section>
  );
}
