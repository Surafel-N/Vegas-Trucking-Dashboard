import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  MessageSquare,
  FolderOpen,
  UploadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings,
  FileText,
  Image as ImageIcon,
  Calendar,
  Tag,
  Truck,
  Sparkles,
  Trash2,
  Send,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  ShieldCheck,
  Smartphone,
  Eye,
  X,
} from "lucide-react";

export interface WhatsAppInvoiceRecord {
  id: string;
  receivedAt: string;
  addedDate: string; // YYYY-MM-DD (Date d'ajout)
  invoiceDate: string; // YYYY-MM-DD (Date de facture)
  invoiceType:
    | "CARBURANT"
    | "MAINTENANCE"
    | "PEAGE_ROUTE"
    | "FACTURE_CLIENT"
    | "ASSURANCE_DOC"
    | "AUTRE";
  invoiceTypeLabel: string;
  driveFolderName: string;
  accountingCategory: string;
  targetModule: string;
  amount: number;
  vendorOrClient: string;
  reference: string;
  truck: string;
  corridor: "SAN_PEDRO" | "ABIDJAN";
  tonnage: number;
  unitPrice: number;
  description: string;
  caption: string;
  senderPhone: string;
  senderName: string;
  sourceChannel: string;
  fileName: string;
  mimeType: string;
  localPreviewUrl?: string;
  dataUrlFallback?: string;
  driveUploaded: boolean;
  driveFileId?: string | null;
  driveLink?: string | null;
  driveDateFolderLink?: string | null;
  driveTypeFolderLink?: string | null;
  drivePath: string;
  driveStatusReason?: string | null;
  syncedToApp: boolean;
  syncedAt?: string | null;
}

export const INVOICE_TYPE_OPTIONS = [
  {
    code: "CARBURANT",
    label: "Carburant (Gasoil)",
    driveFolderName: "01_Carburant_Gasoil",
    accountingCategory: "Carburant (Gasoil)",
    color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  },
  {
    code: "MAINTENANCE",
    label: "Maintenance & Pièces",
    driveFolderName: "02_Maintenance_Pieces",
    accountingCategory: "Maintenance & Pneumatiques",
    color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
  },
  {
    code: "PEAGE_ROUTE",
    label: "Péage & Frais de Route",
    driveFolderName: "03_Peages_Frais_Route",
    accountingCategory: "Frais de Route & Péages",
    color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
  },
  {
    code: "FACTURE_CLIENT",
    label: "Facture Client & Pesée",
    driveFolderName: "04_Factures_Clients_Tonnage",
    accountingCategory: "Recettes Transport (Facturation)",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  },
  {
    code: "ASSURANCE_DOC",
    label: "Assurance & Documents",
    driveFolderName: "05_Assurances_Documents",
    accountingCategory: "Cartes de Transport & Régularisations",
    color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  },
  {
    code: "AUTRE",
    label: "Autres Factures & Reçus",
    driveFolderName: "06_Autres_Factures",
    accountingCategory: "Charges Générales & Divers",
    color: "text-slate-300 bg-white/5 border-white/20",
  },
] as const;

const LOCAL_STORAGE_INBOX_KEY = "sdv_whatsapp_inbox_v1";
const LOCAL_STORAGE_CONFIG_KEY = "sdv_whatsapp_config_v1";

export function extractDriveFolderId(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "";
  const matchFolder = trimmed.match(/\/folders\/([a-zA-Z0-9_-]{15,})/);
  if (matchFolder?.[1]) return matchFolder[1];
  const matchId = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (matchId?.[1]) return matchId[1];
  return trimmed;
}

interface WhatsAppDriveBotModuleProps {
  onIntegrateItems?: (items: WhatsAppInvoiceRecord[]) => number;
  googleClientId?: string;
  language?: "FR" | "EN";
}

