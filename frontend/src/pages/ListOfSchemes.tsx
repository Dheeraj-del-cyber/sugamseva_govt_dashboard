import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import Layout from "../components/Layout";
import { Card } from "../components/UI";
import { api } from "../api/client";

interface SchemeMasterListItem {
  sl_no: number;
  id: string;
  code?: string;
  name: string;
  applied_count: number;
}

export default function ListOfSchemes() {
  const [rows, setRows] = useState<SchemeMasterListItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      api
        .get("/scheme-list", { params: search ? { search } : {} })
        .then(({ data }) => setRows(data))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <Layout title="List of Schemes">
      <div className="text-center mb-6">
        <h2 className="font-display text-xl font-bold text-ink-900">
          List of Schemes
        </h2>
        <p className="text-sm text-ink-500 mt-1">
          Master catalog of government schemes with citizen applications
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
              placeholder="Search schemes by name"
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
                <th className="py-2.5 pr-3 font-semibold">Scheme Name</th>
                <th className="py-2.5 pr-3 font-semibold text-center">
                  No of People Applied
                </th>
                <th className="py-2.5 pr-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-ink-100 last:border-0 hover:bg-ink-100/60 group"
                >
                  <td className="py-3 pr-3 text-ink-500">{r.sl_no}</td>
                  <td className="py-3 pr-3">
                    <Link
                      to={`/scheme-list/${r.id}`}
                      className="font-semibold text-ink-900 group-hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td
                    className="py-3 pr-3 text-center font-semibold"
                    style={{ color: "var(--color-gov-blue-600)" }}
                  >
                    {r.applied_count}
                  </td>
                  <td className="py-3 pr-3 text-right">
                    <Link
                      to={`/scheme-list/${r.id}`}
                      className="text-xs font-semibold"
                      style={{ color: "var(--color-gov-blue-600)" }}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-500">
                    No schemes found.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-ink-500">
                    Loading schemes...
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