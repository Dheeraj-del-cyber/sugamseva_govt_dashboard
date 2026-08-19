import { useState } from "react";
import { Pencil, Save, Fingerprint, LogOut, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton, TextField, StatusPill } from "../components/UI";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function OfficialProfile() {
  const { official, setOfficial, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: official?.full_name ?? "",
    phone_number: official?.phone_number ?? "",
    email: official?.email ?? "",
    address: official?.address ?? "",
  });
  const [saving, setSaving] = useState(false);

  const [pwd, setPwd] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const [reregistering, setReregistering] = useState(false);
  const [reregDone, setReregDone] = useState(false);

  if (!official) return null;

  const initials = official.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/officials/me", form);
      setOfficial(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg("");
    setPwdSaving(true);
    try {
      await api.post("/officials/me/change-password", pwd);
      setPwdMsg("Password updated successfully.");
      setPwd({ current_password: "", new_password: "", confirm_password: "" });
    } catch (err: any) {
      setPwdMsg(err?.response?.data?.detail || "Could not update password");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleReregisterFingerprint = async () => {
    setReregistering(true);
    try {
      const { data: capture } = await api.post("/biometric/capture", null, { params: { subject_hint: "official" } });
      await api.post("/officials/me/re-register-fingerprint", null, {
        params: { fingerprint_capture_token: capture.fingerprint_capture_token },
      });
      setReregDone(true);
    } finally {
      setReregistering(false);
    }
  };

  return (
    <Layout title="Government Official Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-6 text-center relative">
          <button
            onClick={() => setEditing((v) => !v)}
            className="absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--color-gov-blue-600)" }}
          >
            <Pencil size={13} /> {editing ? "Cancel" : "Edit Profile"}
          </button>

          <div
            className="h-20 w-20 rounded-full mx-auto flex items-center justify-center text-2xl font-display font-bold text-white"
            style={{ backgroundColor: "var(--color-navy-800)" }}
          >
            {initials}
          </div>
          <h2 className="font-display text-xl font-bold text-ink-900 mt-4">{official.full_name}</h2>
          <p className="text-sm text-ink-500">{official.govt_id}</p>
          <div className="mt-3">
            <StatusPill status="verified" />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Details</h3>
          {editing ? (
            <div className="space-y-4">
              <TextField label="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <TextField label="Phone Number" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              <TextField label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <TextField label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <PrimaryButton type="button" onClick={handleSave} disabled={saving} className="w-full">
                <Save size={15} /> {saving ? "Saving..." : "Save Changes"}
              </PrimaryButton>
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              <Row label="Phone Number" value={official.phone_number} />
              <Row label="Email" value={official.email || "—"} />
              <Row label="Address" value={official.address || "—"} />
            </dl>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Biometric</h3>
          <div className="flex items-center gap-4">
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: reregDone ? "var(--color-green-100)" : "var(--color-gov-blue-100)" }}
            >
              {reregDone ? (
                <CheckCircle2 size={20} style={{ color: "var(--color-green-600)" }} />
              ) : (
                <Fingerprint size={20} style={{ color: "var(--color-gov-blue-600)" }} />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">Re-register Fingerprint</p>
              <p className="text-xs text-ink-500">Update your stored biometric template</p>
            </div>
            <SecondaryButton type="button" onClick={handleReregisterFingerprint} disabled={reregistering}>
              {reregistering ? "Capturing..." : reregDone ? "Updated" : "Re-register"}
            </SecondaryButton>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Change Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Current Password</span>
              <input
                type="password"
                required
                value={pwd.current_password}
                onChange={(e) => setPwd({ ...pwd, current_password: e.target.value })}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">New Password</span>
              <input
                type="password"
                required
                value={pwd.new_password}
                onChange={(e) => setPwd({ ...pwd, new_password: e.target.value })}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Re-enter Password</span>
              <input
                type="password"
                required
                value={pwd.confirm_password}
                onChange={(e) => setPwd({ ...pwd, confirm_password: e.target.value })}
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
            </label>
            {pwdMsg && <p className="text-xs font-medium" style={{ color: "var(--color-green-600)" }}>{pwdMsg}</p>}
            <PrimaryButton type="submit" disabled={pwdSaving} className="w-full">
              {pwdSaving ? "Updating..." : "Update Password"}
            </PrimaryButton>
          </form>
        </Card>

        <SecondaryButton
          type="button"
          className="w-full"
          onClick={() => {
            logout();
            navigate("/signin");
          }}
        >
          <LogOut size={15} /> Logout
        </SecondaryButton>
      </div>
    </Layout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  );
}