export default function WhatsAppDriveBotModule({
  onIntegrateItems,
  googleClientId,
  language = "FR",
}: WhatsAppDriveBotModuleProps) {
  const isEn = language === "EN";

  const [subTab, setSubTab] = useState<"drive_tree" | "whatsapp_sim" | "config">("drive_tree");
  const [items, setItems] = useState<WhatsAppInvoiceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_INBOX_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      driveRootFolderId: "",
      driveRootFolderName: "SDV_Factures_WhatsApp",
      verifyToken: "sdv_whatsapp_verify_2026",
      whatsappPhoneNumberId: "",
      whatsappAccessToken: "",
      autoSyncToApp: true,
    };
  });

  const [driveFolderInput, setDriveFolderInput] = useState(config.driveRootFolderId || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Filtres Arborescence Drive
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  const [previewItem, setPreviewItem] = useState<WhatsAppInvoiceRecord | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // États du Simulateur / Dépôt WhatsApp
  const [simSenderName, setSimSenderName] = useState("Amara (Chauffeur Truck 76)");
  const [simSenderPhone, setSimSenderPhone] = useState("+225 07 08 76 76 76");
  const [simCaption, setSimCaption] = useState("");
  const [simAddedDate, setSimAddedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [simTypeOverride, setSimTypeOverride] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // États Connexion WhatsApp par QR Code (Méthode 1)
  const [qrStatus, setQrStatus] = useState<{
    state: "disconnected" | "connecting" | "qr_ready" | "connected";
    qrDataUrl: string | null;
    connectedUser: { phone: string; name: string; connectedAt?: string } | null;
    lastError: string | null;
    processedCount: number;
  }>({
    state: "disconnected",
    qrDataUrl: null,
    connectedUser: null,
    lastError: null,
    processedCount: 0,
  });
  const [showQrModal, setShowQrModal] = useState(false);

  const fetchQrStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/qr/status");
      if (res.ok) {
        const data = await res.json();
        setQrStatus(data);
      }
    } catch {}
  };

  const handleStartQrConnection = async (forceNewQr = false) => {
    setShowQrModal(true);
    setQrStatus((prev) => ({ ...prev, state: "connecting", lastError: null }));
    try {
      const res = await fetch("/api/whatsapp/qr/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceNewQr }),
      });
      if (res.ok) {
        const data = await res.json();
        setQrStatus(data);
      }
    } catch (err: any) {
      setQrStatus((prev) => ({
        ...prev,
        state: "disconnected",
        lastError: err.message,
      }));
    }
  };

  const handleLogoutQrConnection = async () => {
    try {
      const res = await fetch("/api/whatsapp/qr/logout", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setQrStatus(data);
      }
    } catch {}
  };

  const saveLocalInbox = (list: WhatsAppInvoiceRecord[]) => {
    setItems(list);
    try {
      localStorage.setItem(LOCAL_STORAGE_INBOX_KEY, JSON.stringify(list));
    } catch {}
  };

  // Chargement initial depuis le backend
  const fetchInboxAndConfig = async () => {
    setIsLoading(true);
    try {
      const [inboxRes, cfgRes] = await Promise.all([
        fetch("/api/whatsapp/inbox"),
        fetch("/api/whatsapp/config"),
      ]);
      if (inboxRes.ok) {
        const data = await inboxRes.json();
        if (Array.isArray(data.items)) {
          saveLocalInbox(data.items);
        }
      }
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig((prev: any) => {
          const next = { ...prev, ...cfgData };
          try {
            localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
        if (cfgData.driveRootFolderId) {
          setDriveFolderInput(cfgData.driveRootFolderId);
        }
      }
    } catch {
      // Mode hors-ligne / fallback localStorage actif
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInboxAndConfig();
    fetchQrStatus();
  }, []);

  // Rafraîchissement automatique du statut QR Code et de la boîte de réception WhatsApp
  useEffect(() => {
    const shouldPollFast =
      showQrModal || qrStatus.state === "connecting" || qrStatus.state === "qr_ready";
    const intervalMs = shouldPollFast ? 2200 : qrStatus.state === "connected" ? 5000 : 12000;

    const timer = setInterval(async () => {
      await fetchQrStatus();
      try {
        const inboxRes = await fetch("/api/whatsapp/inbox");
        if (inboxRes.ok) {
          const data = await inboxRes.json();
          if (Array.isArray(data.items)) {
            saveLocalInbox(data.items);
          }
        }
      } catch {}
    }, intervalMs);

    return () => clearInterval(timer);
  }, [showQrModal, qrStatus.state]);

  // Groupement hiérarchique : Niveau 1 = Date d'ajout (YYYY-MM-DD) -> Niveau 2 = Type de facture
  const groupedByDateAndType = useMemo(() => {
    const filtered = items.filter((item) => {
      if (selectedDateFilter !== "ALL" && item.addedDate !== selectedDateFilter) return false;
      if (selectedTypeFilter !== "ALL" && item.invoiceType !== selectedTypeFilter) return false;
      return true;
    });

    const map: Record<string, Record<string, WhatsAppInvoiceRecord[]>> = {};
    for (const item of filtered) {
      const dKey = item.addedDate || new Date().toISOString().slice(0, 10);
      const tKey = item.invoiceType || "AUTRE";
      if (!map[dKey]) map[dKey] = {};
      if (!map[dKey][tKey]) map[dKey][tKey] = [];
      map[dKey][tKey].push(item);
    }
    return map;
  }, [items, selectedDateFilter, selectedTypeFilter]);

  const sortedDates = useMemo(
    () => Object.keys(groupedByDateAndType).sort((a, b) => b.localeCompare(a)),
    [groupedByDateAndType]
  );

  const uniqueDates = useMemo(
    () => Array.from(new Set(items.map((i) => i.addedDate))).sort((a, b) => b.localeCompare(a)),
    [items]
  );

  const stats = useMemo(() => {
    const totalDocs = items.length;
    const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const driveSynced = items.filter((i) => i.driveUploaded).length;
    const appSynced = items.filter((i) => i.syncedToApp).length;
    const pendingAppSync = totalDocs - appSynced;
    return { totalDocs, totalAmount, driveSynced, appSynced, pendingAppSync };
  }, [items]);

  // Envoi d'une ou plusieurs factures via le Bot WhatsApp (Simulateur ou Dépôt direct)
  const handleSendWhatsAppFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setStatusBanner({
        type: "error",
        text: isEn
          ? "Please attach at least one invoice image or PDF."
          : "Veuillez joindre au moins une image ou un PDF de facture.",
      });
      return;
    }

    setIsUploading(true);
    setStatusBanner(null);

    const folderId = extractDriveFolderId(driveFolderInput || config.driveRootFolderId);

    try {
      const formData = new FormData();
      selectedFiles.forEach((f) => formData.append("files", f));
      formData.append("senderName", simSenderName);
      formData.append("senderPhone", simSenderPhone);
      formData.append("caption", simCaption);
      formData.append("addedDate", simAddedDate);
      if (simTypeOverride) formData.append("invoiceType", simTypeOverride);
      if (folderId) formData.append("driveFolderId", folderId);

      const res = await fetch("/api/whatsapp/ingest", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const created: WhatsAppInvoiceRecord[] = data.records || [];

      const updatedList = [...created, ...items];
      saveLocalInbox(updatedList);

      // Si autoSyncToApp est activé, intégrer immédiatement dans l'application
      if (config.autoSyncToApp && onIntegrateItems && created.length > 0) {
        onIntegrateItems(created);
        await fetch("/api/whatsapp/mark-synced", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: created.map((c) => c.id) }),
        }).catch(() => {});
        const markedList = updatedList.map((it) =>
          created.some((c) => c.id === it.id)
            ? { ...it, syncedToApp: true, syncedAt: new Date().toISOString() }
            : it
        );
        saveLocalInbox(markedList);
      }

      setSelectedFiles([]);
      setSimCaption("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      const first = created[0];
      setStatusBanner({
        type: "success",
        text: isEn
          ? `✅ ${created.length} invoice(s) processed by WhatsApp Bot -> Filed in [${first?.addedDate} / ${first?.driveFolderName}]`
          : `✅ ${created.length} facture(s) reçue(s) via Bot WhatsApp → Classée(s) dans Drive [${first?.addedDate} / ${first?.driveFolderName}] (${(
              first?.amount || 0
            ).toLocaleString("fr-FR")} CFA)`,
      });
    } catch (err: any) {
      setStatusBanner({
        type: "error",
        text: `Erreur lors du traitement WhatsApp : ${err.message}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Synchroniser toutes les factures WhatsApp en attente vers l'Application (Comptabilité, Factures Clients, Maintenance)
  const handleSyncToApplication = async (targetItems?: WhatsAppInvoiceRecord[]) => {
    const toSync = targetItems || items.filter((i) => !i.syncedToApp);
    if (toSync.length === 0) {
      setStatusBanner({
        type: "info",
        text: isEn
          ? "All WhatsApp invoices are already synchronized with the application."
          : "Toutes les factures WhatsApp sont déjà synchronisées avec l'application.",
      });
      return;
    }

    const integratedCount = onIntegrateItems ? onIntegrateItems(toSync) : toSync.length;
    const ids = toSync.map((i) => i.id);

    try {
      await fetch("/api/whatsapp/mark-synced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    } catch {}

    const now = new Date().toISOString();
    const updated = items.map((item) =>
      ids.includes(item.id) ? { ...item, syncedToApp: true, syncedAt: now } : item
    );
    saveLocalInbox(updated);

    setStatusBanner({
      type: "success",
      text: isEn
        ? `🔄 Synchronization complete: ${integratedCount} WhatsApp invoice(s) integrated into Accounting & Invoices!`
        : `🔄 Synchronisation réussie : ${integratedCount} facture(s) WhatsApp intégrée(s) dans la Comptabilité, les Factures Clients et la Maintenance !`,
    });
  };

  // Transférer / Synchroniser les fichiers vers Google Drive (via Service Account ou OAuth Google de l'utilisateur)
  const handleSyncWithGoogleDrive = async () => {
    const cleanFolderId = extractDriveFolderId(driveFolderInput);
    setIsSyncingDrive(true);
    setStatusBanner(null);

    const runBackendDriveSync = async (oauthToken = "") => {
      try {
        const res = await fetch("/api/whatsapp/sync-drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oauthAccessToken: oauthToken,
            driveFolderId: cleanFolderId,
          }),
        });
        const data = await res.json();
        if (data.items) saveLocalInbox(data.items);
        if (data.uploadedCount > 0) {
          setStatusBanner({
            type: "success",
            text: `📁 ${data.uploadedCount} facture(s) transférée(s) dans votre Google Drive par Date d'ajout et Type de facture !`,
          });
        } else if (data.errors && data.errors.length > 0) {
          setStatusBanner({
            type: "info",
            text: `Note Google Drive : ${data.errors[0]}`,
          });
        } else {
          setStatusBanner({
            type: "success",
            text: "📁 Tous les dossiers Google Drive (par Date d'ajout et Type de facture) sont à jour.",
          });
        }
      } catch (err: any) {
        setStatusBanner({
          type: "error",
          text: `Erreur transfert Google Drive : ${err.message}`,
        });
      } finally {
        setIsSyncingDrive(false);
      }
    };

    // Si Google OAuth est disponible dans le navigateur, demander un jeton Drive pour écrire dans le Drive personnel de l'utilisateur
    const win = window as any;
    const clientId = googleClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (win.google?.accounts?.oauth2 && clientId) {
      try {
        const tokenClient = win.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: "https://www.googleapis.com/auth/drive",
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              await runBackendDriveSync(tokenResponse.access_token);
            } else {
              await runBackendDriveSync("");
            }
          },
          error_callback: async () => {
            await runBackendDriveSync("");
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch {
        // Fallback Service Account
      }
    }

    await runBackendDriveSync("");
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = extractDriveFolderId(driveFolderInput);
    const nextConfig = {
      ...config,
      driveRootFolderId: cleanId,
    };
    setConfig(nextConfig);
    setDriveFolderInput(cleanId);
    try {
      localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(nextConfig));
      await fetch("/api/whatsapp/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      setStatusBanner({
        type: "success",
        text: "✅ Configuration du Bot WhatsApp et du dossier Google Drive enregistrée avec succès.",
      });
    } catch {
      setStatusBanner({
        type: "success",
        text: "✅ Configuration sauvegardée localement.",
      });
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await fetch(`/api/whatsapp/inbox/${id}`, { method: "DELETE" });
    } catch {}
    saveLocalInbox(items.filter((i) => i.id !== id));
  };

  const handleUpdateItemField = async (
    id: string,
    patch: Partial<WhatsAppInvoiceRecord>
  ) => {
    try {
      const res = await fetch(`/api/whatsapp/inbox/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.item) {
          saveLocalInbox(items.map((it) => (it.id === id ? data.item : it)));
          return;
        }
      }
    } catch {}
    saveLocalInbox(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const webhookUrl = `${window.location.origin}/api/whatsapp/webhook`;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-white max-w-7xl mx-auto">
      {/* EN-TÊTE PRINCIPAL & FLUX D'AUTOMATISATION */}
      <div className="rounded-2xl bg-gradient-to-br from-[#111827] via-[#0f172a] to-[#0a0a0a] border border-emerald-500/20 p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase tracking-wider">
              <Smartphone className="size-3.5" />
              {isEn
                ? "WhatsApp Bot • Google Drive Auto-Filing • App Sync"
                : "Bot WhatsApp • Classement Google Drive • Synchronisation SDV"}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5">
              {isEn
                ? "WhatsApp Invoice Bot & Google Drive Auto-Filing"
                : "Bot WhatsApp Factures & Classement Automatique Google Drive"}
            </h2>
            <p className="text-xs sm:text-sm text-white/60 max-w-3xl">
              {isEn
                ? "Every image or invoice sent on WhatsApp is analyzed by AI, automatically filed into your Google Drive folder by Date Added (YYYY-MM-DD) and Invoice Type, and integrated into your application via synchronization."
                : "Toute image ou facture déposée sur WhatsApp est analysée par l'IA, transférée automatiquement dans votre dossier Google Drive par Date d'ajout (AAAA-MM-JJ) puis par Type de facture, et intégrée à votre application via la synchronisation."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {qrStatus.state === "connected" ? (
              <button
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                WhatsApp Connecté ({qrStatus.connectedUser?.phone || "Actif"})
              </button>
            ) : (
              <button
                onClick={() => handleStartQrConnection(false)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                <Smartphone className="size-4" />
                {isEn ? "Scan WhatsApp QR Code" : "Scanner QR Code WhatsApp"}
              </button>
            )}

            <button
              onClick={handleSyncWithGoogleDrive}
              disabled={isSyncingDrive}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              <FolderOpen className={`size-4 ${isSyncingDrive ? "animate-pulse" : ""}`} />
              {isSyncingDrive
                ? "Transfert Drive..."
                : isEn
                ? "Transfer to Google Drive"
                : "Transférer vers Google Drive"}
            </button>

            <button
              onClick={() => handleSyncToApplication()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
              {isEn
                ? `Sync to App (${stats.pendingAppSync})`
                : `Synchroniser dans l'App (${stats.pendingAppSync})`}
            </button>
          </div>
        </div>

        {/* Cartes KPI du Bot */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {isEn ? "Received via WhatsApp" : "Factures / Images Reçues"}
            </div>
            <div className="text-xl font-black text-white mt-1">{stats.totalDocs}</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">
              {uniqueDates.length} {isEn ? "date folders" : "dossier(s) de date"}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {isEn ? "Total Detected Amount" : "Montant Total Détecté"}
            </div>
            <div className="text-xl font-black text-amber-400 mt-1">
              {stats.totalAmount.toLocaleString("fr-FR")} CFA
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {isEn ? "AI OCR Verified" : "Extrait automatiquement par IA"}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {isEn ? "Google Drive Filing" : "Classement Google Drive"}
            </div>
            <div className="text-xl font-black text-blue-400 mt-1">
              {stats.driveSynced} / {stats.totalDocs}
            </div>
            <div className="text-[11px] text-blue-300/70 mt-0.5">
              📁 Date d'ajout / 📁 Type de facture
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
              {isEn ? "App Integration" : "Intégrées à l'Application"}
            </div>
            <div className="text-xl font-black text-emerald-400 mt-1">
              {stats.appSynced} / {stats.totalDocs}
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              {stats.pendingAppSync === 0
                ? "✓ 100% Synchronisé"
                : `${stats.pendingAppSync} en attente de synchro`}
            </div>
          </div>
        </div>
      </div>

      {/* BANNIÈRE DE NOTIFICATION */}
      {statusBanner && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-bold ${
            statusBanner.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : statusBanner.type === "error"
              ? "bg-red-500/15 border-red-500/30 text-red-300"
              : "bg-blue-500/15 border-blue-500/30 text-blue-300"
          }`}
        >
          <span>{statusBanner.text}</span>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-white/50 hover:text-white cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* BARRE D'ONGLETS DU MODULE */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab("drive_tree")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "drive_tree"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <FolderOpen className="size-4" />
            {isEn
              ? `1. Drive Folders by Date & Type (${items.length})`
              : `1. Dossiers Drive par Date & Type (${items.length})`}
          </button>

          <button
            onClick={() => setSubTab("whatsapp_sim")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "whatsapp_sim"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <MessageSquare className="size-4" />
            {isEn
              ? "2. Send / Deposit via WhatsApp Bot"
              : "2. Déposer / Tester via Bot WhatsApp"}
          </button>

          <button
            onClick={() => setSubTab("config")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              subTab === "config"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings className="size-4" />
            {isEn
              ? "3. Link WhatsApp & Google Drive Folder"
              : "3. Lier WhatsApp & Dossier Google Drive"}
          </button>
        </div>

        {config.driveRootFolderId && (
          <a
            href={`https://drive.google.com/drive/folders/${config.driveRootFolderId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300"
          >
            <ExternalLink className="size-3.5" />
            Ouvrir mon dossier Google Drive racine
          </a>
        )}
      </div>

      {/* =====================================================================
          ONGLET 1 : ARBORESCENCE GOOGLE DRIVE PAR DATE D'AJOUT & TYPE DE FACTURE
         ===================================================================== */}
      {subTab === "drive_tree" && (
        <div className="space-y-4">
          {/* Barre de filtres Date d'ajout / Type de facture */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.03] border border-white/10 rounded-xl p-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-emerald-400" />
                <span className="text-xs font-bold text-white/60">Date d'ajout :</span>
                <select
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none"
                >
                  <option value="ALL">Toutes les dates ({uniqueDates.length})</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      📁 {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Tag className="size-4 text-amber-400" />
                <span className="text-xs font-bold text-white/60">Type de facture :</span>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="bg-black/60 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none"
                >
                  <option value="ALL">Tous les types de factures</option>
                  {INVOICE_TYPE_OPTIONS.map((tOpt) => (
                    <option key={tOpt.code} value={tOpt.code}>
                      📁 {tOpt.label} ({tOpt.driveFolderName})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => setSubTab("whatsapp_sim")}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold cursor-pointer"
            >
              <UploadCloud className="size-3.5" />+ Déposer une facture / image WhatsApp
            </button>
          </div>

          {sortedDates.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center space-y-4">
              <div className="mx-auto size-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <FolderOpen className="size-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-white">
                  Aucune facture WhatsApp dans ce dossier pour le moment
                </h3>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  Envoyez une image ou un PDF via le Bot WhatsApp (ou utilisez l'onglet « 2. Déposer / Tester via Bot WhatsApp ») pour créer automatiquement les sous-dossiers par Date d'ajout et Type de facture.
                </p>
              </div>
              <button
                onClick={() => setSubTab("whatsapp_sim")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                <MessageSquare className="size-4" />
                Envoyer une première facture via WhatsApp
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((dateKey) => {
                const typesMap = groupedByDateAndType[dateKey];
                const typeKeys = Object.keys(typesMap);
                const dateItems = Object.values(typesMap).flat();
                const dateTotalCfa = dateItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
                const isDateExpanded = expandedDates[dateKey] !== false; // ouvert par défaut

                return (
                  <div
                    key={dateKey}
                    className="rounded-2xl border border-white/10 bg-[#11141c] overflow-hidden shadow-lg"
                  >
                    {/* Bandeau Dossier Niveau 1 : DATE D'AJOUT */}
                    <div
                      onClick={() =>
                        setExpandedDates((prev) => ({
                          ...prev,
                          [dateKey]: !isDateExpanded,
                        }))
                      }
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white/[0.04] hover:bg-white/[0.06] border-b border-white/10 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {isDateExpanded ? (
                          <ChevronDown className="size-4 text-white/50" />
                        ) : (
                          <ChevronRight className="size-4 text-white/50" />
                        )}
                        <FolderOpen className="size-5 text-amber-400" />
                        <div>
                          <span className="text-sm font-black text-white">
                            📁 Date d'ajout : {dateKey}
                          </span>
                          <span className="ml-3 text-xs text-white/50">
                            ({dateItems.length} pièce(s) • {typeKeys.length} sous-dossier(s) de type)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-xs font-black text-amber-400">
                          Total du jour : {dateTotalCfa.toLocaleString("fr-FR")} CFA
                        </span>
                        {dateItems[0]?.driveDateFolderLink && (
                          <a
                            href={dateItems[0].driveDateFolderLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:underline"
                          >
                            <ExternalLink className="size-3" /> Dossier Drive du {dateKey}
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Sous-dossiers Niveau 2 : TYPE DE FACTURE */}
                    {isDateExpanded && (
                      <div className="p-4 space-y-4">
                        {typeKeys.map((typeCode) => {
                          const list = typesMap[typeCode];
                          const typeOption =
                            INVOICE_TYPE_OPTIONS.find((o) => o.code === typeCode) ||
                            INVOICE_TYPE_OPTIONS[5];
                          const subTotal = list.reduce((s, i) => s + (Number(i.amount) || 0), 0);

                          return (
                            <div
                              key={typeCode}
                              className="rounded-xl border border-white/10 bg-black/40 overflow-hidden"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-white/[0.02] border-b border-white/10">
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-black uppercase ${typeOption.color}`}
                                  >
                                    📁 {typeOption.driveFolderName}
                                  </span>
                                  <span className="text-xs font-bold text-white/80">
                                    {typeOption.label}
                                  </span>
                                  <span className="text-xs text-white/40">
                                    ({list.length} document{list.length > 1 ? "s" : ""})
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <span className="text-xs font-bold text-white/70">
                                    Sous-total :{" "}
                                    <strong className="text-white">
                                      {subTotal.toLocaleString("fr-FR")} CFA
                                    </strong>
                                  </span>
                                  {list[0]?.driveTypeFolderLink && (
                                    <a
                                      href={list[0].driveTypeFolderLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:underline"
                                    >
                                      <ExternalLink className="size-3" /> Ouvrir sous-dossier Drive
                                    </a>
                                  )}
                                </div>
                              </div>

                              {/* Liste des factures du sous-dossier */}
                              <div className="divide-y divide-white/5">
                                {list.map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                                  >
                                    <div className="flex items-start gap-3.5 min-w-0">
                                      {/* Miniature cliquable */}
                                      <button
                                        onClick={() => setPreviewItem(doc)}
                                        className="size-14 rounded-lg bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden flex items-center justify-center hover:border-emerald-400 transition-colors cursor-pointer group relative"
                                        title="Aperçu de la facture"
                                      >
                                        {doc.localPreviewUrl &&
                                        !doc.mimeType?.includes("pdf") ? (
                                          <img
                                            src={doc.localPreviewUrl}
                                            alt={doc.fileName}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <FileText className="size-6 text-white/40 group-hover:text-emerald-400" />
                                        )}
                                      </button>

                                      <div className="space-y-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="text-xs font-black text-white truncate">
                                            {doc.description || doc.fileName}
                                          </span>
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-white/70 font-bold">
                                            {doc.truck}
                                          </span>
                                          {doc.invoiceType === "CARBURANT" && (
                                            <span
                                              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                                doc.corridor === "ABIDJAN"
                                                  ? "bg-orange-500/20 text-orange-300"
                                                  : "bg-teal-500/20 text-teal-300"
                                              }`}
                                            >
                                              Corridor {doc.corridor === "ABIDJAN" ? "Abidjan" : "San Pedro"}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/50">
                                          <span>
                                            📅 Facture :{" "}
                                            <strong className="text-white/80">
                                              {doc.invoiceDate}
                                            </strong>
                                          </span>
                                          <span>
                                            🏢 {doc.vendorOrClient || "Fournisseur SDV"}
                                          </span>
                                          <span>
                                            📱 Reçu de : {doc.senderName} ({doc.senderPhone})
                                          </span>
                                          <span className="text-blue-300/80 font-mono text-[10px]">
                                            📁 {doc.drivePath}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Contrôles rapides & Statuts */}
                                    <div className="flex flex-wrap items-center gap-2.5 flex-shrink-0">
                                      {/* Sélecteur rapide pour reclasser le type de facture si besoin */}
                                      <select
                                        value={doc.invoiceType}
                                        onChange={(e) =>
                                          handleUpdateItemField(doc.id, {
                                            invoiceType: e.target.value as any,
                                          })
                                        }
                                        className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-[11px] font-bold text-white/80 outline-none"
                                        title="Modifier le type de facture"
                                      >
                                        {INVOICE_TYPE_OPTIONS.map((o) => (
                                          <option key={o.code} value={o.code}>
                                            {o.label}
                                          </option>
                                        ))}
                                      </select>

                                      <div className="text-right min-w-[110px]">
                                        <div className="text-sm font-black text-amber-400">
                                          {(Number(doc.amount) || 0).toLocaleString("fr-FR")} CFA
                                        </div>
                                        <div className="text-[10px] text-white/40">
                                          {doc.accountingCategory}
                                        </div>
                                      </div>

                                      {doc.driveLink ? (
                                        <a
                                          href={doc.driveLink}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-bold hover:bg-blue-500/25"
                                        >
                                          <ExternalLink className="size-3" /> Drive
                                        </a>
                                      ) : (
                                        <span
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 text-white/40 border border-white/10 text-[10px] font-bold"
                                          title={
                                            doc.driveStatusReason ||
                                            "Cliquez sur Transférer vers Google Drive"
                                          }
                                        >
                                          Archive Locale
                                        </span>
                                      )}

                                      {doc.syncedToApp ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                                          <CheckCircle2 className="size-3.5" /> Intégré
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleSyncToApplication([doc])}
                                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                                        >
                                          <RefreshCw className="size-3" /> Intégrer
                                        </button>
                                      )}

                                      <button
                                        onClick={() => setPreviewItem(doc)}
                                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                                        title="Voir l'image / facture"
                                      >
                                        <Eye className="size-3.5" />
                                      </button>

                                      <button
                                        onClick={() => handleDeleteItem(doc.id)}
                                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="size-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          ONGLET 2 : DÉPÔT & SIMULATEUR DE BOT WHATSAPP
         ===================================================================== */}
      {subTab === "whatsapp_sim" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulaire d'envoi WhatsApp (Gauche : 7 colonnes) */}
          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#11141c] p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Déposer des Images & Factures via le Bot WhatsApp
                  </h3>
                  <p className="text-xs text-white/50">
                    Accepte tous types d'images (JPG, PNG, WEBP) et factures PDF. L'IA détecte automatiquement le type et classe dans Google Drive par Date d'ajout et Type de facture.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendWhatsAppFiles} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                    Expéditeur WhatsApp (Chauffeur / Agent)
                  </label>
                  <select
                    value={simSenderName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSimSenderName(val);
                      if (val.includes("Amara")) setSimSenderPhone("+225 07 08 76 76 76");
                      if (val.includes("Brahima")) setSimSenderPhone("+225 07 08 45 45 45");
                      if (val.includes("Soro")) setSimSenderPhone("+225 07 08 52 52 52");
                      if (val.includes("Direction")) setSimSenderPhone("+225 07 00 00 00 01");
                    }}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs font-bold text-white outline-none"
                  >
                    <option value="Amara (Chauffeur Truck 76)">
                      Amara (Chauffeur Truck 76)
                    </option>
                    <option value="Brahima (Chauffeur Truck 45)">
                      Brahima (Chauffeur Truck 45)
                    </option>
                    <option value="Soro (Chauffeur Truck 52)">
                      Soro (Chauffeur Truck 52)
                    </option>
                    <option value="Direction / Comptabilité SDV">
                      Direction / Comptabilité SDV
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                    Date d'ajout (Dossier Google Drive Niveau 1)
                  </label>
                  <input
                    type="date"
                    value={simAddedDate}
                    onChange={(e) => setSimAddedDate(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs font-bold text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                    Type de facture (Sous-dossier Drive Niveau 2)
                  </label>
                  <select
                    value={simTypeOverride}
                    onChange={(e) => setSimTypeOverride(e.target.value)}
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs font-bold text-white outline-none"
                  >
                    <option value="">✨ Détection Automatique par IA (Recommandé)</option>
                    {INVOICE_TYPE_OPTIONS.map((o) => (
                      <option key={o.code} value={o.code}>
                        📁 {o.label} ({o.driveFolderName})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                    Message / Légende WhatsApp accompagnant la photo
                  </label>
                  <input
                    type="text"
                    value={simCaption}
                    onChange={(e) => setSimCaption(e.target.value)}
                    placeholder="Ex: Reçu gasoil Shell San Pedro 145000 CFA Amara"
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Zone de Dépôt Multi-Fichiers (Toutes images & PDF) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                  Images & Factures à transférer (JPG, PNG, WEBP, PDF)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-400 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] rounded-2xl p-6 text-center cursor-pointer transition-all"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,application/pdf"
                    onChange={(e) => {
                      if (e.target.files) {
                        setSelectedFiles(Array.from(e.target.files));
                      }
                    }}
                    className="hidden"
                  />
                  <UploadCloud className="size-9 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-white">
                    Cliquez pour choisir ou glissez vos photos de reçus, bons de carburant et factures PDF
                  </p>
                  <p className="text-[11px] text-white/40 mt-1">
                    Classement automatique : 📁 Drive / {simAddedDate} /{" "}
                    {simTypeOverride
                      ? INVOICE_TYPE_OPTIONS.find((o) => o.code === simTypeOverride)
                          ?.driveFolderName
                      : "[Type détecté par l'IA]"}
                  </p>

                  {selectedFiles.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {selectedFiles.map((f, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold"
                        >
                          <FileText className="size-3.5" />
                          {f.name} ({Math.round(f.size / 1024)} Ko)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Analyse IA & Transfert dans Google Drive ({simAddedDate})...
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Envoyer au Bot WhatsApp, Classer sur Drive & Synchroniser
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Aperçu du Fil WhatsApp en direct (Droite : 5 colonnes) */}
          <div className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#0b141a] flex flex-col overflow-hidden h-[500px]">
            <div className="px-4 py-3 bg-[#202c33] border-b border-white/10 flex items-center gap-3">
              <div className="size-9 rounded-full bg-emerald-500 flex items-center justify-center text-black font-black text-xs">
                SDV
              </div>
              <div>
                <div className="text-xs font-black text-white">
                  Bot WhatsApp SDV Logistique
                </div>
                <div className="text-[10px] text-emerald-400">
                  ● Connecté • Classement Drive & Synchro App actifs
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
              <div className="bg-[#202c33] text-white/90 p-3 rounded-xl rounded-tl-none max-w-[90%] space-y-1">
                <div className="font-bold text-emerald-400 text-[11px]">Bot SDV</div>
                <p>
                  Bonjour 👋 Envoyez-moi toute photo de reçu (Carburant, Maintenance, Péage) ou facture PDF. Je la classe automatiquement dans Google Drive sous :
                </p>
                <p className="font-mono text-[10px] text-amber-300 bg-black/30 p-1.5 rounded">
                  📁 Drive / [Date d'ajout] / [Type de facture]
                </p>
              </div>

              {items.slice(0, 6).map((item) => (
                <React.Fragment key={item.id}>
                  <div className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tr-none ml-auto max-w-[88%] space-y-1">
                    <div className="text-[10px] text-emerald-200 font-bold">
                      {item.senderName} • {item.addedDate}
                    </div>
                    <div className="font-semibold">📎 {item.fileName}</div>
                    {item.caption && <div className="text-white/80 italic">« {item.caption} »</div>}
                  </div>

                  <div className="bg-[#202c33] text-white/90 p-3 rounded-xl rounded-tl-none max-w-[90%] space-y-1 border-l-2 border-emerald-400">
                    <div className="font-bold text-emerald-400 text-[11px]">
                      ✅ Bot SDV — Classé & Prêt pour Synchro
                    </div>
                    <div>
                      • <strong>Type :</strong> {item.invoiceTypeLabel}
                    </div>
                    <div>
                      • <strong>Montant :</strong>{" "}
                      {(Number(item.amount) || 0).toLocaleString("fr-FR")} CFA ({item.truck})
                    </div>
                    <div className="font-mono text-[10px] text-blue-300">
                      📁 {item.drivePath}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ONGLET 3 : CONFIGURATION DU BOT WHATSAPP & DOSSIER GOOGLE DRIVE
         ===================================================================== */}
      {subTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleSaveConfig}
            className="rounded-2xl border border-white/10 bg-[#11141c] p-6 space-y-4"
          >
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FolderPlus className="size-5 text-blue-400" />
              1. Configuration du Dossier Google Drive Cible
            </h3>
            <p className="text-xs text-white/60">
              Collez l'URL ou l'ID de votre dossier Google Drive principal. Le bot y créera automatiquement un dossier par <strong>Date d'ajout (AAAA-MM-JJ)</strong> contenant les sous-dossiers par <strong>Type de facture</strong>.
            </p>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
                Lien ou ID du Dossier Google Drive Racine
              </label>
              <input
                type="text"
                value={driveFolderInput}
                onChange={(e) => setDriveFolderInput(e.target.value)}
                placeholder="Ex: https://drive.google.com/drive/folders/1AbCDefGHiJKlmNoPqRsTuVwXyZ"
                className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <div>
                <div className="text-xs font-bold text-white">
                  Intégration automatique à la réception
                </div>
                <div className="text-[11px] text-white/50">
                  Intègre automatiquement chaque facture reçue dans la Comptabilité et les Factures Clients lors de la synchronisation
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(config.autoSyncToApp)}
                onChange={(e) =>
                  setConfig({ ...config, autoSyncToApp: e.target.checked })
                }
                className="size-4 accent-emerald-500"
              />
            </div>

            <hr className="border-white/10" />

            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Smartphone className="size-5 text-emerald-400" />
              2. Liaison API WhatsApp Business (Meta Cloud API)
            </h3>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                Webhook Callback URL (à copier dans Meta Developers / Twilio)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="flex-1 rounded-xl bg-black/60 border border-white/15 px-3 py-2 text-xs font-mono text-emerald-300 outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    setCopiedWebhook(true);
                    setTimeout(() => setCopiedWebhook(false), 2000);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedWebhook ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                  {copiedWebhook ? "Copié" : "Copier"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                  Verify Token Webhook
                </label>
                <input
                  type="text"
                  value={config.verifyToken || ""}
                  onChange={(e) => setConfig({ ...config, verifyToken: e.target.value })}
                  className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                  WhatsApp Phone Number ID
                </label>
                <input
                  type="text"
                  value={config.whatsappPhoneNumberId || ""}
                  onChange={(e) =>
                    setConfig({ ...config, whatsappPhoneNumberId: e.target.value })
                  }
                  placeholder="Ex: 10592837465..."
                  className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1">
                Meta WhatsApp Permanent Access Token
              </label>
              <input
                type="password"
                value={config.whatsappAccessToken || ""}
                onChange={(e) =>
                  setConfig({ ...config, whatsappAccessToken: e.target.value })
                }
                placeholder="EAAG..."
                className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
            >
              Enregistrer la Configuration WhatsApp & Google Drive
            </button>
          </form>

          {/* Guide de structure des dossiers & fonctionnement */}
          <div className="rounded-2xl border border-white/10 bg-[#11141c] p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-400" />
              Arborescence Automatique dans votre Google Drive
            </h3>
            <p className="text-xs text-white/60">
              Chaque fichier envoyé au bot WhatsApp est automatiquement renommé et classé dans votre Google Drive selon la structure suivante :
            </p>

            <div className="rounded-xl bg-black/60 border border-white/10 p-4 font-mono text-xs space-y-1.5 text-white/80">
              <div className="text-blue-400 font-bold">
                📁 {config.driveRootFolderName || "SDV_Factures_WhatsApp"} (Dossier Racine)
              </div>
              <div className="pl-4 text-amber-400 font-bold">
                └── 📁 2026-10-30 (Date d'ajout)
              </div>
              <div className="pl-10 text-cyan-300">
                ├── 📁 01_Carburant_Gasoil
              </div>
              <div className="pl-10 text-amber-300">
                ├── 📁 02_Maintenance_Pieces
              </div>
              <div className="pl-10 text-purple-300">
                ├── 📁 03_Peages_Frais_Route
              </div>
              <div className="pl-10 text-emerald-300">
                ├── 📁 04_Factures_Clients_Tonnage
              </div>
              <div className="pl-10 text-blue-300">
                ├── 📁 05_Assurances_Documents
              </div>
              <div className="pl-10 text-slate-300">
                └── 📁 06_Autres_Factures
              </div>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2 text-xs">
              <div className="font-black text-emerald-300">
                Comment fonctionne la Synchronisation avec l'Application ?
              </div>
              <ul className="list-disc list-inside space-y-1 text-white/70">
                <li>
                  <strong>Carburant (Gasoil) :</strong> S'ajoute aux écritures comptables avec ventilation automatique <em>San Pedro / Abidjan</em> et lien direct vers le reçu sur Google Drive.
                </li>
                <li>
                  <strong>Maintenance & Pièces :</strong> S'ajoute au registre de Maintenance & Dépenses du camion concerné (Amara 76, Brahima 45, Soro 52) avec la facture Drive jointe.
                </li>
                <li>
                  <strong>Facture Client & Pesée :</strong> S'ajoute directement dans l'onglet <em>Factures Clients</em> de la Comptabilité avec le tonnage et le lien PDF/image Google Drive.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* MODAL D'APERÇU D'UNE FACTURE */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-[#11141c] border border-white/15 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div>
                <h4 className="text-sm font-black text-white">{previewItem.fileName}</h4>
                <p className="text-[11px] text-white/50">📁 {previewItem.drivePath}</p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 flex items-center justify-center bg-black/50 min-h-[320px]">
              {previewItem.localPreviewUrl ? (
                previewItem.mimeType?.includes("pdf") ? (
                  <iframe
                    src={previewItem.localPreviewUrl}
                    title={previewItem.fileName}
                    className="w-full h-[65vh] rounded-lg border border-white/10"
                  />
                ) : (
                  <img
                    src={previewItem.localPreviewUrl}
                    alt={previewItem.fileName}
                    className="max-h-[65vh] w-auto object-contain rounded-lg"
                  />
                )
              ) : (
                <div className="text-center text-white/40 text-xs">
                  Aperçu disponible dans Google Drive
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONNEXION WHATSAPP PAR QR CODE (MÉTHODE 1) */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-[#11141c] border border-emerald-500/30 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Relier votre WhatsApp par QR Code (Méthode 1)
                  </h3>
                  <p className="text-xs text-white/50">
                    Scan direct avec votre téléphone — 100% automatique
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {qrStatus.state === "connected" ? (
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-center space-y-4">
                <CheckCircle2 className="size-14 text-emerald-400 mx-auto" />
                <div className="space-y-1">
                  <div className="text-base font-black text-white">
                    ✅ Votre WhatsApp est connecté !
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    {qrStatus.connectedUser?.name} ({qrStatus.connectedUser?.phone})
                  </div>
                  <p className="text-xs text-white/60 pt-2">
                    Envoyez maintenant n'importe quelle photo de reçu ou facture PDF sur votre WhatsApp (par exemple à vous-même ou dans un groupe) : elle sera classée automatiquement dans Google Drive par <strong>Date d'ajout</strong> et <strong>Type de facture</strong> !
                  </p>
                </div>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={handleLogoutQrConnection}
                    className="px-4 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold cursor-pointer"
                  >
                    Déconnecter ce numéro
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-5 min-h-[280px]">
                  {qrStatus.qrDataUrl ? (
                    <img
                      src={qrStatus.qrDataUrl}
                      alt="WhatsApp QR Code"
                      className="size-64 object-contain"
                    />
                  ) : (
                    <div className="text-center space-y-3 text-slate-700">
                      <RefreshCw className="size-10 animate-spin mx-auto text-emerald-600" />
                      <div className="text-xs font-bold">
                        Génération du QR Code WhatsApp en cours...
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-2 text-xs text-white/80">
                  <div className="font-black text-emerald-400">
                    Comment scanner avec votre téléphone :
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-white/70">
                    <li>Ouvrez <strong>WhatsApp</strong> sur votre téléphone.</li>
                    <li>
                      Allez dans <strong>Réglages</strong> (sur iPhone) ou appuyez sur les{" "}
                      <strong>3 points ⋮</strong> en haut à droite (sur Android).
                    </li>
                    <li>
                      Appuyez sur <strong>Appareils connectés</strong> puis sur{" "}
                      <strong>Connecter un appareil</strong>.
                    </li>
                    <li>Pointez votre téléphone vers ce QR Code.</li>
                  </ol>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={() => handleStartQrConnection(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    <RefreshCw className="size-3.5" /> Régénérer un nouveau QR Code
                  </button>
                  <button
                    onClick={() => setShowQrModal(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

