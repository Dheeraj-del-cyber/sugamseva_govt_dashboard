import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Lock,
  Loader2,
  Search,
  Fingerprint,
  Plus,
  Pencil,
  AlertTriangle,
  ExternalLink,
  X,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton, TextField } from "../components/UI";
import FingerprintEnrollment from "../components/FingerprintEnrollment";
import BiometricVerifyModal from "../components/BiometricVerifyModal";
import DocumentViewerModal from "../components/DocumentViewerModal";
import LocationAutocomplete from "../components/LocationAutocomplete";
import SearchableSelect from "../components/SearchableSelect";
import type { EnrolledFinger } from "../lib/biometricSensor";
import { api } from "../api/client";
import { PROBLEM_CATEGORIES, OTHER_PROBLEM_CATEGORY } from "../lib/problemCategories";

interface DocType {
  name: string;
  category: string;
}

interface UploadedDoc {
  id: string;
  doc_type: string;
  file_name?: string;
  file_size?: number;
  verified: boolean;
  source: string;
  doc_number?: string;
  mime_type?: string;
  extracted_text?: string;
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

export default function AddUser() {
  const navigate = useNavigate();

  // Biometric 2-finger state
  const [enrolledFingers, setEnrolledFingers] = useState<EnrolledFinger[]>([]);

  // Personal details
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [guardian1, setGuardian1] = useState("");
  const [guardian2, setGuardian2] = useState("");
  const [address, setAddress] = useState("");

  // Document catalog (all card types across every scheme) + search
  const [docCatalog, setDocCatalog] = useState<DocType[]>([]);
  const [docSearch, setDocSearch] = useState("");

  // Only documents actually uploaded show up here
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  // Fingerprint-gated document viewing
  const [pendingViewDocId, setPendingViewDocId] = useState<string | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<any>(null);
  const [revealing, setRevealing] = useState(false);
  // Kept for the modal's lifetime so "Change Document" / "Delete Document"
  // (also fingerprint-gated) don't need a second sensor scan for the same session.
  const [activeVerificationToken, setActiveVerificationToken] = useState<string | null>(null);

  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Civic problems reported by this citizen
  const [citizenProblems, setCitizenProblems] = useState<CitizenProblemItem[]>([]);
  const [showAddProblemModal, setShowAddProblemModal] = useState(false);
  const [showEditProblemModal, setShowEditProblemModal] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CitizenProblemItem | null>(null);
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [problemCategory, setProblemCategory] = useState(OTHER_PROBLEM_CATEGORY);
  const [savingProblem, setSavingProblem] = useState(false);
  const [problemError, setProblemError] = useState("");

  // Fingerprint-gated "mark solved"
  const [pendingSolveProblemId, setPendingSolveProblemId] = useState<string | null>(null);
  const [showSolveVerifyModal, setShowSolveVerifyModal] = useState(false);
  const [solvingProblemId, setSolvingProblemId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/documents/types")
      .then(({ data }) => setDocCatalog(data))
      .catch(() => setDocCatalog([]));
  }, []);

  const loadCitizenProblems = () => {
    if (!createdUserId) return;
    api
      .get(`/users/${createdUserId}/problems`)
      .then(({ data }) => setCitizenProblems(data))
      .catch(() => setCitizenProblems([]));
  };

  useEffect(loadCitizenProblems, [createdUserId]);

  const openAddProblemModal = () => {
    setEditingProblem(null);
    setProblemTitle("");
    setProblemDescription("");
    setProblemCategory(OTHER_PROBLEM_CATEGORY);
    setProblemError("");
    setShowAddProblemModal(true);
  };

