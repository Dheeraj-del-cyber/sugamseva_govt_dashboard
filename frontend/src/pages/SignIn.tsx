import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { captureFromSensor } from "../lib/biometricSensor";
import sugamSevaBanner from "../assets/sugam-seva-banner.png";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [govtId, setGovtId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(govtId, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Invalid Government ID or password");
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!govtId) {
      setError("Please enter your Government ID (e.g. GOV-IN-100234) first, then verify via fingerprint");
      return;
    }
    setBioLoading(true);
    setError("");
    try {
      // 1. Capture live sensor read
      await captureFromSensor("webauthn", "Right Thumb", "Right", "official");

      // 2. Call backend
      const { data } = await api.post("/auth/login-biometric", null, { params: { govt_id: govtId } });
      setBioSuccess(true);
      localStorage.setItem("sugamseva_token", data.access_token);
      localStorage.setItem("sugamseva_official", JSON.stringify(data.official));

      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Biometric authentication failed. Ensure you are registered.");
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: "var(--color-paper)" }}>
      {/* Branding panel */}
      <div
        className="lg:w-[42%] relative overflow-hidden"
        style={{ backgroundColor: "var(--color-navy-900)" }}
      >
        {/* Background artwork */}
        <img
          src={sugamSevaBanner}
          alt="Sugam Seva - Digital Citizen Assistant"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Sign in card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-bold text-ink-900">Government Portal Sign In</h2>
          <p className="text-sm text-ink-500 mt-1">Official Dashboard for Service Delivery &amp; Civic Governance</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Government ID</span>
              <input
                value={govtId}
                onChange={(e) => setGovtId(e.target.value)}
                placeholder="e.g. GOV-IN-100234"
                required
                className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Password</span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-lg border px-3 py-2.5 pr-10 text-sm outline-none focus:border-gov-blue-500"
                  style={{ borderColor: "var(--color-ink-300)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-500"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-gov-blue-600)" }}
            >
              {loading ? "Signing in..." : "Sign In with Credentials"}
            </button>
          </form>

          {/* Biometric Instant Authentication */}
          <div className="mt-6 rounded-2xl border border-ink-200 p-4 bg-ink-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                  bioSuccess
                    ? "bg-green-100 text-green-700"
                    : "bg-gov-blue-100 text-gov-blue-700"
                }`}
              >
                {bioSuccess ? <CheckCircle2 size={22} /> : <Fingerprint size={22} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink-900">Biometric Sensor Login</p>
                <p className="text-[11px] text-ink-500">Windows Hello / Touch ID / STQC Device</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={bioLoading || bioSuccess}
              className="text-xs font-bold px-3.5 py-2 rounded-lg border border-gov-blue-600 text-gov-blue-700 bg-white hover:bg-gov-blue-50 disabled:opacity-50 transition-colors shrink-0"
            >
              {bioLoading ? (
                <span className="flex items-center gap-1">
                  <RefreshCw size={12} className="animate-spin" /> Verifying...
                </span>
              ) : bioSuccess ? (
                "Verified!"
              ) : (
                "Verify Finger"
              )}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
              Sign Up
            </Link>
          </p>

          <p className="mt-8 text-center text-[11px] text-ink-400">
            Demo Government IDs: <span className="font-mono text-ink-700 font-bold">GOV-IN-100234</span>, <span className="font-mono text-ink-700 font-bold">GOV-IN-100235</span> (Pass: <span className="font-mono font-bold">Password@123</span>)
          </p>
        </div>
      </div>
    </div>
  );
}