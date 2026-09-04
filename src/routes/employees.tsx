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
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Employees</h1>
        <p className="text-sm text-muted-foreground">
          Disabled accounts keep their repair history but can't sign in.
        </p>
      </header>

      <section className="panel overflow-hidden">
        <ul className="divide-y divide-border">
          {data?.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="font-medium">
                  {u.displayName}
                  {!u.active && (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">@{u.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={u.role}
                  onValueChange={(v) => update.mutate({ id: u.id, role: v as UserRole })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => update.mutate({ id: u.id, active: !u.active })}
                >
                  {u.active ? "Disable" : "Enable"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form
        className="panel grid gap-4 p-6 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-display text-lg font-semibold sm:col-span-2">
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
