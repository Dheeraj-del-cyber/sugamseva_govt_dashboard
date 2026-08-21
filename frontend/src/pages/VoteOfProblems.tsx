import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Layout from "../components/Layout";
import { Card } from "../components/UI";
import { api } from "../api/client";
import { PROBLEM_CATEGORIES, OTHER_PROBLEM_CATEGORY } from "../lib/problemCategories";

interface ProblemListItem {
  sl_no: number;
  id: string;
  title: string;
  category?: string;
  total_votes: number;
  solved_votes: number;
}

export default function VoteOfProblems() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  const load = () => {
    const params: { search?: string; status?: string; category?: string } = {};

    if (search) {
      params.search = search;
    }

    if (status !== "all") {
      params.status = status;
    }

    if (category !== "all") {
      params.category = category;
    }

    api.get("/problems", { params }).then(({ data }) => setProblems(data));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, status, category]);

  return (
    <Layout title="Vote of Problems">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold text-ink-900">
          Vote of Problems
        </h2>
        <p className="text-sm text-ink-500 mt-1">
          Monitor citizen-reported issues and their resolution progress
        </p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems"
              className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
              style={{ borderColor: "var(--color-ink-300)" }}
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: "var(--color-ink-300)" }}
          >
            <option value="all">All Statuses</option>
            <option value="in-progress">In Progress</option>
            <option value="solved">Solved</option>
          </select>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-lg border px-3 py-2.5 text-sm outline-none max-w-[220px]"
            style={{ borderColor: "var(--color-ink-300)" }}
          >
            <option value="all">All Categories</option>
            {PROBLEM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                <th className="py-2.5 pr-3 font-semibold">Sl.No</th>
                <th className="py-2.5 pr-3 font-semibold">Problem</th>
                <th className="py-2.5 pr-3 font-semibold">Category</th>
                <th className="py-2.5 pr-3 font-semibold text-center">
                  Total Votes
                </th>
                <th className="py-2.5 pr-3 font-semibold text-center">
                  Solved Votes
                </th>
                <th className="py-2.5 pr-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60 group"
                >
                  <td className="py-3 pr-3 text-ink-500">{p.sl_no}</td>
                  <td className="py-3 pr-3">
                    <Link
                      to={`/problems/${p.id}`}
                      className="font-semibold text-ink-900 group-hover:underline"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gov-blue-100 text-gov-blue-700 whitespace-nowrap">
                      {p.category || OTHER_PROBLEM_CATEGORY}
                    </span>
                  </td>
                  <td
                    className="py-3 pr-3 text-center font-semibold"
                    style={{ color: "var(--color-gov-blue-600)" }}
                  >
                    {p.total_votes}
                  </td>
                  <td
                    className="py-3 pr-3 text-center font-semibold"
                    style={{ color: "var(--color-green-600)" }}
                  >
                    {p.solved_votes}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Link
                      to={`/problems/${p.id}`}
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-gov-blue-600)" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-ink-500">
                    No problems found.
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