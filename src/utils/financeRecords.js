const STORAGE_KEYS = {
  expenses: "sdv_finance_expenses_v1",
  incomes: "sdv_finance_incomes_v1",
  documents: "sdv_finance_documents_v1",
};

const ALLOWED_FILE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const MAX_FILE_SIZE = 4 * 1024 * 1024;

function safeParse(jsonValue) {
  try {
    const parsed = JSON.parse(jsonValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadFinanceRecords(key) {
  if (typeof window === "undefined") return [];
  const storageKey = STORAGE_KEYS[key];
  if (!storageKey) return [];
  let rawValue = null;
  try {
    rawValue = window.localStorage.getItem(storageKey);
  } catch {
    return [];
  }
  if (!rawValue) return [];
  return safeParse(rawValue);
}

export function saveFinanceRecords(key, records) {
  if (typeof window === "undefined") return;
  const storageKey = STORAGE_KEYS[key];
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(records));
  } catch {
    // Ignore storage write failures (quota/private mode).
  }
}

export function validateUploadFile(file) {
  if (!file) return { ok: false, reason: "Fichier manquant." };
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, reason: "Fichier trop lourd (max 4 MB)." };
  }
  if (file.type && !ALLOWED_FILE_TYPES.has(file.type)) {
    return { ok: false, reason: "Type de fichier non supporte (PDF/JPG/PNG/DOC/DOCX)." };
  }
  return { ok: true, reason: "" };
}

export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

export async function buildUploadRecord(payload) {
  const fileDataUrl = await fileToDataUrl(payload.file);

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    reference: payload.reference,
    date: payload.date,
    amount: payload.amount ?? 0,
    docType: payload.docType ?? "",
    fileName: payload.file.name,
    fileSize: payload.file.size,
    fileType: payload.file.type || "application/octet-stream",
    fileUrl: fileDataUrl,
    createdAt: new Date().toISOString(),
  };
}

export function buildFinanceTimeline(expenses, incomes, documents) {
  const expenseRows = expenses.map((item) => ({
    ...item,
    category: "Depense",
    displayAmount: item.amount,
    amountTone: "text-[#ff8f84]",
  }));
  const incomeRows = incomes.map((item) => ({
    ...item,
    category: "Encaissement",
    displayAmount: item.amount,
    amountTone: "text-[#9fe3b9]",
  }));
  const documentRows = documents.map((item) => ({
    ...item,
    category: item.docType || "Document",
    displayAmount: null,
    amountTone: "text-white/60",
    date: item.documentDate || item.date,
  }));

  return [...expenseRows, ...incomeRows, ...documentRows].sort((a, b) => {
    const left = Date.parse(a.date || a.createdAt || "");
    const right = Date.parse(b.date || b.createdAt || "");
    return Number.isNaN(right) || Number.isNaN(left) ? 0 : right - left;
  });
}