  const openEditProblemModal = (p: CitizenProblemItem) => {
    setEditingProblem(p);
    setProblemTitle(p.title);
    setProblemDescription(p.description || "");
    setProblemCategory(p.category || OTHER_PROBLEM_CATEGORY);
    setProblemError("");
    setShowEditProblemModal(true);
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdUserId) return;
    setSavingProblem(true);
    setProblemError("");
    try {
      await api.post(`/users/${createdUserId}/problems`, {
        title: problemTitle,
        description: problemDescription || undefined,
        category: problemCategory || OTHER_PROBLEM_CATEGORY,
      });
      setShowAddProblemModal(false);
      loadCitizenProblems();
    } catch (err: any) {
      setProblemError(err?.response?.data?.detail || "Failed to add problem");
    } finally {
      setSavingProblem(false);
    }
  };

  const handleEditProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem) return;
    setSavingProblem(true);
    setProblemError("");
    try {
      await api.patch(`/problems/${editingProblem.problem_id}`, {
        title: problemTitle,
        description: problemDescription,
        category: problemCategory || OTHER_PROBLEM_CATEGORY,
      });
      setShowEditProblemModal(false);
      setEditingProblem(null);
      loadCitizenProblems();
    } catch (err: any) {
      setProblemError(err?.response?.data?.detail || "Failed to update problem");
    } finally {
      setSavingProblem(false);
    }
  };

  const handleRequestMarkSolved = (problemId: string) => {
    setPendingSolveProblemId(problemId);
    setShowSolveVerifyModal(true);
  };

  const handleSolveBiometricSuccess = async (token: string) => {
    setShowSolveVerifyModal(false);
    if (!pendingSolveProblemId || !createdUserId) return;
    setSolvingProblemId(pendingSolveProblemId);
    setProblemError("");
    try {
      await api.post(`/problems/${pendingSolveProblemId}/mark-solved`, {
        citizen_id: createdUserId,
        fingerprint_verification_token: token,
      });
      loadCitizenProblems();
    } catch (err: any) {
      setProblemError(err?.response?.data?.detail || "Could not mark problem as solved.");
    } finally {
      setSolvingProblemId(null);
      setPendingSolveProblemId(null);
    }
  };

  const handleEnrollmentComplete = (fingers: EnrolledFinger[]) => {
    setEnrolledFingers(fingers);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (enrolledFingers.length < 2) {
      setError("Please enroll both 2 required fingerprints (Primary & Secondary) first.");
      return;
    }

    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit Indian phone number.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/users", {
        full_name: fullName,
        dob,
        phone_number: phone,
        guardian_phone_1: guardian1 || undefined,
        guardian_phone_2: guardian2 || undefined,
        address,
        fingerprints: enrolledFingers.map((f) => ({
          finger_index: f.finger_index,
          finger_name: f.finger_name,
          hand: f.hand,
          capture_token: f.capture_token,
          credential_id: f.credential_id,
          quality_score: f.quality_score,
          sensor_type: f.sensor_type,
        })),
      });
      setCreatedUserId(data.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not register citizen. Check details.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    if (!createdUserId) {
      setError("Save the citizen's personal details first, then upload document files.");
      return;
    }

    setUploadingDoc(docType);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("source", "upload");

      const { data } = await api.post(`/users/${createdUserId}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadedDocs((prev) => [...prev.filter((d) => d.doc_type !== docType), data]);
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to upload ${docType}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleRequestView = (docId: string) => {
    setPendingViewDocId(docId);
    setShowVerifyModal(true);
  };

  const handleBiometricSuccess = async (token: string) => {
    setShowVerifyModal(false);
    if (!pendingViewDocId || !createdUserId) return;
    setRevealing(true);
    try {
      const { data } = await api.post(
        `/users/${createdUserId}/documents/${pendingViewDocId}/reveal`,
        { fingerprint_verification_token: token }
      );
      setActiveVerificationToken(token);
      setSelectedDocForView({
        id: data.doc_id,
        doc_type: data.doc_type,
        doc_number: data.doc_number,
        file_name: data.file_name,
        file_size: data.file_size,
        mime_type: data.mime_type,
        file_url: data.file_url,
        extracted_text: data.extracted_text,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Fingerprint verification failed. Please try again.");
    } finally {
      setRevealing(false);
      setPendingViewDocId(null);
    }
  };

  // Replace the currently-viewed document's file (still fingerprint-gated -
  // only reachable once the citizen has verified to open the viewer).
  const handleChangeDocument = async (file: File) => {
    if (!createdUserId || !selectedDocForView) return;
    const docType = selectedDocForView.doc_type;
    setUploadingDoc(docType);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("doc_type", docType);
      formData.append("source", "upload");

      const { data } = await api.post(`/users/${createdUserId}/documents/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setUploadedDocs((prev) => [...prev.filter((d) => d.doc_type !== docType), data]);
      setSelectedDocForView({
        id: data.id,
        doc_type: data.doc_type,
        doc_number: data.doc_number,
        file_name: data.file_name,
        file_size: data.file_size,
        mime_type: data.mime_type,
        file_url: data.file_url,
        extracted_text: data.extracted_text,
      });
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to replace ${docType}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  // Delete the currently-viewed document (fingerprint-gated on the server
  // too, using the same verification token that unlocked the viewer).
  const handleDeleteDocument = async () => {
    if (!createdUserId || !selectedDocForView || !activeVerificationToken) return;
    const docId = selectedDocForView.id;
    setError("");
    try {
      await api.delete(`/users/${createdUserId}/documents/${docId}`, {
        data: { fingerprint_verification_token: activeVerificationToken },
      });
      setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
      setSelectedDocForView(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Failed to delete document. Please try again.");
    }
  };

  const uploadedTypes = new Set(uploadedDocs.map((d) => d.doc_type));
  const availableToUpload = docCatalog.filter(
    (d) =>
      !uploadedTypes.has(d.name) &&
      (docSearch.trim() === "" || d.name.toLowerCase().includes(docSearch.trim().toLowerCase()))
  );

  return (
    <Layout title="Add User">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-ink-900">Add Citizen / User</h2>
          <p className="text-sm text-ink-500 mt-1">
            Register citizen with dual-finger biometric hardware verification and document vault
          </p>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-6">
          {/* Section 1: Biometric 2-Finger Enrollment */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Step 1: Dual-Finger Biometric Enrollment (Mandatory)
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Capture 2 distinct fingers from sensor (Windows Hello / Touch ID / USB RD Device)
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gov-blue-100 text-gov-blue-700">
                2 Fingers Required
              </span>
            </div>

            <FingerprintEnrollment
              onEnrollmentComplete={handleEnrollmentComplete}
              userHint="citizen"
            />
          </Card>

          {/* Section 2: Personal Details */}
          <Card className="p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-4">
              Step 2: Personal Demographics &amp; Contact Information
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label="Full Name (As on Aadhaar)"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Ramesh Chandra Sharma"
              />
              <TextField
                label="Date of Birth"
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
              />
              <TextField
                label="Mobile Phone Number"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number (e.g. 9845123456)"
              />
              <TextField
                label="Guardian Phone 1 (Optional)"
                value={guardian1}
                onChange={(e) => setGuardian1(e.target.value)}
                placeholder="Primary guardian mobile"
              />
              <TextField
                label="Guardian Phone 2 (Optional)"
                value={guardian2}
                onChange={(e) => setGuardian2(e.target.value)}
                placeholder="Secondary guardian mobile"
              />
              <LocationAutocomplete
                label="Complete Residential Address"
                value={address}
                onChange={setAddress}
                placeholder="Start typing a place, e.g. Hassan..."
              />
            </div>

            {error && (
              <p className="text-xs font-medium px-3 py-2.5 rounded-lg mt-4 bg-red-50 text-red-600 border border-red-200">
                {error}
              </p>
            )}

            {!createdUserId ? (
              <div className="flex justify-end mt-5">
                <PrimaryButton type="submit" disabled={submitting || enrolledFingers.length < 2}>
                  {submitting ? "Registering Citizen..." : "Save Citizen & Proceed to Documents"}
                </PrimaryButton>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-xl bg-green-100/70 text-green-800 flex items-center justify-between text-xs font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <span>Citizen profile registered successfully. Upload verified documents below.</span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/users/${createdUserId}`)}
                  className="font-bold underline text-green-900"
                >
                  View Profile &rarr;
                </button>
              </div>
            )}
          </Card>

          {/* Section 3: Real Document Upload & Storage */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Step 3: Document Vault &amp; Proof Verification
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Search any card issued under a government scheme, then upload it
                </p>
              </div>
            </div>

            {/* Search + upload picker */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search a document / card name to upload (e.g. Aadhaar, PAN, Ration Card)..."
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-ink-200 focus:border-gov-blue-500 focus:outline-none focus:ring-2 focus:ring-gov-blue-100 transition-all"
                disabled={!createdUserId}
              />
            </div>

            {!createdUserId && (
              <p className="text-xs text-ink-400 italic mb-3">
                Save the citizen's personal details in Step 2 first to unlock document upload.
              </p>
            )}

            {createdUserId && (
              <div className="grid sm:grid-cols-2 gap-3 mb-6 max-h-80 overflow-y-auto pr-1">
                {availableToUpload.length === 0 ? (
                  <p className="text-xs text-ink-400 italic sm:col-span-2 py-2">
                    {docSearch
                      ? "No matching document type found."
                      : "Every recognised document type has been uploaded for this citizen."}
                  </p>
                ) : (
                  availableToUpload.map((doc) => {
                    const isUploading = uploadingDoc === doc.name;
                    return (
                      <div
                        key={doc.name}
                        className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                          isUploading ? "border-gov-blue-500 bg-gov-blue-50/20" : "border-ink-200 bg-white hover:border-ink-300"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={18} className="text-ink-400" />
                          <div>
                            <p className="text-xs font-bold text-ink-900">{doc.name}</p>
                            <p className="text-[10px] text-ink-500">{doc.category}</p>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-ink-100 flex items-center justify-between">
                          <p className="text-[11px] text-ink-400">PDF, JPG, PNG up to 10MB</p>
                          <label
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-white ${
                              isUploading ? "opacity-40 pointer-events-none bg-ink-400" : "bg-gov-blue-600 hover:bg-gov-blue-700"
                            }`}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 size={13} className="animate-spin" /> Uploading...
                              </>
                            ) : (
                              <>
                                <UploadCloud size={13} /> Upload File
                              </>
                            )}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="hidden"
                              disabled={isUploading}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.name, file);
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Uploaded documents - only what's actually on file */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-500 mb-3">
                Uploaded Documents ({uploadedDocs.length})
              </p>
              {uploadedDocs.length === 0 ? (
                <p className="text-xs text-ink-400 italic">No documents uploaded yet.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {uploadedDocs.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl border-2 border-green-500/40 bg-green-50/40 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-green-600" />
                          <div>
                            <p className="text-xs font-bold text-ink-900">{d.doc_type}</p>
                            <p className="text-[10px] text-ink-500 truncate max-w-[170px]">
                              {d.file_name} {d.file_size ? `(${(d.file_size / 1024).toFixed(0)} KB)` : ""}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                          <CheckCircle2 size={11} /> {d.verified ? "Verified" : "On File"}
                        </span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-ink-500 capitalize">Source: {d.source}</span>
                        <button
                          type="button"
                          onClick={() => handleRequestView(d.id)}
                          disabled={revealing}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-md text-white disabled:opacity-40 transition-colors"
                          style={{ backgroundColor: "var(--color-gov-blue-600)" }}
                        >
                          <Fingerprint size={12} /> View (Fingerprint Required)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-start gap-2.5 text-xs text-ink-600 rounded-xl p-3.5 bg-ink-100/60 border border-ink-200">
              <Lock size={15} className="mt-0.5 shrink-0 text-ink-500" />
              <span>
                Uploaded document files are encrypted at rest on secure server storage. Per Government of
                India security policy, every attempt to view or download a raw scan requires a fresh
                biometric fingerprint verification from the citizen — enforced on the server, not just in
                this screen.
              </span>
            </div>
          </Card>

          {/* Section 4: Civic Problems Reported by Citizen */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-500">
                  Step 4: Civic Problems Reported by Citizen
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Log grievances on this citizen&apos;s behalf and track resolution — synced with Vote of Problems
                </p>
              </div>
              <PrimaryButton type="button" onClick={openAddProblemModal} disabled={!createdUserId}>
                <Plus size={14} /> Add Problem
              </PrimaryButton>
            </div>

            {!createdUserId && (
              <p className="text-xs text-ink-400 italic mb-1">
                Save the citizen's personal details in Step 2 first to unlock problem reporting.
              </p>
            )}

            {problemError && (
              <p className="text-xs font-medium px-3 py-2.5 rounded-lg mb-4 bg-red-50 text-red-600 border border-red-200">
                {problemError}
              </p>
            )}

            {createdUserId && (
              <div className="space-y-3">
                {citizenProblems.length === 0 ? (
                  <p className="text-xs text-ink-400 italic py-2">
                    No problems reported for this citizen yet.
                  </p>
                ) : (
                  citizenProblems.map((p, idx) => (
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
                          <p className="text-sm font-bold text-ink-900 mt-1.5 truncate">{p.title}</p>
                          {p.description && (
                            <p className="text-xs text-ink-500 mt-1 line-clamp-2">{p.description}</p>
                          )}
                          <p className="text-[11px] text-ink-400 mt-2">
                            {p.total_votes} total vote{p.total_votes === 1 ? "" : "s"} across all citizens &middot;{" "}
                            {p.solved_votes} confirmed solved
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-ink-100 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditProblemModal(p)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border border-ink-200 text-ink-700 hover:bg-ink-100"
                        >
                          <Pencil size={12} /> Edit Problem
                        </button>

                        {!p.solved && (
                          <button
                            type="button"
                            onClick={() => handleRequestMarkSolved(p.problem_id)}
                            disabled={solvingProblemId === p.problem_id}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-md text-white disabled:opacity-40 transition-colors"
                            style={{ backgroundColor: "var(--color-green-600)" }}
                          >
                            <Fingerprint size={12} />
                            {solvingProblemId === p.problem_id ? "Verifying..." : "Mark Problem Solved"}
                          </button>
                        )}

                        <Link
                          to={`/problems/${p.problem_id}`}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md hover:underline ml-auto"
                          style={{ color: "var(--color-gov-blue-600)" }}
                        >
                          View in Vote of Problems <ExternalLink size={11} />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="mt-4 flex items-start gap-2.5 text-xs text-ink-600 rounded-xl p-3.5 bg-ink-100/60 border border-ink-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-ink-500" />
              <span>
                Marking a problem solved requires the citizen&apos;s own live fingerprint verification on the
                sensor, and cannot be reverted once confirmed — same rule enforced in Vote of Problems.
              </span>
            </div>
          </Card>

          {createdUserId && (
            <div className="flex justify-end gap-3 pt-2">
              <SecondaryButton type="button" onClick={() => navigate("/users")}>
                Return to Users List
              </SecondaryButton>
              <PrimaryButton type="button" onClick={() => navigate(`/users/${createdUserId}`)}>
                Open Citizen Profile &rarr;
              </PrimaryButton>
            </div>
          )}
        </form>
      </div>

      {createdUserId && (
        <BiometricVerifyModal
          isOpen={showVerifyModal}
          onClose={() => {
            setShowVerifyModal(false);
            setPendingViewDocId(null);
          }}
          onSuccess={handleBiometricSuccess}
          subjectType="citizen"
          subjectId={createdUserId}
          title="Verify Fingerprint to View Document"
          description="Ask the citizen to place either enrolled finger (Right Thumb or Left Thumb) on the sensor to unlock this document."
        />
      )}

      <DocumentViewerModal
        isOpen={Boolean(selectedDocForView)}
        onClose={() => {
          setSelectedDocForView(null);
          setActiveVerificationToken(null);
        }}
        document={selectedDocForView}
        onChangeDocument={handleChangeDocument}
        onDeleteDocument={handleDeleteDocument}
        changing={uploadingDoc === selectedDocForView?.doc_type}
      />

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
              Reports a new civic grievance and registers this citizen&apos;s vote for it.
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
                <SecondaryButton type="button" className="flex-1" onClick={() => setShowAddProblemModal(false)}>
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

      {/* Edit Problem Modal */}
      {showEditProblemModal && editingProblem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-ink-100 p-6 relative">
            <button
              onClick={() => setShowEditProblemModal(false)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-1">Edit Problem</h3>
            <p className="text-xs text-ink-500 mb-4">
              Updates the reported details. Vote counts and solved status are unaffected.
            </p>
            <form onSubmit={handleEditProblem} className="space-y-4">
              <TextField
                label="Problem Title"
                required
                value={problemTitle}
                onChange={(e) => setProblemTitle(e.target.value)}
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
                <SecondaryButton type="button" className="flex-1" onClick={() => setShowEditProblemModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" className="flex-1" disabled={savingProblem}>
                  {savingProblem ? "Saving..." : "Save Changes"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Problem Solved - Biometric Verification */}
      {createdUserId && (
        <BiometricVerifyModal
          isOpen={showSolveVerifyModal}
          onClose={() => {
            setShowSolveVerifyModal(false);
            setPendingSolveProblemId(null);
          }}
          onSuccess={handleSolveBiometricSuccess}
          subjectType="citizen"
          subjectId={createdUserId}
          title="Verify Fingerprint to Mark Problem Solved"
          description="Ask the citizen to place either enrolled finger (Right Thumb or Left Thumb) on the sensor to confirm this problem has been resolved. This cannot be reverted."
        />
      )}
    </Layout>
  );
}