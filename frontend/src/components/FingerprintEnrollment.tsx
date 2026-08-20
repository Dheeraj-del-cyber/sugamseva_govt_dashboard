import { useState, useEffect } from "react";
import {
  Fingerprint,
  CheckCircle2,
  Cpu,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Usb,
} from "lucide-react";
import {
  captureFromSensor,
  getAvailableSensors,
  SensorInfo,
  EnrolledFinger,
} from "../lib/biometricSensor";

const FINGER_OPTIONS = [
  { name: "Right Thumb", hand: "Right" as const },
  { name: "Right Index", hand: "Right" as const },
  { name: "Right Middle", hand: "Right" as const },
  { name: "Left Thumb", hand: "Left" as const },
  { name: "Left Index", hand: "Left" as const },
  { name: "Left Middle", hand: "Left" as const },
];

interface Props {
  onEnrollmentComplete: (fingers: EnrolledFinger[]) => void;
  userHint?: string;
  initialFingers?: EnrolledFinger[];
}

export default function FingerprintEnrollment({
  onEnrollmentComplete,
  userHint = "citizen",
  initialFingers,
}: Props) {
  const [sensors, setSensors] = useState<SensorInfo[]>([]);
  const [selectedSensor, setSelectedSensor] = useState("webauthn");

  const [finger1, setFinger1] = useState<EnrolledFinger | null>(
    initialFingers?.find((f) => f.finger_index === 1) || null
  );
  const [finger2, setFinger2] = useState<EnrolledFinger | null>(
    initialFingers?.find((f) => f.finger_index === 2) || null
  );

  const [finger1Name, setFinger1Name] = useState("Right Thumb");
  const [finger2Name, setFinger2Name] = useState("Left Thumb");

  const [scanningSlot, setScanningSlot] = useState<1 | 2 | null>(null);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    getAvailableSensors().then((list) => {
      setSensors(list);
      if (list.length > 0) setSelectedSensor(list[0].id);
    });
  }, []);

  const handleScan = async (slot: 1 | 2) => {
    setScanningSlot(slot);
    setScanProgress(10);

    const interval = setInterval(() => {
      setScanProgress((p) => (p < 90 ? p + 25 : p));
    }, 120);

    try {
      const fName = slot === 1 ? finger1Name : finger2Name;
      const hand = fName.toLowerCase().includes("left") ? ("Left" as const) : ("Right" as const);

      const res = await captureFromSensor(selectedSensor, fName, hand, userHint);
      clearInterval(interval);
      setScanProgress(100);

      const enrolled: EnrolledFinger = {
        finger_index: slot,
        finger_name: fName,
        hand: hand,
        capture_token: res.capture_token,
        credential_id: res.credential_id,
        quality_score: res.quality_score,
        sensor_type: res.sensor_type,
        preview_hash: res.preview_hash,
      };

      if (slot === 1) {
        setFinger1(enrolled);
        if (finger2) onEnrollmentComplete([enrolled, finger2]);
      } else {
        setFinger2(enrolled);
        if (finger1) onEnrollmentComplete([finger1, enrolled]);
      }
    } catch (err) {
      console.error("Scan error:", err);
    } finally {
      setTimeout(() => {
        setScanningSlot(null);
        setScanProgress(0);
      }, 400);
    }
  };

  const isComplete = Boolean(finger1 && finger2);

  return (
    <div className="space-y-4">
      {/* Sensor Selection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-ink-100/60 border border-ink-100">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-700">
          <Cpu size={15} style={{ color: "var(--color-gov-blue-600)" }} />
          <span>Biometric Sensor Interface:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sensors.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelectedSensor(s.id)}
              className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                selectedSensor === s.id
                  ? "bg-navy-900 text-white shadow-xs"
                  : "bg-white text-ink-700 hover:bg-ink-100 border border-ink-200"
              }`}
              style={selectedSensor === s.id ? { backgroundColor: "var(--color-navy-900)" } : {}}
            >
              {s.id === "webauthn" ? <Fingerprint size={12} /> : s.id === "rd_service" ? <Usb size={12} /> : <Sparkles size={12} />}
              {s.name.split("/")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory 2-Finger Enrollment Slots */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Slot 1: Primary Finger */}
        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            finger1
              ? "border-green-500/40 bg-green-50/40"
              : scanningSlot === 1
              ? "border-gov-blue-500 bg-gov-blue-50/20 shadow-md"
              : "border-ink-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center bg-navy-900 text-white" style={{ backgroundColor: "var(--color-navy-900)" }}>
                1
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
                Primary Finger
              </span>
            </div>
            {finger1 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle2 size={12} /> {Math.round(finger1.quality_score * 100)}% Quality
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-ink-500 block mb-1">Select Finger</label>
              <select
                value={finger1Name}
                onChange={(e) => {
                  setFinger1Name(e.target.value);
                  setFinger1(null);
                }}
                disabled={scanningSlot === 1}
                className="w-full text-xs font-medium rounded-lg border px-2.5 py-2 outline-none bg-white"
                style={{ borderColor: "var(--color-ink-300)" }}
              >
                {FINGER_OPTIONS.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.name} ({opt.hand} Hand)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-ink-100/50 flex items-center gap-3">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  finger1
                    ? "bg-green-100 text-green-600"
                    : scanningSlot === 1
                    ? "bg-gov-blue-100 text-gov-blue-600 animate-pulse"
                    : "bg-white text-ink-400 border border-ink-200"
                }`}
              >
                <Fingerprint size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-900 truncate">
                  {finger1 ? finger1.finger_name : "Ready to Capture"}
                </p>
                <p className="text-[11px] text-ink-500 truncate">
                  {finger1 ? finger1.preview_hash : "Place finger firmly on scanner"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleScan(1)}
                disabled={scanningSlot !== null}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50"
                style={
                  finger1
                    ? { borderColor: "var(--color-green-600)", color: "var(--color-green-700)", backgroundColor: "white" }
                    : { backgroundColor: "var(--color-gov-blue-600)", color: "white" }
                }
              >
                {scanningSlot === 1 ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw size={12} className="animate-spin" /> {scanProgress}%
                  </span>
                ) : finger1 ? (
                  "Re-scan"
                ) : (
                  "Scan Finger"
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Slot 2: Secondary Finger */}
        <div
          className={`p-4 rounded-xl border-2 transition-all ${
            finger2
              ? "border-green-500/40 bg-green-50/40"
              : scanningSlot === 2
              ? "border-gov-blue-500 bg-gov-blue-50/20 shadow-md"
              : "border-ink-200 bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center bg-navy-900 text-white" style={{ backgroundColor: "var(--color-navy-900)" }}>
                2
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
                Secondary Finger
              </span>
            </div>
            {finger2 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle2 size={12} /> {Math.round(finger2.quality_score * 100)}% Quality
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-ink-500 block mb-1">Select Finger</label>
              <select
                value={finger2Name}
                onChange={(e) => {
                  setFinger2Name(e.target.value);
                  setFinger2(null);
                }}
                disabled={scanningSlot === 2}
                className="w-full text-xs font-medium rounded-lg border px-2.5 py-2 outline-none bg-white"
                style={{ borderColor: "var(--color-ink-300)" }}
              >
                {FINGER_OPTIONS.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.name} ({opt.hand} Hand)
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-lg bg-ink-100/50 flex items-center gap-3">
              <div
                className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                  finger2
                    ? "bg-green-100 text-green-600"
                    : scanningSlot === 2
                    ? "bg-gov-blue-100 text-gov-blue-600 animate-pulse"
                    : "bg-white text-ink-400 border border-ink-200"
                }`}
              >
                <Fingerprint size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-ink-900 truncate">
                  {finger2 ? finger2.finger_name : "Ready to Capture"}
                </p>
                <p className="text-[11px] text-ink-500 truncate">
                  {finger2 ? finger2.preview_hash : "Place secondary finger firmly on scanner"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleScan(2)}
                disabled={scanningSlot !== null}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0 disabled:opacity-50"
                style={
                  finger2
                    ? { borderColor: "var(--color-green-600)", color: "var(--color-green-700)", backgroundColor: "white" }
                    : { backgroundColor: "var(--color-gov-blue-600)", color: "white" }
                }
              >
                {scanningSlot === 2 ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw size={12} className="animate-spin" /> {scanProgress}%
                  </span>
                ) : finger2 ? (
                  "Re-scan"
                ) : (
                  "Scan Finger"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dual Enrollment Confirmation Badge */}
      <div
        className={`flex items-center gap-2.5 p-3 rounded-xl text-xs transition-all ${
          isComplete
            ? "bg-green-100/80 text-green-900 font-medium"
            : "bg-ink-100 text-ink-600"
        }`}
      >
        <ShieldCheck size={16} className={isComplete ? "text-green-600" : "text-ink-400"} />
        <span>
          {isComplete
            ? "Dual-finger biometric enrollment complete. Citizen can authenticate with either finger."
            : "Government standard requires 2 distinct fingers enrolled per citizen."}
        </span>
      </div>
    </div>
  );
}
