import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Layout from "../components/Layout";
import { Card, StatusPill } from "../components/UI";
import { api } from "../api/client";

interface SchemeListItem {
  sl_no: number;
  id: string;
  name: string;
  eligible_count: number;
  documents_matched: string;
}

export default function Schemes() {
  const [rows, setRows] = useState<SchemeListItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get("/schemes", { params: search ? { search } : {} })
        .then(({ data }) => setRows(data));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <Layout title="Schemes Near People">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold text-ink-900">
          Schemes Near People
        </h2>
        <p className="text-sm text-ink-500 mt-1">
          Schemes identified based on citizen documents, problems and
          eligibility
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
              placeholder="Search by user name or phone number"
              className="w-full rounded-lg border pl-9 pr-3 py-2.5 text-sm outline-none focus:border-gov-blue-500"
              style={{ borderColor: "var(--color-ink-300)" }}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-500 text-xs uppercase border-b border-ink-100">
                <th className="py-2.5 pr-3 font-semibold">Sl.No</th>
                <th className="py-2.5 pr-3 font-semibold">User Name</th>
                <th className="py-2.5 pr-3 font-semibold text-center">
                  Eligible Schemes
                </th>
                <th className="py-2.5 pr-3 font-semibold">Documents Matched</th>
                <th className="py-2.5 pr-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60"
                >
                  <td className="py-3 pr-3 text-ink-500">{r.sl_no}</td>
                  <td className="py-3 pr-3">
                    <Link
                      to={`/users/${r.id}`}
                      className="font-semibold text-ink-900 hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <StatusPill status="eligible" />
                    <span className="ml-2 font-semibold text-ink-900">
                      {r.eligible_count}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-ink-700">
                    {r.documents_matched}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Link
                      to={`/users/${r.id}`}
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-gov-blue-600)" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-ink-500">
                    No matching citizens found.
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
