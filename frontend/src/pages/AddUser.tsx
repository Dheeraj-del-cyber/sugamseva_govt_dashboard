import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Lock,
  Loader2,
  Search,
  Fingerprint,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton, TextField } from "../components/UI";
import FingerprintEnrollment from "../components/FingerprintEnrollment";
import BiometricVerifyModal from "../components/BiometricVerifyModal";
import DocumentViewerModal from "../components/DocumentViewerModal";
import type { EnrolledFinger } from "../lib/biometricSensor";
import { api } from "../api/client";

interface DocType {
  name: string;
  description: string;
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

  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/documents/types")
      .then(({ data }) => setDocCatalog(data))
      .catch(() => setDocCatalog([]));
  }, []);

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
              <TextField
                label="Complete Residential Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House/Street, Ward, City, State, PIN Code"
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
                            <p className="text-[10px] text-ink-500">{doc.description}</p>
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
        onClose={() => setSelectedDocForView(null)}
        document={selectedDocForView}
      />
    </Layout>
  );
}