import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Fingerprint, MessageSquare, ShieldAlert } from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton, SecondaryButton } from "../components/UI";
import { api } from "../api/client";

interface ProblemDetail {
  id: string;
  title: string;
  description?: string;
  total_votes: number;
  solved_votes: number;
  is_solved: boolean;
}
interface AffectedUser {
  sl_no: number;
  id: string;
  full_name: string;
  phone_number: string;
  address?: string;
  voted_at: string;
}

export default function ProblemDetails() {
  const { problemId } = useParams();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [users, setUsers] = useState<AffectedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [marking, setMarking] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    if (!problemId) return;
    api.get(`/problems/${problemId}`).then(({ data }) => setProblem(data));
    api.get(`/problems/${problemId}/users`).then(({ data }) => setUsers(data));
  };

  useEffect(load, [problemId]);

  const handleMarkSolved = async () => {
    if (!selectedUser) {
      setMessage("Select a citizen from the table below first.");
      return;
    }
    setMarking(true);
    setMessage("");
    try {
      const { data: verify } = await api.post("/biometric/verify", {
        subject_type: "citizen",
        subject_id: selectedUser,
      });
      await api.post(`/problems/${problemId}/mark-solved`, {
        citizen_id: selectedUser,
        fingerprint_verification_token: verify.verification_token,
      });
      setMessage("Problem marked as solved for this citizen.");
      load();
    } catch (err: any) {
      setMessage(err?.response?.data?.detail || "Could not mark as solved");
    } finally {
      setMarking(false);
    }
  };

  if (!problem) {
    return (
      <Layout title="Problem Details" backTo={{ to: "/problems", label: "Back to Problems" }}>
        <p className="text-center text-ink-500 py-12">Loading...</p>
      </Layout>
    );
  }

  return (
    <Layout title="Problem Details" backTo={{ to: "/problems", label: "Back to Problems" }}>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink-900">{problem.title}</h2>
              <p className="text-sm text-ink-500 mt-2 max-w-xl">{problem.description}</p>
            </div>
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <p className="text-2xl font-display font-extrabold" style={{ color: "var(--color-gov-blue-600)" }}>
                  {problem.total_votes.toLocaleString()}
                </p>
                <p className="text-[11px] text-ink-500 mt-1">Total Votes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-extrabold" style={{ color: "var(--color-green-600)" }}>
                  {problem.solved_votes.toLocaleString()}
                </p>
                <p className="text-[11px] text-ink-500 mt-1">Solved Votes</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display font-bold text-ink-900 mb-1">Users Facing This Problem</h3>
          <p className="text-xs text-ink-500 mb-4">Top affected users &mdash; select one below to mark solved</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                  <th className="py-2.5 pr-3 font-semibold w-8"></th>
                  <th className="py-2.5 pr-3 font-semibold">Sl.No</th>
                  <th className="py-2.5 pr-3 font-semibold">User Name</th>
                  <th className="py-2.5 pr-3 font-semibold">Phone Number</th>
                  <th className="py-2.5 pr-3 font-semibold">Location</th>
                  <th className="py-2.5 pr-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60">
                    <td className="py-3 pr-3">
                      <input
                        type="radio"
                        name="selected-user"
                        checked={selectedUser === u.id}
                        onChange={() => setSelectedUser(u.id)}
                      />
                    </td>
                    <td className="py-3 pr-3 text-ink-500">{u.sl_no}</td>
                    <td className="py-3 pr-3">
                      <Link to={`/users/${u.id}`} className="font-semibold text-ink-900 hover:underline">
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-ink-700">{u.phone_number}</td>
                    <td className="py-3 pr-3 text-ink-700">{u.address || "—"}</td>
                    <td className="py-3 pr-3">
                      <Link to={`/users/${u.id}`} className="text-xs font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-500">
                      No citizens have reported this problem yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-2 text-xs text-ink-500 rounded-lg p-3 mb-4" style={{ backgroundColor: "var(--color-ink-100)" }}>
            <ShieldAlert size={14} className="mt-0.5 shrink-0" />
            Biometric verification is required before marking a citizen's problem as solved, so it
            cannot be done unilaterally or by mistake.
          </div>
          {message && (
            <p className="text-xs font-medium px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: "var(--color-green-100)", color: "var(--color-green-600)" }}>
              {message}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryButton type="button" onClick={handleMarkSolved} disabled={marking} className="flex-1">
              <Fingerprint size={16} /> {marking ? "Verifying..." : "Mark as Solved — Verify with Fingerprint"}
            </PrimaryButton>
            <SecondaryButton type="button" className="flex-1">
              <MessageSquare size={16} /> Send Message to Users
            </SecondaryButton>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
