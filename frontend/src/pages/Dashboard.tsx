import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  FileCheck2,
  Tags,
  Clock,
  Scale,
  Award,
  Layers,
  Sparkles,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatCard } from "../components/UI";
import { api } from "../api/client";

interface Stats {
  people_enrolled: number;
  problems_solved: number;
  total_problems: number;
  active_schemes: number;
  verified_documents: number;
  total_scheme_beneficiaries: number;
  top_problems: {
    id: string;
    title: string;
    category?: string;
    total_votes: number;
    solved_votes: number;
    is_solved: boolean;
  }[];
  guidelines: { icon: string; text: string }[];
}

const ICONS: Record<string, any> = {
  shield: ShieldCheck,
  "file-check": FileCheck2,
  tags: Tags,
  clock: Clock,
  scale: Scale,
};

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api.get("/dashboard/stats").then(({ data }) => setStats(data));
  }, []);

  return (
    <Layout title="Dashboard">
      {/* Dynamic Key Performance Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Registered Citizens"
          value={stats?.people_enrolled ?? "—"}
          icon={<Users size={22} />}
          accent="blue"
        />
        <StatCard
          label="Civic Issues Solved"
          value={stats?.problems_solved ?? "—"}
          icon={<CheckCircle2 size={22} />}
          accent="green"
        />
        <StatCard
          label="Active National Schemes"
          value={stats?.active_schemes ?? "—"}
          icon={<Layers size={22} />}
          accent="saffron"
        />
        <StatCard
          label="Verified Document Vaults"
          value={stats?.verified_documents ?? "—"}
          icon={<FileCheck2 size={22} />}
          accent="blue"
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Highest Voted Civic Problems Ranking Table */}
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-ink-900 text-base flex items-center gap-2">
                <TrendingUp size={18} style={{ color: "var(--color-gov-blue-600)" }} /> Highest Voted Civic Grievances
              </h2>
              <p className="text-xs text-ink-500 mt-0.5">
                Real-time vote aggregation across municipal and district wards
              </p>
            </div>
            <Link
              to="/problems"
              className="text-xs font-semibold hover:underline"
              style={{ color: "var(--color-gov-blue-600)" }}
            >
              View All Problems &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                  <th className="py-2.5 pr-2 font-semibold w-10">Rank</th>
                  <th className="py-2.5 pr-2 font-semibold">Civic Issue</th>
                  <th className="py-2.5 pr-2 font-semibold text-center">Category</th>
                  <th className="py-2.5 pr-2 font-semibold text-right">Votes</th>
                  <th className="py-2.5 pr-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {stats?.top_problems?.map((p, i) => (
                  <tr
                    key={p.id}
                    className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60 transition-colors"
                  >
                    <td className="py-3 pr-2 font-bold text-ink-400 text-xs">{i + 1}</td>
                    <td className="py-3 pr-2">
                      <Link
                        to={`/problems/${p.id}`}
                        className="text-xs font-semibold text-ink-900 hover:text-gov-blue-600 line-clamp-1"
                      >
                        {p.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-2 text-center">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-ink-100 text-ink-600">
                        {p.category || "Civic"}
                      </span>
                    </td>
                    <td
                      className="py-3 pr-2 text-right font-bold text-xs"
                      style={{ color: "var(--color-gov-blue-600)" }}
                    >
                      {p.total_votes}
                    </td>
                    <td className="py-3 pr-2 text-right">
                      {p.is_solved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Solved
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          In Progress
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {!stats && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-500 text-xs">
                      Loading dynamic government dashboard analytics...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Guidelines & Quick Directives */}
        <Card className="lg:col-span-2 p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display font-bold text-ink-900 text-base mb-1 flex items-center gap-2">
              <ShieldCheck size={18} style={{ color: "var(--color-saffron-500)" }} /> Official Directives &amp; Guidelines
            </h2>
            <p className="text-xs text-ink-500 mb-4">
              Government of India Citizen Charter &amp; Biometric Security Protocols
            </p>

            <div className="space-y-3">
              {(stats?.guidelines ?? []).map((g, i) => {
                const Icon = ICONS[g.icon] ?? ShieldCheck;
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl p-3 border border-ink-100 bg-linear-to-r from-ink-50 to-white"
                  >
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "var(--color-gov-blue-100)", color: "var(--color-gov-blue-600)" }}
                    >
                      <Icon size={15} />
                    </div>
                    <p className="text-xs font-medium text-ink-800 leading-relaxed">{g.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-navy-900 text-white flex items-center justify-between" style={{ backgroundColor: "var(--color-navy-900)" }}>
            <div className="flex items-center gap-2.5">
              <Sparkles size={16} style={{ color: "var(--color-saffron-500)" }} />
              <div>
                <p className="text-xs font-bold">Need to register a citizen?</p>
                <p className="text-[10px] text-white/70">Dual-finger biometric enrollment enabled</p>
              </div>
            </div>
            <Link
              to="/users/add"
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white text-navy-900 hover:bg-ink-100 transition-colors"
            >
              Add User
            </Link>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
