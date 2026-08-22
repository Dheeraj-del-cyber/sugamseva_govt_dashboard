import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Landmark,
  FileCheck2,
  Users,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatCard } from "../components/UI";
import { api } from "../api/client";

interface TopNearScheme {
  id: string;
  code?: string;
  name: string;
  category?: string;
  matched_count: number;
  missing_count: number;
  is_eligible: boolean;
}

interface SchemeListItem {
  sl_no: number;
  id: string;
  name: string;
  phone_number?: string;
  eligible_count: number;
  near_schemes_count: number;
  documents_matched: string;
  documents_matched_list: string[];
  top_near_schemes: TopNearScheme[];
}

export default function Schemes() {
  const [rows, setRows] = useState<SchemeListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get("/schemes", { params: search ? { search } : {} })
        .then(({ data }) => {
          setRows(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Aggregate stats across all matched citizens
  const totalCitizens = rows.length;
  const totalEligible = rows.reduce((acc, r) => acc + r.eligible_count, 0);
  const totalNear = rows.reduce((acc, r) => acc + r.near_schemes_count, 0);
  const allDocTypes = new Set(
    rows.flatMap((r) => r.documents_matched_list || [])
  );

  return (
    <Layout title="Schemes Near People">
      {/* Header Banner */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gov-blue-100 text-gov-blue-700 mb-2">
          <Landmark size={13} />
          Government Citizen Scheme Matching
        </div>
        <h2 className="font-display text-2xl font-bold text-ink-900">
          Schemes Near People
        </h2>
        <p className="text-sm text-ink-500 mt-1 max-w-2xl mx-auto">
          Citizens mapped to national welfare schemes based on verified
          documents, civic problems, and required criteria.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Citizens with Near Schemes"
          value={totalCitizens}
          icon={<Users size={22} />}
          accent="blue"
        />
        <StatCard
          label="Total Eligible Schemes"
          value={totalEligible}
          icon={<CheckCircle2 size={22} />}
          accent="green"
        />
        <StatCard
          label="Total Near Scheme Matches"
          value={totalNear}
          icon={<Layers size={22} />}
          accent="saffron"
        />
        <StatCard
          label="Verified Document Types"
          value={allDocTypes.size}
          icon={<FileCheck2 size={22} />}
          accent="blue"
        />
      </div>

      {/* Main Table Card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search citizens by name or phone number..."
              className="w-full rounded-xl border pl-9 pr-4 py-2.5 text-xs sm:text-sm outline-none focus:border-gov-blue-500 focus:ring-1 focus:ring-gov-blue-500 bg-white"
              style={{ borderColor: "var(--color-ink-300)" }}
            />
          </div>
          <div className="text-xs font-semibold text-ink-500 flex items-center justify-end gap-1.5 px-1">
            <Sparkles size={14} style={{ color: "var(--color-saffron-500)" }} />
            <span>
              Showing <strong>{rows.length}</strong> citizen{rows.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase tracking-wider border-b border-ink-100 bg-ink-50/50">
                <th className="py-3 px-3 font-semibold rounded-l-lg w-12 text-center">
                  Sl.No
                </th>
                <th className="py-3 px-3 font-semibold">User Name & Details</th>
                <th className="py-3 px-3 font-semibold text-center">
                  Eligible Schemes
                </th>
                <th className="py-3 px-3 font-semibold text-center">
                  Near Schemes
                </th>
                <th className="py-3 px-3 font-semibold">Documents Matched</th>
                <th className="py-3 px-3 font-semibold">Top Near Schemes</th>
                <th className="py-3 px-3 font-semibold text-right rounded-r-lg">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => {
                const initials = r.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <tr
                    key={r.id}
                    className="hover:bg-ink-100/50 transition-colors group"
                  >
                    <td className="py-3.5 px-3 text-center text-xs font-bold text-ink-400">
                      {r.sl_no}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-9 w-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: "var(--color-navy-900)" }}
                        >
                          {initials}
                        </div>
                        <div>
                          <Link
                            to={`/users/${r.id}`}
                            className="font-bold text-ink-900 group-hover:text-gov-blue-600 transition-colors block text-sm"
                          >
                            {r.name}
                          </Link>
                          {r.phone_number && (
                            <p className="text-[11px] text-ink-500 font-medium mt-0.5">
                              {r.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200 shadow-xs">
                        <CheckCircle2 size={12} className="text-green-600" />
                        <span>{r.eligible_count} Eligible</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gov-blue-100 text-gov-blue-700 border border-gov-blue-200">
                        <Landmark size={12} className="text-gov-blue-600" />
                        <span>{r.near_schemes_count} Near</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1.5 max-w-xs">
                        {r.documents_matched_list &&
                        r.documents_matched_list.length > 0 ? (
                          r.documents_matched_list.map((doc, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
                              {doc}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-ink-400 italic">
                            {r.documents_matched || "No documents"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {r.top_near_schemes && r.top_near_schemes.length > 0 ? (
                          r.top_near_schemes.slice(0, 2).map((s) => (
                            <Link
                              key={s.id}
                              to={`/scheme-list/${s.id}`}
                              className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-ink-100 hover:bg-gov-blue-100 hover:text-gov-blue-700 text-ink-700 truncate max-w-[140px] border border-ink-200 transition-colors"
                              title={s.name}
                            >
                              {s.name}
                            </Link>
                          ))
                        ) : (
                          <span className="text-xs text-ink-400">None</span>
                        )}
                        {r.top_near_schemes && r.top_near_schemes.length > 2 && (
                          <span className="text-[10px] font-bold text-ink-500 px-1 py-0.5">
                            +{r.top_near_schemes.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <Link
                        to={`/users/${r.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg text-white shadow-xs transition-transform active:scale-95"
                        style={{ backgroundColor: "var(--color-navy-900)" }}
                      >
                        <span>View Profile</span>
                        <ChevronRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-ink-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-12 w-12 rounded-full bg-ink-100 flex items-center justify-center text-ink-400">
                        <Users size={24} />
                      </div>
                      <p className="font-semibold text-ink-800">
                        No citizens matching search criteria
                      </p>
                      <p className="text-xs text-ink-400">
                        Try searching with a different citizen name or phone number.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Layout>
  );
}
