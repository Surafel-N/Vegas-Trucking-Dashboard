import { AlertTriangle, CheckCircle2, FileImage, LoaderCircle, UploadCloud } from "lucide-react";
import { useMemo, useRef, useState } from "react";

const supportedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

function formatNumber(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function humanSize(size) {
  if (!size) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function InvoiceVisionAnalyzer() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const inputRef = useRef(null);

  const dashboard = useMemo(() => {
    const totalAnalyzed = history.length;
    const totalAmount = history.reduce((sum, row) => sum + Number(row.montant_total_lu || 0), 0);
    const totalCorrect = history
      .filter((row) => row.statut_calcul === "Correct")
      .reduce((sum, row) => sum + Number(row.montant_total_lu || 0), 0);
    const totalErrors = totalAmount - totalCorrect;

    return {
      totalAnalyzed,
      totalAmount,
      totalCorrect,
      totalErrors,
    };
  }, [history]);

  function onPick(nextFile) {
    if (!nextFile) return;
    if (!supportedTypes.includes(nextFile.type)) {
      setError("Format non supporte. Utilise JPG, PNG ou PDF.");
      return;
    }
    setError("");
    setFile(nextFile);
  }

  function onDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    onPick(event.dataTransfer.files?.[0] ?? null);
  }

  async function handleAnalyze() {
    if (!file) return;
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analyze-invoice", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || payload?.details || "Echec analyse.");
      }

      const row = {
        ...payload,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        analyzedAt: new Date().toISOString(),
        fileName: file.name,
      };
      setResult(row);
      setHistory((prev) => [row, ...prev]);
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Erreur serveur.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-4 rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,#171717_0%,#101010_100%)] p-5 text-white">
      <header className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">Analyse facture IA (Vision)</h3>
          <p className="mt-1 text-sm text-white/56">
            Upload JPG/PNG/PDF, extraction automatique et verification Quantite x Prix unitaire.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-white/45">Documents</p>
            <p className="mt-1 text-sm font-semibold">{dashboard.totalAnalyzed}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <p className="text-white/45">Montant lu</p>
            <p className="mt-1 text-sm font-semibold">{formatNumber(dashboard.totalAmount)} FCFA</p>
          </div>
          <div className="rounded-xl border border-[#9fe3b9]/20 bg-[#9fe3b9]/10 px-3 py-2">
            <p className="text-[#9fe3b9]/85">Calcul correct</p>
            <p className="mt-1 text-sm font-semibold text-[#9fe3b9]">{formatNumber(dashboard.totalCorrect)} FCFA</p>
          </div>
          <div className="rounded-xl border border-[#cf5d56]/20 bg-[#cf5d56]/10 px-3 py-2">
            <p className="text-[#ffb2ab]/90">Ecart calcul</p>
            <p className="mt-1 text-sm font-semibold text-[#ff8f84]">{formatNumber(dashboard.totalErrors)} FCFA</p>
          </div>
        </div>
      </header>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`cursor-pointer rounded-2xl border border-dashed p-5 transition ${
          isDragging
            ? "border-[#61d2c0]/70 bg-[#61d2c0]/12"
            : "border-white/14 bg-black/18 hover:border-white/26"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={(event) => onPick(event.target.files?.[0] ?? null)}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <UploadCloud className="size-7 text-[#61d2c0]" />
          <p className="text-sm text-white/78">Glisse ton document ici, ou clique pour selectionner un fichier.</p>
          <p className="text-xs text-white/46">Formats: JPG, PNG, PDF</p>
          {file ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs text-white/74">
              <FileImage className="size-3.5" />
              {file.name} ({humanSize(file.size)})
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!file || isLoading}
          onClick={handleAnalyze}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-[#cf5d56]/45 bg-[#cf5d56] px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isLoading ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <UploadCloud className="size-4" />
              Lancer l'analyse IA
            </>
          )}
        </button>
        {error ? (
          <p className="inline-flex items-center gap-2 rounded-full border border-[#cf5d56]/24 bg-[#cf5d56]/12 px-3 py-1.5 text-xs text-[#ffb2ab]">
            <AlertTriangle className="size-3.5" />
            {error}
          </p>
        ) : null}
      </div>

      {result ? (
        <article className="rounded-2xl border border-white/10 bg-black/22 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold tracking-wide text-white">Resultat extrait</h4>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                result.statut_calcul === "Correct"
                  ? "border-[#9fe3b9]/30 bg-[#9fe3b9]/12 text-[#9fe3b9]"
                  : "border-[#cf5d56]/30 bg-[#cf5d56]/12 text-[#ff9e95]"
              }`}
            >
              {result.statut_calcul === "Correct" ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
              {result.statut_calcul}
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/8">
            <table className="min-w-full border-separate border-spacing-0 text-sm">
              <tbody className="text-white/78">
                <tr className="border-t border-white/6">
                  <td className="w-1/3 px-3 py-2 text-white/52">Compagnie</td>
                  <td className="px-3 py-2">{result.compagnie || "-"}</td>
                </tr>
                <tr className="border-t border-white/6">
                  <td className="px-3 py-2 text-white/52">Reference / Designation</td>
                  <td className="px-3 py-2">{result.reference || "-"}</td>
                </tr>
                <tr className="border-t border-white/6">
                  <td className="px-3 py-2 text-white/52">Quantite</td>
                  <td className="px-3 py-2">{formatNumber(result.quantite)}</td>
                </tr>
                <tr className="border-t border-white/6">
                  <td className="px-3 py-2 text-white/52">Prix unitaire</td>
                  <td className="px-3 py-2">{formatNumber(result.prix_unitaire)} FCFA</td>
                </tr>
                <tr className="border-t border-white/6">
                  <td className="px-3 py-2 text-white/52">Montant total lu</td>
                  <td className="px-3 py-2">{formatNumber(result.montant_total_lu)} FCFA</td>
                </tr>
                <tr className="border-t border-white/6">
                  <td className="px-3 py-2 text-white/52">Calcul verification</td>
                  <td className="px-3 py-2">{formatNumber(result.calcul_verification)} FCFA</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      ) : null}
    </section>
  );
}
