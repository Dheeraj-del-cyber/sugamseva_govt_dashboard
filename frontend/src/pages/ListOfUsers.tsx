import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import Layout from "../components/Layout";
import { Card } from "../components/UI";
import { api } from "../api/client";

interface CitizenListItem {
  sl_no: number;
  id: string;
  full_name: string;
  phone_number: string;
  documents_submitted: string;
  problem_count: number;
  schemes_near_count: number;
}

const PAGE_SIZE = 8;

export default function ListOfUsers() {
  const [users, setUsers] = useState<CitizenListItem[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api.get("/users", { params: search ? { search } : {} }).then(({ data }) => {
        setUsers(data);
        setPage(1);
        setLoading(false);
      });
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const pageItems = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Layout title="List of Users">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold text-ink-900">List of Users</h2>
        <p className="text-sm text-ink-500 mt-1">View registered citizens and their service information</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or phone number"
              className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
              style={{ borderColor: "var(--color-ink-300)" }}
            />
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-100"
            style={{ borderColor: "var(--color-ink-300)" }}
          >
            <SlidersHorizontal size={15} /> Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                <th className="py-2.5 pr-3 font-semibold">Sl.No</th>
                <th className="py-2.5 pr-3 font-semibold">User Name</th>
                <th className="py-2.5 pr-3 font-semibold">Phone Number</th>
                <th className="py-2.5 pr-3 font-semibold">Documents Submitted</th>
                <th className="py-2.5 pr-3 font-semibold text-center">Problem Count</th>
                <th className="py-2.5 pr-3 font-semibold text-center">Schemes Near</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((u) => (
                <tr key={u.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60 group">
                  <td className="py-3 pr-3 text-ink-500">{u.sl_no}</td>
                  <td className="py-3 pr-3">
                    <Link
                      to={`/users/${u.id}`}
                      className="font-semibold text-ink-900 group-hover:underline"
                      style={{ textDecorationColor: "var(--color-gov-blue-600)" }}
                    >
                      {u.full_name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-ink-700">{u.phone_number}</td>
                  <td className="py-3 pr-3 text-ink-700">{u.documents_submitted}</td>
                  <td className="py-3 pr-3 text-center text-ink-700">{u.problem_count}</td>
                  <td className="py-3 pr-3 text-center text-ink-700">{u.schemes_near_count}</td>
                  <td className="py-3 pr-3 text-right">
                    <Link to={`/users/${u.id}`} className="text-xs font-semibold" style={{ color: "var(--color-gov-blue-600)" }}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && pageItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-ink-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ink-100">
          <p className="text-xs text-ink-500">
            Showing {pageItems.length ? (page - 1) * PAGE_SIZE + 1 : 0}&ndash;
            {(page - 1) * PAGE_SIZE + pageItems.length} of {users.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border disabled:opacity-40"
              style={{ borderColor: "var(--color-ink-300)" }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs font-medium text-ink-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border disabled:opacity-40"
              style={{ borderColor: "var(--color-ink-300)" }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Card>
    </Layout>
  );
}
