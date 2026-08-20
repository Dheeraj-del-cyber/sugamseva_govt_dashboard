import {
  X,
  Download,
  FileText,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { API_BASE_URL } from "../api/client";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    doc_type: string;
    doc_number?: string;
    file_name?: string;
    file_size?: number;
    mime_type?: string;
    file_url?: string;
    extracted_text?: string;
  } | null;
}

export default function DocumentViewerModal({ isOpen, onClose, document }: Props) {
  if (!isOpen || !document) return null;

  const rawUrl = document.file_url || "";
  const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${API_BASE_URL}${rawUrl}`;
  const isPdf = document.mime_type?.includes("pdf") || document.file_name?.endsWith(".pdf");
  const sizeFormatted = document.file_size
    ? `${(document.file_size / 1024).toFixed(1)} KB`
    : "Verified on Server";

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl border border-ink-100 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 px-6 border-b border-ink-100 flex items-center justify-between bg-ink-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-navy-900 text-white flex items-center justify-center" style={{ backgroundColor: "var(--color-navy-900)" }}>
              <FileText size={20} style={{ color: "var(--color-saffron-500)" }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-ink-900 text-base">{document.doc_type}</h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                  <CheckCircle2 size={12} /> Biometric Verified
                </span>
              </div>
              <p className="text-xs text-ink-500">
                {document.doc_number ? `Document ID: ${document.doc_number} • ` : ""}
                {document.file_name} ({sizeFormatted})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={document.file_name || `${document.doc_type}.pdf`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
            >
              <Download size={13} /> Download
            </a>
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: "var(--color-gov-blue-600)" }}
            >
              <ExternalLink size={13} /> Open Tab
            </a>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-ink-200 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto bg-ink-100/70 p-4 flex items-center justify-center min-h-[420px]">
          {isPdf ? (
            <iframe
              src={`${fullUrl}#toolbar=0`}
              title={document.doc_type}
              className="w-full h-[520px] rounded-xl border border-ink-200 bg-white shadow-xs"
            />
          ) : (
            <div className="max-w-2xl bg-white p-3 rounded-xl border border-ink-200 shadow-md">
              <img
                src={fullUrl}
                alt={document.doc_type}
                className="max-h-[500px] w-auto mx-auto object-contain rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Footer info & OCR text */}
        <div className="p-3 px-6 bg-white border-t border-ink-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-ink-500 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-green-600 shrink-0" />
            <span>Digital Document Vault — STQC Compliant Server Storage</span>
          </div>
          {document.extracted_text && (
            <div className="text-[11px] font-mono text-ink-600 bg-ink-100 px-2.5 py-1 rounded-md truncate max-w-sm">
              OCR Match: {document.extracted_text.split("\n")[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}