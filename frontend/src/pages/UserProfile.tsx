import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Fingerprint,
  Lock,
  CheckCircle2,
  Phone,
  MapPin,
  Cake,
  FileText,
  Eye,
  Download,
  UploadCloud,
  ShieldCheck,
  Award,
  Search,
  Trash2,
  X,
  AlertTriangle,
  Plus,
  Landmark,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatusPill, SecondaryButton, PrimaryButton, TextField } from "../components/UI";
import SearchableSelect from "../components/SearchableSelect";
import BiometricVerifyModal from "../components/BiometricVerifyModal";
import DocumentViewerModal from "../components/DocumentViewerModal";
import { api, API_BASE_URL } from "../api/client";
import { PROBLEM_CATEGORIES, OTHER_PROBLEM_CATEGORY } from "../lib/problemCategories";

interface DocumentOut {
  id: string;
  doc_type: string;
  doc_number?: string;
  verified: boolean;
  source: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  file_url?: string;
  extracted_text?: string;
  created_at?: string;
  verified_at?: string;
}

interface FingerprintOut {
  id: string;
  finger_index: number;
  finger_name: string;
  hand: string;
  quality_score: number;
  sensor_type: string;
  captured_at: string;
}

interface CitizenProblemItem {
  vote_id: string;
  problem_id: string;
  title: string;
  description?: string;
  category?: string;
  total_votes: number;
  solved_votes: number;
  is_solved: boolean;
  solved: boolean;
  reported_at: string;
}

interface CitizenNearSchemeItem {
  id: string;
  code?: string;
  name: string;
  category?: string;
  ministry?: string;
  summary?: string;
  benefit_amount?: string;
  is_open: boolean;
  status: "open" | "closed" | "upcoming";
  status_label: string;
  application_end_date?: string;
  apply_url?: string;
  matched_documents: string[];
  missing_documents: string[];
  match_count: number;
  total_docs_count: number;
  match_percentage: number;
  is_eligible: boolean;
  user_usage_status: string;
}

interface Profile {
  id: string;
  full_name: string;
  dob: string;
  phone_number: string;
  guardian_phone_1?: string;
  guardian_phone_2?: string;
  address?: string;
  photo_url?: string;
  documents: DocumentOut[];
  fingerprints: FingerprintOut[];
  total_problems: number;
  problems_solved: number;
  problems_pending: number;
  near_schemes_count?: number;
  eligible_schemes_count?: number;
}

