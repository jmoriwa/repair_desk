import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { Input } from "@/components/ui/input";
import { api } from "@/services";

export const Route = createFileRoute("/customers/")({
  head: () => ({
    meta: [
      { title: "Customers — RepairDesk" },
      {
        name: "description",
        content:
          "Every customer the shop has served, with contact details and their repair history.",
      },
      { property: "og:title", content: "Customers — RepairDesk" },
      {
        property: "og:description",
        content:
          "Every customer the shop has served, with contact details and their repair history.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <Customers />
    </RequireAuth>
  ),
});

function Customers() {
  const [query, setQuery] = useState("");
  const { data } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => api.listCustomers(query),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Customers</h1>
        <p className="text-sm text-muted-foreground">
          Search before creating a new record to avoid duplicates.
        </p>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Name, phone or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search customers"
        />
      </div>

      <section className="panel overflow-hidden">
        <ul className="divide-y divide-border">
          {data?.map((c) => (
            <li key={c.id}>
              <Link
                to="/customers/$customerId"
                params={{ customerId: c.id }}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.phone}
                    {c.email ? ` · ${c.email}` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {data?.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">
              No customers match that search.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
