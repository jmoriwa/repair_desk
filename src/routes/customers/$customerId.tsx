import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ApiError } from "@/services";

export const Route = createFileRoute("/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer record — RepairDesk" },
      {
        name: "description",
        content:
          "Contact details, registered devices and the full repair history for one customer.",
      },
      { property: "og:title", content: "Customer record — RepairDesk" },
      {
        property: "og:description",
        content:
          "Contact details, registered devices and the full repair history for one customer.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <CustomerPage />
    </RequireAuth>
  ),
});

function CustomerPage() {
  const { customerId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => api.getCustomer(customerId),
  });
  const [edit, setEdit] = useState<null | {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  }>(null);

  const save = useMutation({
    mutationFn: () =>
      api.updateCustomer(customerId, {
        firstName: edit!.firstName,
        lastName: edit!.lastName,
        phone: edit!.phone,
        email: edit!.email || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setEdit(null);
      toast.success("Customer updated");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't save that."),
  });

  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const { customer, devices, repairs } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        to="/customers"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Customers
      </Link>

      <header className="panel p-6">
        {edit ? (
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="f">First name</Label>
              <Input
                id="f"
                value={edit.firstName}
                onChange={(e) => setEdit({ ...edit, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="l">Last name</Label>
              <Input
                id="l"
                value={edit.lastName}
                onChange={(e) => setEdit({ ...edit, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p">Phone</Label>
              <Input
                id="p"
                value={edit.phone}
                onChange={(e) => setEdit({ ...edit, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e">Email</Label>
              <Input
                id="e"
                type="email"
                value={edit.email}
                onChange={(e) => setEdit({ ...edit, email: e.target.value })}
              />
            </div>
            <div className="flex gap-3 sm:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setEdit(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold">
                {customer.firstName} {customer.lastName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {customer.phone}
                {customer.email ? ` · ${customer.email}` : ""}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() =>
                setEdit({
                  firstName: customer.firstName,
                  lastName: customer.lastName,
                  phone: customer.phone,
                  email: customer.email ?? "",
                })
              }
            >
              Edit details
            </Button>
          </div>
        )}
      </header>

      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Devices</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {devices.map((d) => (
            <li key={d.id} className="rounded-lg border border-border p-4 text-sm">
              <p className="font-medium">
                {d.manufacturer} {d.model}
              </p>
              <p className="text-muted-foreground">
                {d.deviceType}
                {d.serialNumber ? ` · SN ${d.serialNumber}` : ""}
              </p>
            </li>
          ))}
          {devices.length === 0 && (
            <li className="text-sm text-muted-foreground">No devices on file.</li>
          )}
        </ul>
      </section>

      <section className="panel overflow-hidden">
        <h2 className="border-b border-border px-5 py-4 font-display text-lg font-semibold">
          Repair history
        </h2>
        <ul className="divide-y divide-border">
          {repairs.map(({ repair, device }) => (
            <li key={repair.id}>
              <Link
                to="/repairs/$repairId"
                params={{ repairId: repair.id }}
                className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/60"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {repair.ticketNumber}
                    </span>
                    <PriorityBadge priority={repair.priority} />
                  </div>
                  <p className="mt-1 truncate font-medium">
                    {device.manufacturer} {device.model}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {repair.reportedProblem}
                  </p>
                </div>
                <StatusBadge status={repair.status} />
              </Link>
            </li>
          ))}
          {repairs.length === 0 && (
            <li className="px-5 py-8 text-sm text-muted-foreground">
              No repairs yet for this customer.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
