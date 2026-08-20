import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  FileText,
  Lock,
  Loader2,
  Sparkles,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton, TextField } from "../components/UI";
import FingerprintEnrollment from "../components/FingerprintEnrollment";
import { EnrolledFinger } from "../lib/biometricSensor";
import { api } from "../api/client";

const DOCUMENT_TYPES = [
  { name: "Aadhaar Card", required: true, desc: "12-Digit Unique National Identity" },
  { name: "PAN Card", required: false, desc: "Permanent Account Number Card" },
  { name: "Ration Card", required: false, desc: "Food & Civil Supplies Department Card" },
  { name: "Voter ID", required: false, desc: "Election Commission of India EPIC Card" },
  { name: "Income Certificate", required: false, desc: "Revenue Department Certified Proof" },
  { name: "Land Records", required: false, desc: "Khatauni / RoR / 7/12 Land Record Proof" },
];

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

  // Document upload state
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, { fileName: string; size: number; verified: boolean }>>({});
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

      setUploadedDocs((prev) => ({
        ...prev,
        [docType]: {
          fileName: data.file_name || file.name,
          size: data.file_size || file.size,
          verified: data.verified,
        },
      }));
    } catch (err: any) {
      setError(err?.response?.data?.detail || `Failed to upload ${docType}`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleImportDigiLocker = async () => {
    if (!createdUserId) {
      setError("Save the citizen's personal details first, then import from DigiLocker.");
      return;
    }
    setUploadingDoc("digilocker");
    try {
      const { data } = await api.post(`/users/${createdUserId}/documents/import-digilocker`);
      const next: Record<string, { fileName: string; size: number; verified: boolean }> = { ...uploadedDocs };
      data.forEach((d: any) => {
        next[d.doc_type] = {
          fileName: d.file_name || `${d.doc_type}_verified.pdf`,
          size: d.file_size || 250000,
          verified: d.verified,
        };
      });
      setUploadedDocs(next);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "DigiLocker sync failed");
    } finally {
      setUploadingDoc(null);
    }
  };

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
                  Upload PDF, PNG, or JPG files (saved to server disk with OCR text recognition)
                </p>
              </div>
              <button
                type="button"
                onClick={handleImportDigiLocker}
                disabled={!createdUserId || uploadingDoc === "digilocker"}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gov-blue-600 text-gov-blue-600 hover:bg-gov-blue-50 disabled:opacity-40 transition-colors"
              >
                <Sparkles size={13} />
                {uploadingDoc === "digilocker" ? "Syncing..." : "Auto-Import from DigiLocker"}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              {DOCUMENT_TYPES.map((doc) => {
                const uploaded = uploadedDocs[doc.name];
                const isUploading = uploadingDoc === doc.name;

                return (
                  <div
                    key={doc.name}
                    className={`p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between ${
                      uploaded
                        ? "border-green-500/40 bg-green-50/40"
                        : isUploading
                        ? "border-gov-blue-500 bg-gov-blue-50/20"
                        : "border-ink-200 bg-white hover:border-ink-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText size={18} className={uploaded ? "text-green-600" : "text-ink-400"} />
                        <div>
                          <p className="text-xs font-bold text-ink-900">{doc.name}</p>
                          <p className="text-[10px] text-ink-500">{doc.desc}</p>
                        </div>
                      </div>
                      {uploaded && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 size={11} /> Saved &amp; Verified
                        </span>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-ink-100 flex items-center justify-between">
                      {uploaded ? (
                        <p className="text-[11px] text-ink-600 truncate max-w-[170px]">
                          {uploaded.fileName} ({(uploaded.size / 1024).toFixed(0)} KB)
                        </p>
                      ) : (
                        <p className="text-[11px] text-ink-400">PDF, JPG, PNG up to 10MB</p>
                      )}

                      <label
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          !createdUserId || isUploading
                            ? "opacity-40 pointer-events-none bg-ink-100 text-ink-500"
                            : uploaded
                            ? "border border-ink-300 text-ink-700 hover:bg-ink-100"
                            : "text-white bg-gov-blue-600 hover:bg-gov-blue-700"
                        }`}
                        style={!uploaded && createdUserId ? { backgroundColor: "var(--color-gov-blue-600)" } : {}}
                      >
                        {isUploading ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <UploadCloud size={13} /> {uploaded ? "Replace File" : "Upload File"}
                          </>
                        )}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          className="hidden"
                          disabled={!createdUserId || isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc.name, file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-2.5 text-xs text-ink-600 rounded-xl p-3.5 bg-ink-100/60 border border-ink-200">
              <Lock size={15} className="mt-0.5 shrink-0 text-ink-500" />
              <span>
                Uploaded document files are encrypted at rest on secure server storage. Per Government of
                India security policy, viewing or downloading the raw scan requires a fresh biometric
                fingerprint verification from the citizen.
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
    </Layout>
  );
}
