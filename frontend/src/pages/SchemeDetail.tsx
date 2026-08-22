import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Users, Send } from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton } from "../components/UI";
import { api } from "../api/client";

interface SchemeDetail {
  id: string;
  name: string;
  summary?: string;
  eligible_not_applied: number;
  used_count: number;
  missed_count: number;
}
interface PersonRow {
  id: string;
  full_name: string;
  phone_number?: string;
  year?: number;
}

type PanelKind = "eligible" | "used" | "missed" | null;

export default function SchemeDetail() {
  const { schemeId } = useParams();
  const [scheme, setScheme] = useState<SchemeDetail | null>(null);
  const [panel, setPanel] = useState<PanelKind>(null);
  const [panelRows, setPanelRows] = useState<PersonRow[]>([]);
  const [applying, setApplying] = useState(false);

  const load = () => {
    if (!schemeId) return;
    api.get(`/schemes/${schemeId}`).then(({ data }) => setScheme(data));
  };
  useEffect(load, [schemeId]);

  const openPanel = async (kind: PanelKind) => {
    setPanel(kind);
    if (!schemeId || !kind) return;
    const endpoint = kind === "eligible" ? "eligible-not-applied" : kind;
    const { data } = await api.get(`/schemes/${schemeId}/${endpoint}`);
    setPanelRows(data);
  };

  const handleApplyAll = async () => {
    setApplying(true);
    try {
      await api.post(`/schemes/${schemeId}/apply`, { citizen_ids: [] });
      load();
      if (panel === "eligible") openPanel("eligible");
    } finally {
      setApplying(false);
    }
  };

  const handleApplySelected = async (citizenId: string) => {
    await api.post(`/schemes/${schemeId}/apply`, { citizen_ids: [citizenId] });
    load();
    openPanel("eligible");
  };

  if (!scheme) {
    return (
      <Layout title="Scheme Details" backTo={{ to: "/schemes", label: "Back to Schemes" }}>
        <p className="text-center text-ink-500 py-12">Loading...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Scheme Details" backTo={{ to: "/schemes", label: "Back to Schemes" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 text-center">
          <h2 className="font-display text-2xl font-bold text-ink-900">{scheme.name}</h2>
          <p className="text-sm text-ink-500 mt-3 max-w-2xl mx-auto leading-relaxed">{scheme.summary}</p>
        </Card>

        <div className="grid sm:grid-cols-3 gap-4">
          <StatButton
            label="Eligible, Not Applied"
            value={scheme.eligible_not_applied}
            accent="blue"
            onClick={() => openPanel("eligible")}
          />
          <StatButton label="People Who Used" value={scheme.used_count} accent="green" onClick={() => openPanel("used")} />
          <StatButton label="People Who Missed" value={scheme.missed_count} accent="saffron" onClick={() => openPanel("missed")} />
        </div>

        {panel && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-ink-900">
                {panel === "eligible" && "Eligible &amp; Not Applied"}
                {panel === "used" && "People Who Used This Scheme"}
                {panel === "missed" && "People Who Missed This Scheme"}
              </h3>
              {panel === "eligible" && (
                <PrimaryButton type="button" onClick={handleApplyAll} disabled={applying}>
                  <Users size={15} /> {applying ? "Applying..." : "Apply to All"}
                </PrimaryButton>
              )}
            </div>

            <div className="space-y-2">
              {panelRows.map((row) => (
                <div key={row.id} className="rounded-lg border p-3" style={{ borderColor: "var(--color-ink-300)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{row.full_name}</p>
                      {row.phone_number && <p className="text-xs text-ink-500">{row.phone_number}</p>}
                      {row.year && <p className="text-xs text-ink-500">Year: {row.year}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {panel === "eligible" && (
                        <SecondaryButton type="button" onClick={() => handleApplySelected(row.id)}>
                          <Send size={13} /> Apply
                        </SecondaryButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {panelRows.length === 0 && <p className="text-sm text-ink-500 py-4 text-center">No records to show.</p>}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function StatButton({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  accent: "blue" | "green" | "saffron";
  onClick: () => void;
}) {
  const color =
    accent === "green" ? "var(--color-green-600)" : accent === "saffron" ? "var(--color-saffron-500)" : "var(--color-gov-blue-600)";
  const bg =
    accent === "green" ? "var(--color-green-100)" : accent === "saffron" ? "var(--color-saffron-100)" : "var(--color-gov-blue-100)";
  return (
    <button onClick={onClick} className="text-left rounded-2xl border border-ink-100 shadow-sm p-5 bg-white hover:shadow-md transition-shadow">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: bg, color }}>
        <Users size={18} />
      </div>
      <p className="text-2xl font-display font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500 mt-1">{label}</p>
    </button>
  );
}
