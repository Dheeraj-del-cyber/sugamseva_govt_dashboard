import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Fingerprint, Eye, EyeOff, ShieldCheck, Globe } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [govtId, setGovtId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

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
      setError("Enter your Government ID first, then verify using fingerprint");
      return;
    }
    setBioLoading(true);
    setError("");
    try {
      const { data } = await api.post(`/auth/login-biometric`, null, { params: { govt_id: govtId } });
      localStorage.setItem("sugamseva_token", data.access_token);
      localStorage.setItem("sugamseva_official", JSON.stringify(data.official));
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Biometric verification failed");
    } finally {
      setBioLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ backgroundColor: "var(--color-paper)" }}>
      {/* Branding panel */}
      <div
        className="lg:w-[42%] relative flex flex-col justify-between px-8 sm:px-12 py-12 text-white overflow-hidden"
        style={{ backgroundColor: "var(--color-navy-900)" }}
      >
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full opacity-10"
          style={{ backgroundColor: "var(--color-saffron-500)" }}
        />
        <div
          className="pointer-events-none absolute top-1/3 -right-20 h-64 w-64 rounded-full opacity-10"
          style={{ backgroundColor: "var(--color-green-600)" }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-white/10 flex items-center justify-center">
              <ShieldCheck size={22} style={{ color: "var(--color-saffron-500)" }} />
            </div>
            <p className="text-sm font-medium text-white/70">Government of India</p>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-extrabold mt-10 leading-tight">
            Sugam Seva
          </h1>
          <p className="mt-3 text-white/70 max-w-sm">
            Digital Citizen Assistant for multilingual access to government services and schemes.
          </p>

          <div className="tricolor-rule w-24 rounded-full mt-8" />
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/50">
          <Fingerprint size={16} />
          Biometric-secured official access
        </div>
      </div>

      {/* Sign in card */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex items-center justify-end mb-6">
            <button className="flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-ink-900">
              <Globe size={14} /> English
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold text-ink-900">Welcome Back!</h2>
          <p className="text-sm text-ink-500 mt-1">Sign in to continue to the official dashboard</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-ink-700">Government ID</span>
              <input
                value={govtId}
                onChange={(e) => setGovtId(e.target.value)}
                placeholder="GOV-IN-XXXXXX"
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
              <p className="text-xs font-medium px-3 py-2 rounded-lg" style={{ backgroundColor: "var(--color-red-100)", color: "var(--color-red-600)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--color-gov-blue-600)" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: "var(--color-ink-300)" }}>
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "var(--color-gov-blue-100)", color: "var(--color-gov-blue-600)" }}
            >
              <Fingerprint size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">Biometric Authentication</p>
              <p className="text-xs text-ink-500">Verify using fingerprint</p>
            </div>
            <button
              onClick={handleBiometricLogin}
              disabled={bioLoading}
              className="text-xs font-semibold px-3 py-2 rounded-lg border disabled:opacity-50"
              style={{ borderColor: "var(--color-gov-blue-600)", color: "var(--color-gov-blue-600)" }}
            >
              {bioLoading ? "Verifying..." : "Verify"}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-ink-500">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
              Sign Up
            </Link>
          </p>

          <p className="mt-10 text-center text-[11px] text-ink-500">
            &copy; Government of India 2026. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
