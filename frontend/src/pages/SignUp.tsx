import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle2, ScanLine } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import FingerprintEnrollment from "../components/FingerprintEnrollment";
import type { EnrolledFinger } from "../lib/biometricSensor";

type VerifiedRecord = {
  full_name: string;
  dob: string;
  phone_number: string;
  address: string;
};

export default function SignUp() {
  const navigate = useNavigate();
  const { setOfficial } = useAuth();

  const [govtId, setGovtId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [record, setRecord] = useState<VerifiedRecord | null>(null);
  const [verifyError, setVerifyError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [enrolledFingers, setEnrolledFingers] = useState<EnrolledFinger[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleVerifyId = async () => {
    setVerifying(true);
    setVerifyError("");
    setRecord(null);
    try {
      const { data } = await api.post("/auth/verify-govt-id", { govt_id: govtId });
      setRecord(data);
    } catch (err: any) {
      setVerifyError(err?.response?.data?.detail || "Government ID could not be verified in the national registry");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (!record) {
      setSubmitError("Please verify your Government ID first");
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords do not match");
      return;
    }
    if (enrolledFingers.length < 2) {
      setSubmitError("Please enroll both 2 required fingerprints (Primary & Secondary)");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/signup", {
        govt_id: govtId,
        full_name: record.full_name,
        dob: record.dob,
        phone_number: record.phone_number,
        address: record.address,
        email: email || undefined,
        password,
        fingerprints: enrolledFingers.map((f) => ({
          finger_index: f.finger_index,
          finger_name: f.finger_name,
          hand: f.hand,
          capture_token: f.capture_token,
          credential_id: f.credential_id,
          quality_score: f.quality_score,
          sensor_type: f.sensor_type,
        })),
        fingerprint_capture_token: enrolledFingers[0]?.capture_token,
      });

      localStorage.setItem("sugamseva_token", data.access_token);
      setOfficial(data.official);
      navigate("/dashboard");
    } catch (err: any) {
      setSubmitError(err?.response?.data?.detail || "Could not create account");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-10 px-4" style={{ backgroundColor: "var(--color-paper)" }}>
      <div className="flex items-center gap-2.5 mb-8">
        <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--color-navy-900)" }}>
          <ShieldCheck size={18} style={{ color: "var(--color-saffron-500)" }} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-500 leading-none">Government of India</p>
          <p className="font-display font-bold text-sm text-navy-900" style={{ color: "var(--color-navy-900)" }}>Sugam Seva</p>
        </div>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl border border-ink-100 shadow-sm p-6 sm:p-10">
        <h2 className="font-display text-2xl font-bold text-center text-ink-900">Create Official Account</h2>
        <p className="text-sm text-ink-500 text-center mt-1">Register as a verified government official with dual-finger biometric security</p>
        <div className="tricolor-rule w-16 rounded-full mx-auto mt-4" />

        <form onSubmit={handleSubmit} className="mt-8 space-y-8">
          {/* Section 1: Government Identity */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-3">1. Government Identity Verification</p>
            <div className="flex gap-2">
              <input
                value={govtId}
                onChange={(e) => {
                  setGovtId(e.target.value);
                  setRecord(null);
                }}
                placeholder="e.g. GOV-IN-100236"
                required
                className="flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
              <button
                type="button"
                onClick={handleVerifyId}
                disabled={verifying || !govtId}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-navy-900)" }}
              >
                {verifying ? "Verifying..." : "Verify ID"}
              </button>
            </div>
            {verifyError && <p className="text-xs mt-2 text-red-600">{verifyError}</p>}
            {record && (
              <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium bg-green-100 text-green-700">
                <CheckCircle2 size={16} /> Government ID verified &mdash; {record.full_name}
              </div>
            )}
          </section>

          {/* Section 2: Official Details */}
          {record && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-3">2. Official Directory Information</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <ReadOnlyField label="Full Name" value={record.full_name} />
                <ReadOnlyField label="Date of Birth" value={record.dob} />
                <ReadOnlyField label="Phone Number" value={record.phone_number} />
                <ReadOnlyField label="Office Location / Address" value={record.address} />
              </div>
              <label className="block mt-4">
                <span className="text-xs font-semibold text-ink-700">Official Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. official@gov.in"
                  className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                  style={{ borderColor: "var(--color-ink-300)" }}
                />
              </label>
            </section>
          )}

          {/* Section 3: Account Security */}
          {record && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-3">3. Account Security</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700">Create Password *</span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-ink-700">Confirm Password *</span>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  />
                </label>
              </div>
            </section>
          )}

          {/* Section 4: Dual-Finger Biometric Sensor Enrollment */}
          {record && (
            <section>
              <p className="text-xs font-bold uppercase tracking-wide text-ink-500 mb-3">
                4. Dual-Finger Biometric Authentication (Sensor Capture)
              </p>
              <FingerprintEnrollment
                onEnrollmentComplete={(f) => setEnrolledFingers(f)}
                userHint="official"
              />
            </section>
          )}

          {submitError && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
              {submitError}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setGovtId("");
                setRecord(null);
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setEnrolledFingers([]);
              }}
              className="flex-1 rounded-lg py-3 text-sm font-semibold border"
              style={{ borderColor: "var(--color-ink-300)", color: "var(--color-navy-900)" }}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={submitting || !record || enrolledFingers.length < 2}
              className="flex-[2] rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-gov-blue-600)" }}
            >
              {submitting ? "Registering Official..." : "Complete Official Registration"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/signin" className="font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
            Sign In
          </Link>
        </p>
      </div>
      <p className="mt-6 text-[11px] text-ink-500 flex items-center gap-1.5">
        <ScanLine size={12} /> Available demo Government IDs: GOV-IN-100234, GOV-IN-100235, GOV-IN-100236
      </p>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold text-ink-700">{label}</span>
      <div className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm bg-ink-100 text-ink-800 font-medium" style={{ borderColor: "var(--color-ink-300)" }}>
        {value}
      </div>
    </div>
  );
}