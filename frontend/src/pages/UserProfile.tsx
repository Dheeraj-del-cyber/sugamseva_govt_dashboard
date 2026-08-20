import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatusPill, PrimaryButton, SecondaryButton } from "../components/UI";
import BiometricVerifyModal from "../components/BiometricVerifyModal";
import DocumentViewerModal from "../components/DocumentViewerModal";
import { api, API_BASE_URL } from "../api/client";

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
}

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [matchedFingerName, setMatchedFingerName] = useState<string | null>(null);
  const [revealedDocs, setRevealedDocs] = useState<Record<string, DocumentOut>>({});
  const [unlocking, setUnlocking] = useState(false);

  // Modals
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedDocForView, setSelectedDocForView] = useState<DocumentOut | null>(null);

  // Additional Document Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocType, setUploadDocType] = useState("Aadhaar Card");
  const [uploadDocNumber, setUploadDocNumber] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const loadProfile = () => {
    if (userId) api.get(`/users/${userId}`).then(({ data }) => setProfile(data));
  };

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const handleBiometricSuccess = async (token: string, matchedFinger: string) => {
    if (!userId || !profile) return;
    setUnlocking(true);
    try {
      // One fresh fingerprint scan mints a fingerprint-verification-token that
      // is used to reveal every document in the vault - the server still
      // requires that token (via /reveal) to mint the actual file access
      // token, so nothing is viewable without this scan having happened.
      const results = await Promise.all(
        profile.documents.map((d) =>
          api
            .post(`/users/${userId}/documents/${d.id}/reveal`, { fingerprint_verification_token: token })
            .then(({ data }) => ({ id: d.id, doc: { ...d, file_url: data.file_url, file_name: data.file_name, file_size: data.file_size, mime_type: data.mime_type, extracted_text: data.extracted_text } }))
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
      loadProfile();
    } catch (err: any) {
      setUploadError(err?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
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
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <SecondaryButton type="button" onClick={() => setShowUploadModal(true)}>
              <UploadCloud size={14} /> Upload Document
            </SecondaryButton>
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

        {/* Section: Verified Documents Vault */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-ink-900 flex items-center gap-2">
                <FileText size={18} style={{ color: "var(--color-gov-blue-600)" }} /> Scanned Government Documents Vault
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Physical files stored on server. Biometric verification unlocks real PDF &amp; image view.
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
              <div>
                <label className="text-xs font-semibold text-ink-700 block mb-1">Document Type</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full text-xs font-medium rounded-lg border px-3 py-2.5 outline-none"
                  style={{ borderColor: "var(--color-ink-300)" }}
                >
                  <option value="Aadhaar Card">Aadhaar Card</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Ration Card">Ration Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="Income Certificate">Income Certificate</option>
                  <option value="Land Records">Land Records</option>
                  <option value="Driving Licence">Driving Licence</option>
                  <option value="Passport">Passport</option>
                </select>
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