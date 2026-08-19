import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, CheckCircle2, TrendingUp, ShieldCheck, FileCheck2, Tags, Clock, Scale } from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatCard } from "../components/UI";
import { api } from "../api/client";

interface Stats {
  people_enrolled: number;
  problems_solved: number;
  top_problems: { id: string; title: string; total_votes: number }[];
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
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="People Enrolled" value={stats?.people_enrolled ?? "—"} icon={<Users size={22} />} accent="blue" />
        <StatCard label="Problems Solved" value={stats?.problems_solved ?? "—"} icon={<CheckCircle2 size={22} />} accent="green" />
        <StatCard label="Highest Voted Problems" value={stats?.top_problems?.[0]?.title ?? "—"} icon={<TrendingUp size={22} />} accent="saffron" />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-ink-900">Top 10 Highest Voted Problems</h2>
            <Link to="/problems" className="text-xs font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
              View All Problems &rarr;
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                  <th className="py-2 pr-2 font-semibold">Rank</th>
                  <th className="py-2 pr-2 font-semibold">Problem</th>
                  <th className="py-2 pr-2 font-semibold text-right">Votes</th>
                </tr>
              </thead>
              <tbody>
                {stats?.top_problems?.map((p, i) => (
                  <tr key={p.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60">
                    <td className="py-3 pr-2 font-semibold text-ink-500">{i + 1}</td>
                    <td className="py-3 pr-2 text-ink-900 font-medium">{p.title}</td>
                    <td className="py-3 pr-2 text-right font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
                      {p.total_votes}
                    </td>
                  </tr>
                ))}
                {!stats && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-ink-500">
                      Loading...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-5">
          <h2 className="font-display font-bold text-ink-900 mb-4">Official Guidelines &amp; Rules</h2>
          <div className="space-y-3">
            {(stats?.guidelines ?? []).map((g, i) => {
              const Icon = ICONS[g.icon] ?? ShieldCheck;
              return (
                <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ backgroundColor: "var(--color-gov-blue-100)" }}>
                  <Icon size={18} style={{ color: "var(--color-gov-blue-600)" }} className="mt-0.5 shrink-0" />
                  <p className="text-sm text-ink-700">{g.text}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