export default function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [citizenProblems, setCitizenProblems] = useState<CitizenProblemItem[]>([]);
  const [nearSchemes, setNearSchemes] = useState<CitizenNearSchemeItem[]>([]);
  const [loadingNearSchemes, setLoadingNearSchemes] = useState(false);
  const [schemeFilter, setSchemeFilter] = useState<"all" | "eligible" | "missing">("all");
  const [schemeSearch, setSchemeSearch] = useState("");

  const [unlocked, setUnlocked] = useState(false);
  const [matchedFingerName, setMatchedFingerName] = useState<string | null>(null);
  const [revealedDocs, setRevealedDocs] = useState<Record<string, DocumentOut>>({});
  const [unlocking, setUnlocking] = useState(false);

  // Modals
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<DocumentOut | null>(null);

  // Delete Citizen
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Additional Document Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docCatalog, setDocCatalog] = useState<{ name: string; category: string }[]>([]);
  const [uploadDocType, setUploadDocType] = useState("Aadhaar Card");
  const [docTypeSearch, setDocTypeSearch] = useState("Aadhaar Card");
  const [showDocTypeOptions, setShowDocTypeOptions] = useState(false);
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Add Problem Modal
  const [showAddProblemModal, setShowAddProblemModal] = useState(false);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [problemCategory, setProblemCategory] = useState(OTHER_PROBLEM_CATEGORY);
  const [savingProblem, setSavingProblem] = useState(false);
  const [problemError, setProblemError] = useState("");

  useEffect(() => {
    api
      .get("/documents/types")
      .then(({ data }) => setDocCatalog(data))
      .catch(() => setDocCatalog([]));
  }, []);

  const uploadedTypeNames = new Set(profile?.documents.map((d) => d.doc_type) || []);
  const docTypeOptions = docCatalog.filter(
    (d) =>
      !uploadedTypeNames.has(d.name) &&
      (docTypeSearch.trim() === "" || d.name.toLowerCase().includes(docTypeSearch.trim().toLowerCase()))
  );

  const loadProfile = () => {
    if (userId) {
      api.get(`/users/${userId}`).then(({ data }) => setProfile(data));
    }
  };

  const loadCitizenProblems = () => {
    if (userId) {
      api.get(`/users/${userId}/problems`).then(({ data }) => setCitizenProblems(data));
    }
  };

  const loadNearSchemes = () => {
    if (userId) {
      setLoadingNearSchemes(true);
      api
        .get(`/users/${userId}/near-schemes`)
        .then(({ data }) => {
          setNearSchemes(data);
          setLoadingNearSchemes(false);
        })
        .catch(() => setLoadingNearSchemes(false));
    }
  };

  useEffect(() => {
    loadProfile();
    loadCitizenProblems();
    loadNearSchemes();
  }, [userId]);

  const handleDeleteCitizen = async () => {
    if (!userId || !profile) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete(`/users/${userId}`);
      navigate("/users");
    } catch (err: any) {
      setDeleteError(err?.response?.data?.detail || "Failed to delete citizen");
    } finally {
      setDeleting(false);
    }
  };

  const handleBiometricSuccess = async (token: string, matchedFinger: string) => {
    if (!userId || !profile) return;
    setUnlocking(true);
    try {
      const results = await Promise.all(
        profile.documents.map((d) =>
          api
            .post(`/users/${userId}/documents/${d.id}/reveal`, {
              fingerprint_verification_token: token,
            })
            .then(({ data }) => ({
              id: d.id,
              doc: {
                ...d,
                file_url: data.file_url,
                file_name: data.file_name,
                file_size: data.file_size,
                mime_type: data.mime_type,
                extracted_text: data.extracted_text,
              },
            }))
            .catch(() => null)
        )
      );
      const map: Record<string, DocumentOut> = {};
      results.forEach((r) => {
        if (r) map[r.id] = r.doc;
      });
      setRevealedDocs(map);
      setUnlocked(true);
      setMatchedFingerName(matchedFinger);
    } finally {
      setUnlocking(false);
    }
  };

  const handleOpenUploadForMissingDoc = (docTypeName: string) => {
    setUploadDocType(docTypeName);
    setDocTypeSearch(docTypeName);
    setUploadDocNumber("");
    setUploadFile(null);
    setUploadError("");
    setShowUploadModal(true);
  };

  const handleUploadAdditionalDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !userId) {
      setUploadError("Please choose a file to upload");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("doc_type", uploadDocType);
      if (uploadDocNumber) formData.append("doc_number", uploadDocNumber);
      formData.append("source", "upload");

      await api.post(`/users/${userId}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setShowUploadModal(false);
      setUploadFile(null);
      setUploadDocNumber("");
      setDocTypeSearch("Aadhaar Card");
      setUploadDocType("Aadhaar Card");
      loadProfile();
      loadNearSchemes();
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const openAddProblemModal = () => {
    setProblemTitle("");
    setProblemDescription("");
    setProblemCategory(OTHER_PROBLEM_CATEGORY);
    setProblemError("");
    setShowAddProblemModal(true);
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSavingProblem(true);
    setProblemError("");
    try {
      await api.post(`/users/${userId}/problems`, {
        title: problemTitle,
        description: problemDescription || undefined,
        category: problemCategory || OTHER_PROBLEM_CATEGORY,
      });
      setShowAddProblemModal(false);
      loadCitizenProblems();
      loadProfile();
      loadNearSchemes();
    } catch (err: any) {
      setProblemError(err?.response?.data?.detail || "Failed to add problem");
    } finally {
      setSavingProblem(false);
    }
  };

  if (!profile) {
    return (
      <Layout title="Citizen Profile" backTo={{ to: "/users", label: "Back to Users" }}>
        <p className="text-center text-ink-500 py-12">Loading citizen profile...</p>
      </Layout>
    );
  }

  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const eligibleSchemesCount = nearSchemes.filter((s) => s.is_eligible).length;
  const missingSchemesCount = nearSchemes.filter((s) => s.missing_documents.length > 0).length;

  const filteredSchemes = nearSchemes.filter((s) => {
    if (schemeFilter === "eligible" && !s.is_eligible) return false;
    if (schemeFilter === "missing" && s.missing_documents.length === 0) return false;
    if (schemeSearch.trim()) {
      const q = schemeSearch.toLowerCase().trim();
      const matchName = s.name.toLowerCase().includes(q);
      const matchCode = (s.code || "").toLowerCase().includes(q);
      const matchCat = (s.category || "").toLowerCase().includes(q);
      const matchMinistry = (s.ministry || "").toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchCat && !matchMinistry) return false;
    }
    return true;
  });

  return (
    <Layout title="Citizen Profile" backTo={{ to: "/users", label: "Back to Users" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className="p-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center text-2xl font-display font-bold text-white shrink-0 shadow-md"
              style={{ backgroundColor: "var(--color-navy-900)" }}
            >
              {initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="font-display text-2xl font-bold text-ink-900">{profile.full_name}</h2>
                <StatusPill status="verified" />
              </div>
              <p className="text-sm text-ink-500 mt-1">
                Citizen Phone: <span className="font-semibold text-ink-800">{profile.phone_number}</span>
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gov-blue-100 text-gov-blue-700 flex items-center gap-1">
                  <Fingerprint size={12} /> Dual-Finger Biometric Enrolled
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                  <FileText size={12} /> {profile.documents.filter((d) => d.verified).length} Verified Documents
                </span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                  <Landmark size={12} /> {nearSchemes.length} Near Schemes ({eligibleSchemesCount} Eligible)
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => setShowUploadModal(true)}>
              <UploadCloud size={14} /> Upload Document
            </SecondaryButton>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteError("");
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Delete Citizen
            </button>
          </div>
        </Card>

        {/* Section: Personal Demographics & Problem Stats */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: "var(--color-gov-blue-600)" }} /> Personal Details
            </h3>
            <dl className="space-y-3 text-sm">
              <Row icon={<Cake size={14} />} label="Date of Birth" value={profile.dob} />
              <Row icon={<Phone size={14} />} label="Primary Phone" value={profile.phone_number} />
              <Row icon={<Phone size={14} />} label="Guardian Contact 1" value={profile.guardian_phone_1 || "Not specified"} />
              <Row icon={<Phone size={14} />} label="Guardian Contact 2" value={profile.guardian_phone_2 || "Not specified"} />
              <Row icon={<MapPin size={14} />} label="Registered Address" value={profile.address || "India"} />
            </dl>
          </Card>

          <Card className="p-5">
            <h3 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
              <Award size={18} style={{ color: "var(--color-saffron-500)" }} /> Civic Problems &amp; Voting
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="rounded-xl p-3 bg-gov-blue-50 border border-gov-blue-100">
                <p className="text-2xl font-display font-extrabold" style={{ color: "var(--color-gov-blue-600)" }}>
                  {profile.total_problems}
                </p>
                <p className="text-[11px] text-ink-600 font-medium mt-1">Total Reported</p>
              </div>
              <div className="rounded-xl p-3 bg-green-50 border border-green-100">
                <p className="text-2xl font-display font-extrabold" style={{ color: "var(--color-green-600)" }}>
                  {profile.problems_solved}
                </p>
                <p className="text-[11px] text-green-700 font-medium mt-1">Solved</p>
              </div>
              <div className="rounded-xl p-3 bg-amber-50 border border-amber-100">
                <p className="text-2xl font-display font-extrabold" style={{ color: "var(--color-amber-600)" }}>
                  {profile.problems_pending}
                </p>
                <p className="text-[11px] text-amber-700 font-medium mt-1">In Progress</p>
              </div>
            </div>
            <p className="text-xs text-ink-500">
              Citizens can vote on local civic infrastructure problems and require biometric fingerprint
              authentication to confirm final grievance resolution.
            </p>
          </Card>
        </div>

        {/* Section: Verified Documents Vault */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-ink-900 flex items-center gap-2">
                <FileText size={18} style={{ color: "var(--color-gov-blue-600)" }} /> Scanned Government Documents Vault
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Physical files stored securely. Biometric verification unlocks real PDF &amp; image view.
              </p>
            </div>
            {unlocked && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800 flex items-center gap-1">
                <CheckCircle2 size={13} /> Unlocked via {matchedFingerName || "Fingerprint"}
              </span>
            )}
          </div>

          {/* Documents Grid */}
          <div className="grid sm:grid-cols-2 gap-3.5 mb-5">
            {profile.documents.map((d) => (
              <div
                key={d.id}
                className="p-4 rounded-xl border border-ink-200 bg-white hover:border-ink-300 transition-all flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-gov-blue-100 text-gov-blue-700 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900">{d.doc_type}</p>
                      <p className="text-[11px] text-ink-500">
                        {d.doc_number ? `ID: ${d.doc_number}` : "Verified Document"}
                      </p>
                    </div>
                  </div>
                  <StatusPill status="verified" />
                </div>

                <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-ink-500 truncate max-w-[140px]">
                    {d.file_name || `${d.doc_type}.pdf`}
                  </span>

                  {unlocked && revealedDocs[d.id] ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedDocForView(revealedDocs[d.id])}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-white transition-colors"
                        style={{ backgroundColor: "var(--color-gov-blue-600)" }}
                      >
                        <Eye size={12} /> View File
                      </button>
                      {revealedDocs[d.id].file_url && (
                        <a
                          href={
                            revealedDocs[d.id].file_url!.startsWith("http")
                              ? revealedDocs[d.id].file_url!
                              : `${API_BASE_URL}${revealedDocs[d.id].file_url}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          download={d.file_name || `${d.doc_type}.pdf`}
                          className="p-1 rounded-md border border-ink-200 text-ink-700 hover:bg-ink-100"
                          title="Download document"
                        >
                          <Download size={13} />
                        </a>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] font-medium text-ink-400 flex items-center gap-1">
                      <Lock size={12} /> Protected
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Biometric Unlock Banner */}
          {!unlocked ? (
            <div className="rounded-2xl p-6 bg-linear-to-b from-ink-100/70 to-ink-50 border border-ink-200 flex flex-col items-center text-center gap-3">
              <div className="h-12 w-12 rounded-full bg-navy-900 text-white flex items-center justify-center shadow-xs" style={{ backgroundColor: "var(--color-navy-900)" }}>
                <Lock size={20} style={{ color: "var(--color-saffron-500)" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-ink-900">
                  Document Scans Protected by National Privacy Safeguards
                </p>
                <p className="text-xs text-ink-500 max-w-md mt-1">
                  Authenticate using the citizen&apos;s registered fingerprint (Right Thumb or Left Thumb) on
                  the hardware sensor to preview or download document proofs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowVerifyModal(true)}
                disabled={unlocking}
                className="mt-1 inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl text-white shadow-sm hover:opacity-95 transition-all disabled:opacity-60"
                style={{ backgroundColor: "var(--color-navy-900)" }}
              >
                <Fingerprint size={16} /> {unlocking ? "Verifying Fingerprint..." : "Authenticate with Fingerprint Sensor"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-4 bg-green-100/70 border border-green-200 text-green-900 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <span>
                  Biometric authorization active. All stored PDF &amp; image files are unlocked and viewable.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUnlocked(false);
                  setRevealedDocs({});
                }}
                className="font-bold underline text-green-950"
              >
                Lock Vault
              </button>
            </div>
          )}
        </Card>

        {/* ========================================================================= */}
        {/* NEW SECTION: Schemes Near Citizen (Eligibility & Missing Documents) */}
        {/* ========================================================================= */}
        <Card className="p-5 border-2" style={{ borderColor: "var(--color-gov-blue-200, #bfdbfe)" }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Landmark size={20} style={{ color: "var(--color-gov-blue-600)" }} />
                <h3 className="font-display font-bold text-lg text-ink-900">
                  Schemes Near {profile.full_name}
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-gov-blue-100 text-gov-blue-700">
                  {nearSchemes.length} Near Schemes
                </span>
              </div>
              <p className="text-xs text-ink-500 mt-1">
                National welfare schemes mapped to citizen&apos;s verified documents. Review matched credentials and upload missing documents to achieve full eligibility.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1 bg-ink-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setSchemeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  schemeFilter === "all"
                    ? "bg-white text-ink-900 shadow-xs"
                    : "text-ink-600 hover:text-ink-900"
                }`}
              >
                All ({nearSchemes.length})
              </button>
              <button
                type="button"
                onClick={() => setSchemeFilter("eligible")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  schemeFilter === "eligible"
                    ? "bg-white text-green-800 shadow-xs"
                    : "text-ink-600 hover:text-green-800"
                }`}
              >
                Eligible ({eligibleSchemesCount})
              </button>
              <button
                type="button"
                onClick={() => setSchemeFilter("missing")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  schemeFilter === "missing"
                    ? "bg-white text-amber-800 shadow-xs"
                    : "text-ink-600 hover:text-amber-800"
                }`}
              >
                Missing Docs ({missingSchemesCount})
              </button>
            </div>
          </div>

          {/* Search bar inside Near Schemes */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={schemeSearch}
              onChange={(e) => setSchemeSearch(e.target.value)}
              placeholder="Search near schemes by name, ministry, or problem category..."
              className="w-full text-xs font-medium rounded-xl border pl-8 pr-3 py-2 outline-none focus:border-gov-blue-500 bg-white"
              style={{ borderColor: "var(--color-ink-300)" }}
            />
          </div>

          {loadingNearSchemes ? (
            <p className="text-xs text-ink-400 py-6 text-center">Loading matching schemes for citizen...</p>
          ) : filteredSchemes.length === 0 ? (
            <div className="text-center py-8 bg-ink-50/60 rounded-xl border border-ink-200">
              <Landmark size={28} className="mx-auto text-ink-400 mb-2" />
              <p className="text-xs font-semibold text-ink-800">No schemes found matching the criteria</p>
              <p className="text-[11px] text-ink-400 mt-0.5">Try clearing filters or search terms.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSchemes.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border bg-white hover:border-ink-300 transition-all space-y-3 shadow-2xs"
                  style={{
                    borderColor: s.is_eligible
                      ? "var(--color-green-300, #86efac)"
                      : "var(--color-ink-200)",
                  }}
                >
                  {/* Scheme Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {s.code && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gov-blue-100 text-gov-blue-700">
                            {s.code}
                          </span>
                        )}
                        <Link
                          to={`/scheme-list/${s.id}`}
                          className="text-sm font-bold text-ink-900 hover:text-gov-blue-600 transition-colors"
                        >
                          {s.name}
                        </Link>
                        {s.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-700">
                            {s.category}
                          </span>
                        )}
                      </div>
                      {s.ministry && (
                        <p className="text-[11px] text-ink-500 font-medium mt-0.5">
                          {s.ministry}
                        </p>
                      )}
                    </div>

                    {/* Eligibility Badge */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {s.is_eligible ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-800 border border-green-200">
                          <CheckCircle2 size={12} className="text-green-600" />
                          Fully Eligible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle size={12} className="text-amber-600" />
                          {s.missing_documents.length} Document{s.missing_documents.length === 1 ? "" : "s"} Missing
                        </span>
                      )}
                      {s.status === "open" ? (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Open
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Summary preview */}
                  {s.summary && (
                    <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed">
                      {s.summary}
                    </p>
                  )}

                  {/* Matched Documents & Missing Documents Sections */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-ink-100">
                    {/* Matched Documents */}
                    <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          Matched Documents ({s.matched_documents.length})
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700">Verified</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.matched_documents.length > 0 ? (
                          s.matched_documents.map((doc, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-300 shadow-2xs"
                            >
                              <CheckCircle2 size={10} className="text-emerald-600" />
                              {doc}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-ink-400 italic">No matching documents yet</span>
                        )}
                      </div>
                    </div>

                    {/* Missing Documents */}
                    <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <AlertCircle size={12} className="text-amber-600" />
                          Missing Documents ({s.missing_documents.length})
                        </span>
                        <span className="text-[10px] font-bold text-amber-700">Action Required</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {s.missing_documents.length > 0 ? (
                          s.missing_documents.map((doc, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => handleOpenUploadForMissingDoc(doc)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-2xs group/btn text-left"
                              title="Click to upload this missing document"
                            >
                              <AlertCircle size={10} className="text-amber-600" />
                              <span>{doc}</span>
                              <UploadCloud size={10} className="text-amber-700 opacity-70 group-hover/btn:opacity-100 ml-0.5" />
                            </button>
                          ))
                        ) : (
                          <span className="text-[11px] text-green-700 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={11} /> All required documents verified!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Scheme Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      {s.application_end_date && (
                        <span>Deadline: <strong className="text-ink-700">{s.application_end_date}</strong></span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.missing_documents.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenUploadForMissingDoc(s.missing_documents[0])}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 transition-colors"
                        >
                          <UploadCloud size={13} />
                          Upload Missing Doc
                        </button>
                      )}
                      <Link
                        to={`/scheme-list/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-navy-900 text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: "var(--color-navy-900)" }}
                      >
                        <Landmark size={13} />
                        View Scheme Profile
                      </Link>
                      {s.apply_url && (
                        <a
                          href={s.apply_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-100 transition-colors"
                        >
                          <ExternalLink size={12} />
                          Portal
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section: Problem List (each civic issue this citizen has reported) */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-ink-900 flex items-center gap-2">
              <Award size={18} style={{ color: "var(--color-saffron-500)" }} /> Problem List
            </h3>
            <PrimaryButton type="button" onClick={openAddProblemModal}>
              <Plus size={14} /> Add Problem
            </PrimaryButton>
          </div>
          {citizenProblems.length === 0 ? (
            <p className="text-xs text-ink-400 italic py-2">
              No problems reported for this citizen yet.
            </p>
          ) : (
            <div className="space-y-3">
              {citizenProblems.map((p, idx) => (
                <div
                  key={p.vote_id}
                  className="p-4 rounded-xl border border-ink-200 bg-white hover:border-ink-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">
                          Problem {idx + 1}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gov-blue-100 text-gov-blue-700">
                          {p.category || OTHER_PROBLEM_CATEGORY}
                        </span>
                        {p.solved ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            <CheckCircle2 size={10} /> Solved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-ink-900 mt-1.5">{p.title}</p>
                      {p.description && (
                        <p className="text-xs text-ink-500 mt-1 line-clamp-2">{p.description}</p>
                      )}
                      <p className="text-[11px] text-ink-400 mt-2">
                        {p.total_votes} total vote{p.total_votes === 1 ? "" : "s"} across all citizens &middot;{" "}
                        {p.solved_votes} confirmed solved
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Section: 2-Finger Biometric Registry */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-ink-900 flex items-center gap-2">
              <Fingerprint size={18} style={{ color: "var(--color-gov-blue-600)" }} /> Enrolled Biometric Fingerprints (2-Finger Standard)
            </h3>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
              STQC / FIDO2 Compliant
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-3.5">
            {profile.fingerprints.length > 0 ? (
              profile.fingerprints.map((fp) => (
                <div key={fp.id} className="p-3.5 rounded-xl border border-ink-200 bg-ink-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gov-blue-100 text-gov-blue-600 flex items-center justify-center shrink-0">
                      <Fingerprint size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900">
                        {fp.finger_index === 1 ? "Primary: " : "Secondary: "}
                        {fp.finger_name}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        {fp.sensor_type} • {Math.round(fp.quality_score * 100)}% Quality
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                    Enrolled
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="p-3.5 rounded-xl border border-ink-200 bg-ink-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gov-blue-100 text-gov-blue-600 flex items-center justify-center">
                      <Fingerprint size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900">Primary: Right Thumb</p>
                      <p className="text-[11px] text-ink-500">WebAuthn Platform Sensor • 96% Quality</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                    Enrolled
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-ink-200 bg-ink-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gov-blue-100 text-gov-blue-600 flex items-center justify-center">
                      <Fingerprint size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink-900">Secondary: Left Thumb</p>
                      <p className="text-[11px] text-ink-500">WebAuthn Platform Sensor • 93% Quality</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                    Enrolled
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Biometric Verification Modal */}
      <BiometricVerifyModal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onSuccess={handleBiometricSuccess}
        subjectType="citizen"
        subjectId={profile.id}
        title="Unlock Citizen Document Vault"
        description="Verify using either of the citizen's registered fingerprints (Right Thumb or Left Thumb) to access protected scanned files."
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={Boolean(selectedDocForView)}
        onClose={() => setSelectedDocForView(null)}
        document={selectedDocForView}
      />

      {/* Upload Additional Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-ink-100 p-6 relative">
            <h3 className="font-display font-bold text-lg text-ink-900 mb-1">Upload Document</h3>
            <p className="text-xs text-ink-500 mb-4">
              Add a new verified PDF or image proof to this citizen&apos;s vault.
            </p>

            <form onSubmit={handleUploadAdditionalDoc} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-semibold text-ink-700 block mb-1">Document Type</label>
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
                  />
                  <input
                    type="text"
                    value={docTypeSearch}
                    onChange={(e) => {
                      setDocTypeSearch(e.target.value);
                      setShowDocTypeOptions(true);
                    }}
                    onFocus={() => setShowDocTypeOptions(true)}
                    onBlur={() => setTimeout(() => setShowDocTypeOptions(false), 150)}
                    placeholder="Type to search (e.g. Aadhaar, Ration, Income)..."
                    className="w-full text-xs font-medium rounded-lg border pl-8 pr-3 py-2.5 outline-none"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  />
                </div>
                {showDocTypeOptions && (
                  <div
                    className="absolute z-10 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border bg-white shadow-lg"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  >
                    {docTypeOptions.length === 0 ? (
                      <p className="text-xs text-ink-400 italic px-3 py-2.5">
                        No matching document type found.
                      </p>
                    ) : (
                      docTypeOptions.map((d) => (
                        <button
                          key={d.name}
                          type="button"
                          onMouseDown={() => {
                            setUploadDocType(d.name);
                            setDocTypeSearch(d.name);
                            setShowDocTypeOptions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-ink-100 flex flex-col"
                        >
                          <span className="font-semibold text-ink-900">{d.name}</span>
                          <span className="text-[10px] text-ink-500">{d.category}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-700 block mb-1">
                  Document Identification Number (Optional)
                </label>
                <input
                  type="text"
                  value={uploadDocNumber}
                  onChange={(e) => setUploadDocNumber(e.target.value)}
                  placeholder="e.g. 4582 9102 3847"
                  className="w-full text-xs rounded-lg border px-3 py-2.5 outline-none"
                  style={{ borderColor: "var(--color-ink-300)" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink-700 block mb-1">Select File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  required
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs rounded-lg border px-3 py-2 outline-none"
                  style={{ borderColor: "var(--color-ink-300)" }}
                />
              </div>

              {uploadError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {uploadError}
                </p>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="flex-[2] py-2.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--color-gov-blue-600)" }}
                >
                  {uploading ? "Uploading & Verifying..." : "Save to Document Vault"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Problem Modal */}
      {showAddProblemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-ink-100 p-6 relative">
            <button
              onClick={() => setShowAddProblemModal(false)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-1">Add Problem</h3>
            <p className="text-xs text-ink-500 mb-4">
              Reports a new civic grievance on behalf of {profile.full_name} and
              registers their vote for it.
            </p>
            <form onSubmit={handleAddProblem} className="space-y-4">
              <TextField
                label="Problem Title"
                required
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
                placeholder="e.g. Broken streetlight on MG Road"
              />
              <SearchableSelect
                label="Category"
                value={problemCategory}
                onChange={setProblemCategory}
                options={PROBLEM_CATEGORIES}
              />
              <label className="block">
                <span className="text-xs font-semibold text-ink-700">Description</span>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                  style={{ borderColor: "var(--color-ink-300)" }}
                />
              </label>
              {problemError && (
                <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  {problemError}
                </p>
              )}
              <div className="flex gap-3 pt-2">
                <SecondaryButton
                  type="button"
                  className="flex-1"
                  onClick={() => setShowAddProblemModal(false)}
                >
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" className="flex-1" disabled={savingProblem}>
                  {savingProblem ? "Adding..." : "Add Problem"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Citizen Confirmation Modal */}
      {showDeleteModal && profile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-ink-100 p-6 relative">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-ink-900">Delete Citizen</h3>
                <p className="text-xs text-ink-500 mt-1">
                  This permanently deletes <strong>{profile.full_name}</strong>&apos;s entire record — documents,
                  fingerprints, problem votes, and scheme history. This action cannot be undone.
                </p>
              </div>
            </div>

            <label className="block mb-4">
              <span className="text-xs font-semibold text-ink-700">
                Type <strong>{profile.full_name}</strong> to confirm
              </span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={profile.full_name}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-red-400"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
            </label>

            {deleteError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 mb-4">
                {deleteError}
              </p>
            )}

            <div className="flex gap-3">
              <SecondaryButton type="button" className="flex-1" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </SecondaryButton>
              <button
                type="button"
                onClick={handleDeleteCitizen}
                disabled={deleting || deleteConfirmText.trim() !== profile.full_name.trim()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white disabled:opacity-40 transition-colors"
                style={{ backgroundColor: "var(--color-red-600, #dc2626)" }}
              >
                <Trash2 size={14} />
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-ink-100 last:border-0">
      <dt className="flex items-center gap-2 text-ink-500 text-xs font-medium">
        {icon} {label}
      </dt>
      <dd className="font-semibold text-ink-900 text-xs text-right max-w-xs truncate">{value}</dd>
    </div>
  );
}