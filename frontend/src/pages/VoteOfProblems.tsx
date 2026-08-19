import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Plus, X } from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton, TextField } from "../components/UI";
import { api } from "../api/client";

interface ProblemListItem {
  sl_no: number;
  id: string;
  title: string;
  total_votes: number;
  solved_votes: number;
}

export default function VoteOfProblems() {
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get("/problems", { params: search ? { search } : {} }).then(({ data }) => setProblems(data));
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/problems", { title: newTitle, description: newDescription });
      setShowAddModal(false);
      setNewTitle("");
      setNewDescription("");
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Vote of Problems">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold text-ink-900">Vote of Problems</h2>
        <p className="text-sm text-ink-500 mt-1">Monitor citizen-reported issues and their resolution progress</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search problems"
              className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
              style={{ borderColor: "var(--color-ink-300)" }}
            />
          </div>
          <PrimaryButton type="button" onClick={() => setShowAddModal(true)}>
            <Plus size={15} /> Add Problem
          </PrimaryButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                <th className="py-2.5 pr-3 font-semibold">Sl.No</th>
                <th className="py-2.5 pr-3 font-semibold">Problem</th>
                <th className="py-2.5 pr-3 font-semibold text-center">Total Votes</th>
                <th className="py-2.5 pr-3 font-semibold text-center">Solved Votes</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <tr key={p.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60 group">
                  <td className="py-3 pr-3 text-ink-500">{p.sl_no}</td>
                  <td className="py-3 pr-3">
                    <Link to={`/problems/${p.id}`} className="font-semibold text-ink-900 group-hover:underline">
                      {p.title}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-center font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
                    {p.total_votes}
                  </td>
                  <td className="py-3 pr-3 text-center font-semibold" style={{ color: "var(--color-green-600)" }}>
                    {p.solved_votes}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Link to={`/problems/${p.id}`} className="text-xs font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {problems.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    No problems found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-4">Add Problem</h3>
            <form onSubmit={handleAddProblem} className="space-y-4">
              <TextField label="Problem Title" required value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
              <label className="block">
                <span className="text-xs font-semibold text-ink-700">Description</span>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
                  style={{ borderColor: "var(--color-ink-300)" }}
                />
              </label>
              <p className="text-xs text-ink-500">
                Once added, this problem cannot be deleted. Citizens can vote for it going forward.
              </p>
              <div className="flex gap-3 pt-2">
                <SecondaryButton type="button" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Adding..." : "Add Problem"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
