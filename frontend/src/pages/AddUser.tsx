import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Fingerprint, Camera, CheckCircle2, ScanLine, Lock, Loader2 } from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton, TextField } from "../components/UI";
import { api } from "../api/client";

const DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Passport",
  "Voter ID",
  "Driving Licence",
  "Ration Card",
];

export default function AddUser() {
  const navigate = useNavigate();

  const [captureToken, setCaptureToken] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [phone, setPhone] = useState("");
  const [guardian1, setGuardian1] = useState("");
  const [guardian2, setGuardian2] = useState("");
  const [address, setAddress] = useState("");

  const [verifiedDocs, setVerifiedDocs] = useState<Record<string, boolean>>({});
  const [scanningDoc, setScanningDoc] = useState<string | null>(null);

  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleCapture = async () => {
    setCapturing(true);
    try {
      const { data } = await api.post("/biometric/capture", null, { params: { subject_hint: "citizen" } });
      setCaptureToken(data.fingerprint_capture_token);
    } finally {
      setCapturing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!captureToken) {
      setError("Please capture the citizen's fingerprint first");
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
        fingerprint_capture_token: captureToken,
      });
      setCreatedUserId(data.id);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not register user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanDoc = async (docType: string) => {
    if (!createdUserId) {
      setError("Save the user's personal details first, then verify document cards.");
      return;
    }
    setScanningDoc(docType);
    try {
      const { data } = await api.post(`/users/${createdUserId}/documents/scan`, {
        doc_type: docType,
        source: "scan",
      });
      setVerifiedDocs((prev) => ({ ...prev, [docType]: data.verified }));
    } finally {
      setScanningDoc(null);
    }
  };

  const handleImportDigiLocker = async () => {
    if (!createdUserId) {
      setError("Save the user's personal details first, then import from DigiLocker.");
      return;
    }
    const { data } = await api.post(`/users/${createdUserId}/documents/import-digilocker`);
    const next: Record<string, boolean> = { ...verifiedDocs };
    data.forEach((d: any) => (next[d.doc_type] = d.verified));
    setVerifiedDocs(next);
  };

  return (
    <Layout title="Add User">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-6">
          <h2 className="font-display text-xl font-bold text-ink-900">Add User</h2>
          <p className="text-sm text-ink-500 mt-1">Register a citizen and verify government documents</p>
        </div>

        <form onSubmit={handleCreateUser} className="space-y-6">
          {/* Biometric */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-4">Biometric Authentication</p>
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: captureToken ? "var(--color-green-100)" : "var(--color-gov-blue-100)" }}
              >
                {captureToken ? (
                  <CheckCircle2 size={24} style={{ color: "var(--color-green-600)" }} />
                ) : (
                  <Fingerprint size={24} style={{ color: "var(--color-gov-blue-600)" }} />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink-900">
                  {captureToken ? "Fingerprint Captured" : "Capture Fingerprint"}
                </p>
                <p className="text-xs text-ink-500">Place finger on biometric device</p>
              </div>
              <SecondaryButton type="button" onClick={handleCapture} disabled={capturing || !!captureToken}>
                {capturing ? "Capturing..." : captureToken ? "Captured" : "Capture"}
              </SecondaryButton>
            </div>
          </Card>

          {/* Photo */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-4">User Photo</p>
            <div className="flex items-center gap-4">
              <div
                className="h-20 w-20 rounded-xl border-2 border-dashed flex items-center justify-center text-ink-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              >
                <Camera size={22} />
              </div>
              <SecondaryButton type="button">Upload Photo</SecondaryButton>
            </div>
          </Card>

          {/* Personal details */}
          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-4">Personal Details</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <TextField label="Full Name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <TextField label="Date of Birth" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
              <TextField label="Phone Number" required value={phone} onChange={(e) => setPhone(e.target.value)} />
              <TextField label="Guardian Phone 1" value={guardian1} onChange={(e) => setGuardian1(e.target.value)} />
              <TextField label="Guardian Phone 2" value={guardian2} onChange={(e) => setGuardian2(e.target.value)} />
              <TextField label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            {error && (
              <p className="text-xs font-medium px-3 py-2 rounded-lg mt-4" style={{ backgroundColor: "var(--color-red-100)", color: "var(--color-red-600)" }}>
                {error}
              </p>
            )}

            {!createdUserId && (
              <div className="flex justify-end mt-5">
                <PrimaryButton type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save User & Continue"}
                </PrimaryButton>
              </div>
            )}
            {createdUserId && (
              <div className="mt-4 flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-green-600)" }}>
                <CheckCircle2 size={16} /> User saved. Now verify document cards below.
              </div>
            )}
          </Card>

          {/* Document cards */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Add Cards / Documents</p>
              <button
                type="button"
                onClick={handleImportDigiLocker}
                disabled={!createdUserId}
                className="text-xs font-semibold disabled:opacity-40"
                style={{ color: "var(--color-gov-blue-600)" }}
              >
                Import via DigiLocker
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {DOCUMENT_TYPES.map((doc) => {
                const verified = verifiedDocs[doc];
                const scanning = scanningDoc === doc;
                return (
                  <div
                    key={doc}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <ScanLine size={16} className="text-ink-500" />
                      <span className="text-sm font-medium text-ink-900">{doc}</span>
                      {verified && <CheckCircle2 size={16} style={{ color: "var(--color-green-600)" }} />}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleScanDoc(doc)}
                      disabled={!createdUserId || scanning}
                      className="text-xs font-semibold disabled:opacity-40"
                      style={{ color: "var(--color-gov-blue-600)" }}
                    >
                      {scanning ? <Loader2 size={14} className="animate-spin" /> : verified ? "Re-scan" : "Scan & Verify"}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs text-ink-500 rounded-lg p-3" style={{ backgroundColor: "var(--color-ink-100)" }}>
              <Lock size={14} className="mt-0.5 shrink-0" />
              Scanned documents are encrypted at rest. Only the document type and verification
              status are shown here &mdash; the underlying scan can only be revealed after a fresh
              fingerprint verification.
            </div>
          </Card>

          {createdUserId && (
            <div className="flex justify-end gap-3">
              <SecondaryButton type="button" onClick={() => navigate("/users")}>
                Reset
              </SecondaryButton>
              <PrimaryButton type="button" onClick={() => navigate(`/users/${createdUserId}`)}>
                View Profile
              </PrimaryButton>
            </div>
          )}
        </form>
      </div>
    </Layout>
  );
}
