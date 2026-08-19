import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Fingerprint, Lock, CheckCircle2, Phone, MapPin, Cake } from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatusPill } from "../components/UI";
import { api } from "../api/client";

interface DocumentOut {
  id: string;
  doc_type: string;
  verified: boolean;
  source: string;
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
  total_problems: number;
  problems_solved: number;
  problems_pending: number;
}

// Demo scheme-usage display data - in production this comes from a
// /users/{id}/scheme-usages endpoint (omitted here for brevity, follows
// the same pattern as /schemes/{id}/used).
const DEMO_SCHEMES_USED = [
  { name: "PM Ujjwala Yojana", year: 2024 },
  { name: "Ayushman Bharat", year: 2024 },
];

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (userId) api.get(`/users/${userId}`).then(({ data }) => setProfile(data));
  }, [userId]);

  const handleFingerprintUnlock = async () => {
    setVerifying(true);
    try {
      await api.post("/biometric/verify", { subject_type: "citizen", subject_id: userId });
      setUnlocked(true);
    } finally {
      setVerifying(false);
    }
  };

  if (!profile) {
    return (
      <Layout title="User Profile" backTo={{ to: "/users", label: "Back to List" }}>
        <p className="text-center text-ink-500 py-12">Loading profile...</p>
      </Layout>
    );
  }

  const initials = profile.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <Layout title="User Profile" backTo={{ to: "/users", label: "Back to List" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-2xl font-display font-bold text-white shrink-0"
            style={{ backgroundColor: "var(--color-navy-800)" }}
          >
            {initials}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">{profile.full_name}</h2>
            <p className="text-sm text-ink-500 mt-0.5">{profile.phone_number}</p>
            <div className="mt-2">
              <StatusPill status="verified" />
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal details */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-ink-900 mb-4">Personal Details</h3>
            <dl className="space-y-3 text-sm">
              <Row icon={<Cake size={14} />} label="Date of Birth" value={profile.dob} />
              <Row icon={<Phone size={14} />} label="Phone Number" value={profile.phone_number} />
              <Row icon={<Phone size={14} />} label="Guardian 1" value={profile.guardian_phone_1 || "—"} />
              <Row icon={<Phone size={14} />} label="Guardian 2" value={profile.guardian_phone_2 || "—"} />
              <Row icon={<MapPin size={14} />} label="Address" value={profile.address || "—"} />
            </dl>
          </Card>

          {/* Problems */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-ink-900 mb-4">Problems</h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg p-3" style={{ backgroundColor: "var(--color-gov-blue-100)" }}>
                <p className="text-xl font-display font-extrabold" style={{ color: "var(--color-gov-blue-600)" }}>{profile.total_problems}</p>
                <p className="text-[11px] text-ink-500 mt-1">Total</p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: "var(--color-green-100)" }}>
                <p className="text-xl font-display font-extrabold" style={{ color: "var(--color-green-600)" }}>{profile.problems_solved}</p>
                <p className="text-[11px] text-ink-500 mt-1">Solved</p>
              </div>
              <div className="rounded-lg p-3" style={{ backgroundColor: "var(--color-amber-100)" }}>
                <p className="text-xl font-display font-extrabold" style={{ color: "var(--color-amber-600)" }}>{profile.problems_pending}</p>
                <p className="text-[11px] text-ink-500 mt-1">Pending</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Verified Documents */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Verified Documents</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {profile.documents.filter((d) => d.verified).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border px-4 py-3" style={{ borderColor: "var(--color-ink-300)" }}>
                <span className="text-sm font-medium text-ink-900">{d.doc_type}</span>
                <StatusPill status="verified" />
              </div>
            ))}
            {profile.documents.filter((d) => d.verified).length === 0 && (
              <p className="text-sm text-ink-500">No verified documents yet.</p>
            )}
          </div>

          {!unlocked ? (
            <div className="rounded-xl p-5 flex flex-col items-center text-center gap-3" style={{ backgroundColor: "var(--color-ink-100)" }}>
              <Lock size={20} className="text-ink-500" />
              <p className="text-sm font-semibold text-ink-900">Scanned documents are protected and hidden.</p>
              <p className="text-xs text-ink-500">Fingerprint verification required to view.</p>
              <button
                onClick={handleFingerprintUnlock}
                disabled={verifying}
                className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--color-navy-900)" }}
              >
                <Fingerprint size={14} /> {verifying ? "Verifying..." : "Verify with Fingerprint"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl p-4 flex items-center gap-2 text-sm font-medium" style={{ backgroundColor: "var(--color-green-100)", color: "var(--color-green-600)" }}>
              <CheckCircle2 size={16} /> Fingerprint verified. Scanned document references are now accessible via the secure vault.
            </div>
          )}
        </Card>

        {/* Schemes used */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Schemes Used</h3>
          <ul className="divide-y divide-ink-100">
            {DEMO_SCHEMES_USED.map((s) => (
              <li key={s.name} className="flex items-center justify-between py-3 text-sm">
                <span className="font-medium text-ink-900">{s.name}</span>
                <span className="text-ink-500">{s.year}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </Layout>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-ink-500">
        {icon} {label}
      </dt>
      <dd className="font-medium text-ink-900 text-right">{value}</dd>
    </div>
  );
}
