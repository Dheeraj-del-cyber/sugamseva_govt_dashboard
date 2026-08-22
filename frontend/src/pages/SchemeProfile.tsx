import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Landmark,
  CalendarDays,
  Layers,
  Tags,
  Users,
  CheckCircle2,
  Info,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Send,
  AlertCircle,
  Clock,
  Ban,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton } from "../components/UI";
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
  missed_count: number;
  eligible_count: number;
  application_start_date?: string;
  application_end_date?: string;
  apply_url?: string;
  is_open?: boolean;
  status?: "open" | "closed" | "upcoming";
  status_label?: string;
  days_remaining?: number;
}

interface PersonRow {
  id: string;
  full_name: string;
  phone_number?: string;
  year?: number;
}

type PanelKind = "missed" | "applied" | "used" | null;

export default function SchemeProfile() {
  const { schemeId } = useParams();
  const [scheme, setScheme] = useState<SchemeProfile | null>(null);
  const [panel, setPanel] = useState<PanelKind>("missed");
  const [panelRows, setPanelRows] = useState<PersonRow[]>([]);
  const [loadingPanel, setLoadingPanel] = useState(false);
  const [suggestion, setSuggestion] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  const loadScheme = () => {
    if (!schemeId) return;
    api.get(`/scheme-list/${schemeId}`).then(({ data }) => {
      setScheme(data);
      // Auto-open missed panel if scheme is closed
      if (data.status === "closed" || !data.is_open) {
        setPanel("missed");
      }
    });
  };

  useEffect(() => {
    loadScheme();
  }, [schemeId]);

  const loadPanelData = async (kind: PanelKind) => {
    if (!schemeId || !kind) return;
    setLoadingPanel(true);
    try {
      const { data } = await api.get(`/scheme-list/${schemeId}/${kind}`);
      setPanelRows(data);
    } catch {
      setPanelRows([]);
    } finally {
      setLoadingPanel(false);
    }
  };

  useEffect(() => {
    if (panel) {
      loadPanelData(panel);
    }
  }, [schemeId, panel]);

  const openPanel = (kind: PanelKind) => {
    if (panel === kind) {
      setPanel(null);
    } else {
      setPanel(kind);
    }
  };

  const copyApplyLink = () => {
    if (!scheme?.apply_url) return;
    navigator.clipboard.writeText(scheme.apply_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApplyCitizen = async (citizenId?: string) => {
    if (!schemeId) return;
    if (scheme && (scheme.status === "closed" || !scheme.is_open)) {
      setApplyError(`Applications are closed for this scheme (deadline was ${scheme.application_end_date}).`);
      setTimeout(() => setApplyError(null), 4000);
      return;
    }

    setApplying(true);
    setApplySuccess(null);
    setApplyError(null);
    try {
      const payload = citizenId ? { citizen_ids: [citizenId] } : { citizen_ids: [] };
      const { data } = await api.post(`/scheme-list/${schemeId}/apply`, payload);
      setApplySuccess(`Successfully applied for ${data.applied_count || 1} citizen(s).`);
      loadScheme();
      if (panel) loadPanelData(panel);
      setTimeout(() => setApplySuccess(null), 4000);
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Application could not be processed.";
      setApplyError(errorMsg);
      setTimeout(() => setApplyError(null), 4000);
    } finally {
      setApplying(false);
    }
  };

  const fetchSuggestion = async (citizenId: string) => {
    if (!schemeId) return;
    try {
      const { data } = await api.get(`/scheme-list/${schemeId}/ai-suggestions`, {
        params: { citizen_id: citizenId },
      });
      setSuggestion((prev) => ({ ...prev, [citizenId]: data.suggestion }));
    } catch {
      setSuggestion((prev) => ({
        ...prev,
        [citizenId]: "Unable to generate suggestion at this time. Verify citizen documents on official portal.",
      }));
    }
  };

  if (!scheme) {
    return (
      <Layout title="Scheme Profile" backTo={{ to: "/scheme-list", label: "Back to List of Schemes" }}>
        <p className="text-center text-ink-500 py-12">Loading...</p>
      </Layout>
    );
  }

  const isClosed = scheme.status === "closed" || scheme.is_open === false;
  const applyLink = scheme.apply_url || "https://www.myscheme.gov.in/";
  const startDate = scheme.application_start_date || "01 Apr 2025";
  const endDate = scheme.application_end_date || "31 Mar 2026";

  return (
    <Layout title="Scheme Profile" backTo={{ to: "/scheme-list", label: "Back to List of Schemes" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Scheme Header */}
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

          {/* Application Window & Status Banner */}
          <div className="mt-4 pt-4 border-t border-ink-100 flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-ink-700 bg-ink-100/70 px-3 py-1.5 rounded-lg">
              <Clock size={14} style={{ color: "var(--color-gov-blue-600)" }} />
              <span className="font-medium">Application Window:</span>
              <span className="font-semibold text-ink-900">{startDate} – {endDate}</span>
            </div>

            {isClosed ? (
              <div className="flex items-center gap-1.5 text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-full font-semibold">
                <span className="h-2 w-2 rounded-full bg-red-600"></span>
                Scheme Closed (Deadline Passed: {endDate})
              </div>
            ) : scheme.status === "upcoming" ? (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full font-semibold">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                Upcoming (Opens on {startDate})
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Applications Open (Closes {endDate})
              </div>
            )}
          </div>
        </Card>

        {/* Closed Scheme Alert Notice */}
        {isClosed && (
          <div className="p-4 rounded-xl border border-red-200 bg-red-50/80 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs text-red-900">
              <p className="font-bold text-sm text-red-950">Application Period Completed</p>
              <p className="mt-1 leading-relaxed">
                The application deadline for this scheme closed on <strong>{endDate}</strong>. New applications cannot be submitted.
                Below is the list of eligible citizens who <strong>missed this scheme</strong> and did not receive the benefit in time. Use the AI suggestions to recommend available alternative schemes.
              </p>
            </div>
          </div>
        )}

        {/* Official Application Portal / Apply Link Card (from PDF) */}
        <Card
          className="p-5 border-2"
          style={{
            borderColor: isClosed ? "var(--color-ink-300)" : "var(--color-gov-blue-300)",
            backgroundColor: isClosed ? "var(--color-ink-100)" : "var(--color-gov-blue-50)",
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gov-blue-700">Official Portal Link</span>
                {isClosed && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                    Archived Portal
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-ink-900 truncate">
                {applyLink}
              </p>
              <p className="text-xs text-ink-500 mt-0.5">
                Official government portal link for application guidelines, notifications, and portal access.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={copyApplyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border bg-white text-ink-700 hover:bg-ink-100 transition-colors"
                style={{ borderColor: "var(--color-ink-300)" }}
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={applyLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg text-white shadow-sm transition-transform active:scale-95"
                style={{ backgroundColor: "var(--color-gov-blue-600)" }}
              >
                <ExternalLink size={14} />
                Open Portal
              </a>
              {isClosed ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-ink-300 text-ink-600 cursor-not-allowed"
                >
                  <Ban size={13} />
                  Application Closed
                </button>
              ) : (
                <PrimaryButton
                  type="button"
                  onClick={() => handleApplyCitizen()}
                  disabled={applying}
                >
                  <Send size={13} />
                  {applying ? "Applying..." : "Enroll Citizens"}
                </PrimaryButton>
              )}
            </div>
          </div>
          {applySuccess && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              {applySuccess}
            </div>
          )}
          {applyError && (
            <div className="mt-3 p-2.5 rounded-lg bg-red-100 border border-red-300 text-red-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={14} className="text-red-600 shrink-0" />
              {applyError}
            </div>
          )}
        </Card>

        {/* Live Counts: Applied, Used, Missed, Eligible */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBlock
            label="Applied Citizens"
            value={scheme.applied_count}
            accent="blue"
            active={panel === "applied"}
            onClick={() => openPanel("applied")}
          />
          <StatBlock
            label="People Who Used"
            value={scheme.used_count}
            accent="green"
            active={panel === "used"}
            onClick={() => openPanel("used")}
          />
          <StatBlock
            label="People Who Missed"
            value={scheme.missed_count}
            accent="saffron"
            active={panel === "missed"}
            onClick={() => openPanel("missed")}
            highlight={isClosed}
          />
          <StatBlock
            label="Eligible Citizens"
            value={scheme.eligible_count}
            accent="blue"
            active={false}
            onClick={() => {
              if (!isClosed) handleApplyCitizen();
            }}
          />
        </div>

        {/* People Who Missed / Applied / Used Scheme Panel */}
        {panel && (
          <Card
            className="p-5 border-t-4"
            style={{
              borderColor:
                panel === "missed"
                  ? "var(--color-saffron-500)"
                  : panel === "used"
                  ? "var(--color-green-600)"
                  : "var(--color-gov-blue-600)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {panel === "missed" && <AlertCircle size={18} style={{ color: "var(--color-saffron-500)" }} />}
                {panel === "used" && <CheckCircle2 size={18} style={{ color: "var(--color-green-600)" }} />}
                {panel === "applied" && <Users size={18} style={{ color: "var(--color-gov-blue-600)" }} />}
                <h3 className="font-display font-bold text-ink-900">
                  {panel === "missed" && (isClosed ? "Citizens Who Missed This Scheme (Deadline Completed)" : "Citizens Who Missed This Scheme")}
                  {panel === "used" && "Citizens Who Received Benefit from This Scheme"}
                  {panel === "applied" && "Citizens Currently Enrolled / Applied"}
                </h3>
              </div>
              {panel === "missed" && !isClosed && (
                <PrimaryButton type="button" onClick={() => handleApplyCitizen()} disabled={applying}>
                  <Send size={13} /> {applying ? "Applying..." : "Apply All to Scheme"}
                </PrimaryButton>
              )}
            </div>

            {loadingPanel ? (
              <p className="text-sm text-ink-500 py-6 text-center">Loading citizens data...</p>
            ) : (
              <div className="space-y-3">
                {panelRows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-lg border p-3 bg-white hover:bg-ink-100/40 transition-colors"
                    style={{ borderColor: "var(--color-ink-300)" }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <Link
                          to={`/users/${row.id}`}
                          className="text-sm font-bold text-ink-900 hover:text-gov-blue-600 hover:underline transition-colors"
                        >
                          {row.full_name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500 mt-1">
                          {row.phone_number && <span>Phone: <strong className="text-ink-700">{row.phone_number}</strong></span>}
                          {row.year && <span>Year Missed/Recorded: <strong className="text-ink-700">{row.year}</strong></span>}
                          {panel === "missed" && isClosed && (
                            <span className="text-red-700 font-medium bg-red-50 px-2 py-0.5 rounded text-[11px] border border-red-200">
                              Missed Application Deadline
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {panel === "missed" && (
                          <>
                            <SecondaryButton type="button" onClick={() => fetchSuggestion(row.id)}>
                              <Sparkles size={13} /> AI Suggestion
                            </SecondaryButton>
                            {!isClosed && (
                              <SecondaryButton type="button" onClick={() => handleApplyCitizen(row.id)}>
                                <Send size={13} /> Apply Now
                              </SecondaryButton>
                            )}
                          </>
                        )}
                        {panel === "applied" && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                            Enrolled
                          </span>
                        )}
                        {panel === "used" && (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-medium border border-green-200">
                            Benefit Received
                          </span>
                        )}
                      </div>
                    </div>

                    {panel === "missed" && suggestion[row.id] && (
                      <div
                        className="mt-3 text-xs rounded-lg p-3 border leading-relaxed"
                        style={{
                          backgroundColor: "var(--color-gov-blue-50)",
                          borderColor: "var(--color-gov-blue-200)",
                          color: "var(--color-navy-900)",
                        }}
                      >
                        <div className="flex items-center gap-1.5 font-bold mb-1" style={{ color: "var(--color-gov-blue-700)" }}>
                          <Sparkles size={13} /> AI Recommendation for Citizen
                        </div>
                        {suggestion[row.id]}
                      </div>
                    )}
                  </div>
                ))}

                {panelRows.length === 0 && (
                  <p className="text-sm text-ink-500 py-6 text-center">
                    No citizens recorded under this status.
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Core scheme details */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-4">Scheme Details & Application Timeline</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <DetailRow icon={Landmark} label="Lead Ministry" value={scheme.ministry} />
            <DetailRow icon={Layers} label="Government Level" value={scheme.government_level} />
            <DetailRow icon={Tags} label="Scheme Type" value={scheme.scheme_type} />
            <DetailRow icon={CalendarDays} label="Year of Launch" value={scheme.year_of_launch} />
            <DetailRow icon={Tags} label="Sector" value={scheme.source_sector} />
            <DetailRow icon={Clock} label="Application Start Date" value={startDate} />
            <DetailRow icon={Clock} label="Application End Date" value={endDate} />
            <DetailRow icon={ExternalLink} label="Official Apply Link" value={applyLink} isLink />
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
                    className="text-xs font-medium px-2.5 py-1 rounded-full border bg-white"
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
  isLink = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  label: string;
  value?: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--color-gov-blue-100)", color: "var(--color-gov-blue-600)" }}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500">{label}</p>
        {isLink && value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold truncate block hover:underline"
            style={{ color: "var(--color-gov-blue-600)" }}
          >
            {value}
          </a>
        ) : (
          <p className="text-sm font-semibold text-ink-900 break-words">{value || "Not specified"}</p>
        )}
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  accent,
  active = false,
  highlight = false,
  onClick,
}: {
  label: string;
  value: number;
  accent: "blue" | "green" | "saffron";
  active?: boolean;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const color =
    accent === "green"
      ? "var(--color-green-600)"
      : accent === "saffron"
      ? "var(--color-saffron-500)"
      : "var(--color-gov-blue-600)";
  const bg =
    accent === "green"
      ? "var(--color-green-100)"
      : accent === "saffron"
      ? "var(--color-saffron-100)"
      : "var(--color-gov-blue-100)";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border p-4 bg-white transition-all ${
        highlight
          ? "border-red-300 ring-2 ring-red-400 bg-red-50/20"
          : active
          ? "ring-2 ring-gov-blue-500 shadow-md border-transparent"
          : "border-ink-200 hover:border-ink-400 hover:shadow-sm"
      }`}
    >
      <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: bg, color }}>
        <Users size={16} />
      </div>
      <p className="text-xl font-display font-extrabold text-ink-900">{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </button>
  );
}