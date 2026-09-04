import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/services";

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
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const { data } = useQuery({
    queryKey: ["customers", query],
    queryFn: () => api.listCustomers(query),
  });

  const create = useMutation({
    mutationFn: () =>
      api.createCustomer({
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
        email: draft.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setAdding(false);
      setDraft({ firstName: "", lastName: "", phone: "", email: "" });
      toast.success("Customer added");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't save that."),
  });

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">Directory</p>
        <h1 className="font-display text-xl font-bold tracking-tight">Customers</h1>
      </header>

      <section className="portlet">
        <div className="portlet-head">
          <span>Customer records</span>
          <span className="text-muted-foreground">
            <span className="numeral">{data?.length ?? 0}</span> records
          </span>
        </div>
        <div className="toolbar">
          <div className="relative ml-auto w-full max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-[13px]"
              placeholder="Name, phone or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search customers"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Customer</th>
                <th className="w-[9rem]">Phone</th>
                <th className="hidden w-[16rem] md:table-cell">Email</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link
                      to="/customers/$customerId"
                      params={{ customerId: c.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.firstName} {c.lastName}
                    </Link>
                  </td>
                  <td className="numeral text-muted-foreground">{c.phone}</td>
                  <td className="hidden text-muted-foreground md:table-cell">
                    {c.email ?? "—"}
                  </td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
                    No customers match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
