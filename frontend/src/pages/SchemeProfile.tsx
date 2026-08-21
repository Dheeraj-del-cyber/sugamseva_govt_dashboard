import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Landmark,
  CalendarDays,
  Layers,
  Tags,
  Users,
  CheckCircle2,
  Info,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card } from "../components/UI";
import { api } from "../api/client";

interface SchemeProfile {
  id: string;
  code?: string;
  name: string;
  government_level?: string;
  scheme_type?: string;
  ministry?: string;
  year_of_launch?: string;
  source_sector?: string;
  source_summary?: string;
  source?: string;
  problem_category?: string;
  problem_mapping_note?: string;
  candidate_documents: string[];
  document_mapping_note?: string;
  data_source?: string;
  applied_count: number;
  used_count: number;
}

export default function SchemeProfile() {
  const { schemeId } = useParams();
  const [scheme, setScheme] = useState<SchemeProfile | null>(null);

  useEffect(() => {
    if (!schemeId) return;
    api.get(`/scheme-list/${schemeId}`).then(({ data }) => setScheme(data));
  }, [schemeId]);

  if (!scheme) {
    return (
      <Layout title="Scheme Profile" backTo={{ to: "/scheme-list", label: "Back to List of Schemes" }}>
        <p className="text-center text-ink-500 py-12">Loading...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Scheme Profile" backTo={{ to: "/scheme-list", label: "Back to List of Schemes" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6 text-center">
          {scheme.code && (
            <span
              className="inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2"
              style={{ backgroundColor: "var(--color-gov-blue-100)", color: "var(--color-gov-blue-700)" }}
            >
              {scheme.code}
            </span>
          )}
          <h2 className="font-display text-2xl font-bold text-ink-900">{scheme.name}</h2>
          {scheme.source_summary && (
            <p className="text-sm text-ink-500 mt-3 max-w-2xl mx-auto leading-relaxed">{scheme.source_summary}</p>
          )}
        </Card>

        {/* Applied / used counts */}
        <div className="grid sm:grid-cols-2 gap-4">
          <StatBlock label="No of People Applied" value={scheme.applied_count} accent="blue" />
          <StatBlock label="People Who Used" value={scheme.used_count} accent="green" />
        </div>

        {/* Core scheme details */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Scheme Details</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <DetailRow icon={Landmark} label="Lead Ministry" value={scheme.ministry} />
            <DetailRow icon={Layers} label="Government Level" value={scheme.government_level} />
            <DetailRow icon={Tags} label="Scheme Type" value={scheme.scheme_type} />
            <DetailRow icon={CalendarDays} label="Year of Launch" value={scheme.year_of_launch} />
            <DetailRow icon={Tags} label="Sector" value={scheme.source_sector} />
          </div>
        </Card>

        {/* Eligibility criteria */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4 flex items-center gap-2">
            <CheckCircle2 size={16} style={{ color: "var(--color-green-600)" }} />
            Eligibility Criteria
          </h3>

          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
              Problem Category
            </p>
            {scheme.problem_category ? (
              <span
                className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "var(--color-gov-blue-100)", color: "var(--color-gov-blue-700)" }}
              >
                {scheme.problem_category}
              </span>
            ) : (
              <p className="text-sm text-ink-500">Not specified</p>
            )}
            {scheme.problem_mapping_note && (
              <p className="text-xs text-ink-500 mt-2 flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0" />
                {scheme.problem_mapping_note}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
              Candidate Documents Required
            </p>
            {scheme.candidate_documents.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {scheme.candidate_documents.map((doc) => (
                  <span
                    key={doc}
                    className="text-xs font-medium px-2.5 py-1 rounded-full border"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  >
                    {doc}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">Not specified</p>
            )}
            {scheme.document_mapping_note && (
              <p className="text-xs text-ink-500 mt-3 flex items-start gap-1.5">
                <Info size={13} className="mt-0.5 shrink-0" />
                {scheme.document_mapping_note}
              </p>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--color-gov-blue-100)", color: "var(--color-gov-blue-600)" }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm font-semibold text-ink-900 break-words">{value || "Not specified"}</p>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "blue" | "green";
}) {
  const color = accent === "green" ? "var(--color-green-600)" : "var(--color-gov-blue-600)";
  const bg = accent === "green" ? "var(--color-green-100)" : "var(--color-gov-blue-100)";
  return (
    <Card className="p-5">
      <div className="h-10 w-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: bg, color }}>
        <Users size={18} />
      </div>
      <p className="text-2xl font-display font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500 mt-1">{label}</p>
    </Card>
  );
}