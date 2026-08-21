import { useState } from "react";
import {
  Fingerprint,
  CheckCircle2,
  X,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { captureFromSensor } from "../lib/biometricSensor";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (verificationToken: string, matchedFinger: string) => void;
  subjectType: "citizen" | "official";
  subjectId: string;
  title?: string;
  description?: string;
}

export default function BiometricVerifyModal({
  isOpen,
  onClose,
  onSuccess,
  subjectType,
  subjectId,
  title = "Biometric Fingerprint Authentication",
  description = "Place either enrolled finger (Right Thumb or Left Thumb) on the biometric sensor.",
}: Props) {
  const [selectedFingerIndex, setSelectedFingerIndex] = useState<1 | 2>(1);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [successInfo, setSuccessInfo] = useState<{ matched: string; score: number } | null>(null);

  if (!isOpen) return null;

  const handleScanAndVerify = async () => {
    setScanning(true);
    setError("");
    setProgress(15);

    const timer = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 20 : p));
    }, 100);

    try {
      const fingerName = selectedFingerIndex === 1 ? "Right Thumb" : "Left Thumb";
      const hand = selectedFingerIndex === 1 ? "Right" : "Left";

      // 1. Capture live sensor reading
      const sensorRes = await captureFromSensor("touch_sensor", fingerName, hand, subjectType);
      clearInterval(timer);
      setProgress(100);

      // 2. Verify with backend
      const { data } = await api.post("/biometric/verify", {
        subject_type: subjectType,
        subject_id: subjectId,
        finger_index: selectedFingerIndex,
        live_token: sensorRes.capture_token,
      });

      setSuccessInfo({
        matched: data.matched_finger_name || fingerName,
        score: Math.round((data.quality_score || 0.95) * 100),
      });

      setTimeout(() => {
        onSuccess(data.verification_token, data.matched_finger_name || fingerName);
        onClose();
        setScanning(false);
        setSuccessInfo(null);
      }, 700);
    } catch (err: any) {
      clearInterval(timer);
      setError(err?.response?.data?.detail || "Biometric fingerprint verification failed. Try again.");
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-ink-100 overflow-hidden relative animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-5 pb-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-navy-900 text-white" style={{ backgroundColor: "var(--color-navy-900)" }}>
              <ShieldCheck size={16} style={{ color: "var(--color-saffron-500)" }} />
            </div>
            <h3 className="font-display font-bold text-ink-900 text-base">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-ink-500">{description}</p>

          {/* Finger Choice */}
          <div className="flex gap-2 p-1 rounded-xl bg-ink-100 border border-ink-200">
            <button
              type="button"
              onClick={() => setSelectedFingerIndex(1)}
              className={`flex-1 text-xs py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                selectedFingerIndex === 1
                  ? "bg-white text-navy-900 shadow-xs"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              <Fingerprint size={14} /> Primary (Right Thumb)
            </button>
            <button
              type="button"
              onClick={() => setSelectedFingerIndex(2)}
              className={`flex-1 text-xs py-2 px-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 ${
                selectedFingerIndex === 2
                  ? "bg-white text-navy-900 shadow-xs"
                  : "text-ink-600 hover:text-ink-900"
              }`}
            >
              <Fingerprint size={14} /> Secondary (Left Thumb)
            </button>
          </div>

          {/* Sensor Visualizer Target */}
          <div className="p-6 rounded-2xl border border-ink-200 bg-linear-to-b from-ink-50 to-white flex flex-col items-center text-center">
            <div
              className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all ${
                successInfo
                  ? "bg-green-100 text-green-600 ring-4 ring-green-200"
                  : scanning
                  ? "bg-gov-blue-100 text-gov-blue-600 ring-4 ring-gov-blue-200 animate-pulse"
                  : "bg-ink-100 text-ink-400 hover:bg-gov-blue-50 hover:text-gov-blue-600 cursor-pointer"
              }`}
              onClick={!scanning && !successInfo ? handleScanAndVerify : undefined}
            >
              {successInfo ? (
                <CheckCircle2 size={42} className="animate-in zoom-in" />
              ) : (
                <Fingerprint size={46} className={scanning ? "animate-pulse" : ""} />
              )}
            </div>

            <p className="font-display font-bold text-sm text-ink-900 mt-4">
              {successInfo
                ? `Verified: ${successInfo.matched} (${successInfo.score}% Match)`
                : scanning
                ? `Scanning Sensor... (${progress}%)`
                : "Touch sensor or click to scan"}
            </p>
            <p className="text-[11px] text-ink-500 mt-0.5">
              {successInfo
                ? "Authorization unlocked successfully"
                : "Hardware sensor ready (Windows Hello / Touch ID / STQC RD Scanner)"}
            </p>
          </div>

          {error && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200">
              {error}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-ink-200 text-xs font-semibold text-ink-700 hover:bg-ink-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleScanAndVerify}
              disabled={scanning || Boolean(successInfo)}
              className="flex-[2] py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--color-gov-blue-600)" }}
            >
              {scanning ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Verifying Sensor...
                </>
              ) : successInfo ? (
                "Verified!"
              ) : (
                <>
                  <Fingerprint size={14} /> Scan &amp; Authenticate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}