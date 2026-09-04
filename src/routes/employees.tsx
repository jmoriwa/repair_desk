import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/services";
import type { UserRole } from "@/services";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employees — RepairDesk" },
      {
        name: "description",
        content:
          "Admin-only: add technicians, change roles and disable access for staff who leave.",
      },
      { property: "og:title", content: "Employees — RepairDesk" },
      {
        property: "og:description",
        content:
          "Admin-only: add technicians, change roles and disable access for staff who leave.",
      },
    ],
  }),
  component: () => (
    <RequireAuth adminOnly>
      <Employees />
    </RequireAuth>
  ),
});

function Employees() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["employees"], queryFn: () => api.listEmployees() });
  const [form, setForm] = useState({
    username: "",
    displayName: "",
    role: "technician" as UserRole,
    password: "",
  });

  const onError = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : "That didn't work.");
  const refresh = () => queryClient.invalidateQueries();

  const create = useMutation({
    mutationFn: () => api.createEmployee(form),
    onSuccess: () => {
      setForm({ username: "", displayName: "", role: "technician", password: "" });
      refresh();
      toast.success("Employee added");
    },
    onError,
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; role?: UserRole; active?: boolean }) => {
      if (input.role) await api.updateEmployee(input.id, { role: input.role });
      if (input.active !== undefined)
        return api.setEmployeeActive(input.id, input.active);
      return api.getCurrentUser();
    },
    onSuccess: () => {
      refresh();
      toast.success("Employee updated");
    },
    onError,
  });

  return (
    <div className="space-y-4">
      <header>
        <p className="eyebrow">Administration</p>
        <h1 className="font-display text-xl font-bold tracking-tight">Employees</h1>
      </header>

      <section className="portlet">
        <div className="portlet-head">
          <span>Staff accounts</span>
          <span className="text-muted-foreground">
            Disabled accounts keep their history but can't sign in.
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="datagrid">
            <thead>
              <tr>
                <th>Name</th>
                <th className="hidden w-[10rem] sm:table-cell">Username</th>
                <th className="w-[11rem]">Role</th>
                <th className="w-[7.5rem] text-right">Account</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((u) => (
                <tr key={u.id}>
                  <td>
                    <span className="font-medium">{u.displayName}</span>
                    {!u.active && (
                      <span className="ml-2 rounded-sm bg-muted px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="hidden text-muted-foreground sm:table-cell">
                    @{u.username}
                  </td>
                  <td>
                    <Select
                      value={u.role}
                      onValueChange={(v) =>
                        update.mutate({ id: u.id, role: v as UserRole })
                      }
                    >
                      <SelectTrigger className="h-7 w-full text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      onClick={() => update.mutate({ id: u.id, active: !u.active })}
                    >
                      {u.active ? "Disable" : "Enable"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <form
        className="portlet grid gap-4 p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-display text-sm font-semibold sm:col-span-2">
          Add an employee
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor="displayName">Full name</Label>
          <Input
            id="displayName"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select
            value={form.role}
            onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technician">Technician</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={create.isPending}>
            Add employee
          </Button>
        </div>
      </form>
    </div>
  );
}
