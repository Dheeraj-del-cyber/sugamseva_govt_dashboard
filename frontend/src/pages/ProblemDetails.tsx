import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Fingerprint,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  Plus,
  X,
  Search,
  Phone,
} from "lucide-react";
import Layout from "../components/Layout";
import { Card, PrimaryButton } from "../components/UI";
import BiometricVerifyModal from "../components/BiometricVerifyModal";
import { api } from "../api/client";

interface ProblemDetail {
  id: string;
  title: string;
  description?: string;
  category?: string;
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
  solved: boolean;
}

interface CitizenSearchResult {
  id: string;
  full_name: string;
  phone_number: string;
}

export default function ProblemDetails() {
  const { problemId } = useParams();
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [users, setUsers] = useState<AffectedUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [showBioModal, setShowBioModal] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Add Citizen (by phone number) modal
  const [showAddCitizenModal, setShowAddCitizenModal] = useState(false);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [searchResults, setSearchResults] = useState<CitizenSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addCitizenError, setAddCitizenError] = useState("");
  const [addingCitizenId, setAddingCitizenId] = useState<string | null>(null);

  const load = () => {
    if (!problemId) return;
    api.get(`/problems/${problemId}`).then(({ data }) => setProblem(data));
    api.get(`/problems/${problemId}/users`).then(({ data }) => {
      setUsers(data);
      if (data.length > 0 && !selectedUser) {
        const unsolved = data.find((u: AffectedUser) => !u.solved);
        if (unsolved) setSelectedUser(unsolved.id);
      }
    });
  };

  useEffect(load, [problemId]);

  useEffect(() => {
    if (!showAddCitizenModal) return;
    if (!phoneSearch.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      api
        .get("/users", { params: { search: phoneSearch.trim() } })
        .then(({ data }) => setSearchResults(data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [phoneSearch, showAddCitizenModal]);

  const openAddCitizenModal = () => {
    setPhoneSearch("");
    setSearchResults([]);
    setAddCitizenError("");
    setShowAddCitizenModal(true);
  };

  const handleAddCitizenVote = async (citizenId: string) => {
    if (!problemId) return;
    setAddingCitizenId(citizenId);
    setAddCitizenError("");
    try {
      await api.post(`/problems/${problemId}/vote`, { citizen_id: citizenId });
      setShowAddCitizenModal(false);
      setMessage("Citizen added to this problem's vote count.");
      load();
    } catch (err: any) {
      setAddCitizenError(
        err?.response?.data?.detail || "Could not add this citizen to the problem",
      );
    } finally {
      setAddingCitizenId(null);
    }
  };

  const handleOpenBiometricModal = () => {
    if (!selectedUser) {
      setError("Please select a citizen from the list below first.");
      return;
    }
    setError("");
    setShowBioModal(true);
  };

  const handleBiometricSuccess = async (
    token: string,
    matchedFinger: string,
  ) => {
    try {
      await api.post(`/problems/${problemId}/mark-solved`, {
        citizen_id: selectedUser,
        fingerprint_verification_token: token,
      });
      setMessage(
        `Problem instance confirmed resolved by citizen via ${matchedFinger} biometric verification.`,
      );
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Could not mark as solved");
    }
  };
  if (!problem) {
    return (
      <Layout
        title="Problem Details"
        backTo={{ to: "/problems", label: "Back to Problems" }}
      >
        <p className="text-center text-ink-500 py-12">
          Loading problem data...
        </p>
      </Layout>
    );
  }

  const selectedCitizen = users.find((u) => u.id === selectedUser);

  return (
    <Layout
      title="Problem Details"
      backTo={{ to: "/problems", label: "Back to Problems" }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Information Card */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gov-blue-100 text-gov-blue-700">
                {problem.category || "Others"}
              </span>
              <h2 className="font-display text-2xl font-bold text-ink-900 mt-2">
                {problem.title}
              </h2>
              <p className="text-sm text-ink-600 mt-2 max-w-xl leading-relaxed">
                {problem.description}
              </p>
            </div>
            <div className="flex gap-4 shrink-0 bg-ink-50 p-4 rounded-xl border border-ink-200">
              <div className="text-center px-2">
                <p
                  className="text-3xl font-display font-extrabold"
                  style={{ color: "var(--color-gov-blue-600)" }}
                >
                  {problem.total_votes}
                </p>
                <p className="text-[11px] text-ink-500 font-semibold mt-1">
                  Total Votes
                </p>
              </div>
              <div className="w-px bg-ink-200" />
              <div className="text-center px-2">
                <p
                  className="text-3xl font-display font-extrabold"
                  style={{ color: "var(--color-green-600)" }}
                >
                  {problem.solved_votes}
                </p>
                <p className="text-[11px] text-ink-500 font-semibold mt-1">
                  Confirmed Solved
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Affected Citizens List */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-bold text-ink-900 text-base flex items-center gap-2">
                <UserCheck
                  size={18}
                  style={{ color: "var(--color-gov-blue-600)" }}
                />{" "}
                Citizens Facing This Civic Grievance
              </h3>
              <p className="text-xs text-ink-500 mt-0.5">
                Select a citizen to authenticate their grievance resolution via
                sensor
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-ink-500">
                {users.length} Citizens Voted
              </span>
              <PrimaryButton type="button" onClick={openAddCitizenModal}>
                <Plus size={15} /> Add Citizen
              </PrimaryButton>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                  <th className="py-2.5 pr-3 font-semibold w-8"></th>
                  <th className="py-2.5 pr-3 font-semibold">Sl.No</th>
                  <th className="py-2.5 pr-3 font-semibold">Citizen Name</th>
                  <th className="py-2.5 pr-3 font-semibold">Phone Number</th>
                  <th className="py-2.5 pr-3 font-semibold">
                    Location / Address
                  </th>
                  <th className="py-2.5 pr-3 font-semibold text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => !u.solved && setSelectedUser(u.id)}
                    className={`border-b border-ink-100 last:border-0 cursor-pointer transition-colors ${
                      selectedUser === u.id
                        ? "bg-gov-blue-50/70 font-medium"
                        : "hover:bg-ink-100/60"
                    }`}
                  >
                    <td className="py-3 pr-3">
                      <input
                        type="radio"
                        name="selected-user"
                        checked={selectedUser === u.id}
                        onChange={() => setSelectedUser(u.id)}
                        disabled={u.solved}
                      />
                    </td>
                    <td className="py-3 pr-3 text-ink-400 text-xs">
                      {u.sl_no}
                    </td>
                    <td className="py-3 pr-3">
                      <Link
                        to={`/users/${u.id}`}
                        className="font-bold text-ink-900 hover:text-gov-blue-600"
                      >
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="py-3 pr-3 text-ink-700 text-xs">
                      {u.phone_number}
                    </td>
                    <td className="py-3 pr-3 text-ink-600 text-xs max-w-xs truncate">
                      {u.address || "India"}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      {u.solved ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          <CheckCircle2 size={11} /> Solved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          Pending Verification
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Biometric Verification Resolution Action */}
        <Card className="p-5">
          <div className="flex items-start gap-2 text-xs text-ink-600 rounded-xl p-3.5 bg-ink-100/70 border border-ink-200 mb-4">
            <ShieldAlert
              size={16}
              className="mt-0.5 shrink-0 text-gov-blue-600"
            />
            <span>
              Per Digital Citizen Charter regulations, marking a reported
              grievance as solved requires the{" "}
              <strong>
                citizen&apos;s own live biometric fingerprint authentication
              </strong>{" "}
              on the sensor to prevent premature or unauthorized closures.
            </span>
          </div>

          {message && (
            <p className="text-xs font-semibold px-3.5 py-2.5 rounded-xl mb-4 bg-green-100 text-green-800 border border-green-200 flex items-center gap-2">
              <CheckCircle2 size={15} /> {message}
            </p>
          )}

          {error && (
            <p className="text-xs font-semibold px-3.5 py-2.5 rounded-xl mb-4 bg-red-50 text-red-700 border border-red-200">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryButton
              type="button"
              onClick={handleOpenBiometricModal}
              disabled={!selectedUser}
              className="flex-1"
            >
              <Fingerprint size={16} />
              {selectedCitizen
                ? `Verify & Mark Solved for ${selectedCitizen.full_name}`
                : "Select Citizen to Verify with Fingerprint"}
            </PrimaryButton>
          </div>
        </Card>
      </div>

      {/* Biometric Modal */}
      {selectedUser && (
        <BiometricVerifyModal
          isOpen={showBioModal}
          onClose={() => setShowBioModal(false)}
          onSuccess={handleBiometricSuccess}
          subjectType="citizen"
          subjectId={selectedUser}
          title="Citizen Biometric Sign-off"
          description={`Place either of ${selectedCitizen?.full_name || "the citizen"}'s registered fingers (Right Thumb or Left Thumb) on the hardware sensor to confirm problem resolution.`}
        />
      )}

      {/* Add Citizen (by phone number) Modal */}
      {showAddCitizenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-ink-100 p-6 relative">
            <button
              onClick={() => setShowAddCitizenModal(false)}
              className="absolute top-4 right-4 text-ink-500 hover:text-ink-900"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-bold text-lg text-ink-900 mb-1">
              Add Citizen
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              Search a citizen by phone number and add their vote to this
              problem &mdash; increasing the total citizen count.
            </p>

            <div className="relative mb-3">
              <Phone
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                type="text"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Search by phone number"
                autoFocus
                className="w-full text-sm rounded-lg border pl-9 pr-3 py-2.5 outline-none focus:border-gov-blue-500"
                style={{ borderColor: "var(--color-ink-300)" }}
              />
            </div>

            {addCitizenError && (
              <p className="text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 mb-3">
                {addCitizenError}
              </p>
            )}

            <div className="max-h-64 overflow-y-auto rounded-lg border border-ink-200 divide-y divide-ink-100">
              {searching && (
                <p className="text-xs text-ink-400 italic px-3 py-3 flex items-center gap-1.5">
                  <Search size={12} /> Searching...
                </p>
              )}
              {!searching && phoneSearch.trim() && searchResults.length === 0 && (
                <p className="text-xs text-ink-400 italic px-3 py-3">
                  No citizen found with that phone number.
                </p>
              )}
              {!searching && !phoneSearch.trim() && (
                <p className="text-xs text-ink-400 italic px-3 py-3">
                  Start typing a phone number to find a citizen.
                </p>
              )}
              {searchResults.map((c) => {
                const alreadyVoted = users.some((u) => u.id === c.id);
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-2 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink-900 truncate">
                        {c.full_name}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        {c.phone_number}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={alreadyVoted || addingCitizenId === c.id}
                      onClick={() => handleAddCitizenVote(c.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-md text-white disabled:opacity-40 transition-colors shrink-0"
                      style={{ backgroundColor: "var(--color-gov-blue-600)" }}
                    >
                      {alreadyVoted
                        ? "Already Added"
                        : addingCitizenId === c.id
                          ? "Adding..."
                          : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}