import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/require-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError, DEVICE_TYPES, PRIORITIES, PRIORITY_LABELS } from "@/services";
import type { DeviceType, Priority } from "@/services";

export const Route = createFileRoute("/repairs/new")({
  head: () => ({
    meta: [
      { title: "New repair intake — RepairDesk" },
      {
        name: "description",
        content:
          "Record the customer, device, reported problem and intake condition for a new repair ticket.",
      },
      { property: "og:title", content: "New repair intake — RepairDesk" },
      {
        property: "og:description",
        content:
          "Record the customer, device, reported problem and intake condition for a new repair ticket.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <NewRepair />
    </RequireAuth>
  ),
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function NewRepair() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [newDevice, setNewDevice] = useState({
    deviceType: "Laptop" as DeviceType,
    manufacturer: "",
    model: "",
    serialNumber: "",
  });

  const [problem, setProblem] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [technicianId, setTechnicianId] = useState<string>("unassigned");
  const [estimate, setEstimate] = useState("");

  const [intake, setIntake] = useState({
    powersOn: true,
    screenCondition: "Good",
    scratches: false,
    dents: false,
    liquidDamage: false,
    missingComponents: false,
    chargerReceived: false,
    caseReceived: false,
    otherAccessories: "",
    conditionNotes: "",
  });

  const customers = useQuery({
    queryKey: ["customers", customerSearch],
    queryFn: () => api.listCustomers(customerSearch),
  });
  const devices = useQuery({
    queryKey: ["devices", customerId],
    queryFn: () => api.listDevices(customerId ?? undefined),
    enabled: !!customerId,
  });
  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: () => api.listTechnicians(),
  });

  const create = useMutation({
    mutationFn: async () => {
      let cid = customerId;
      if (!cid) {
        const customer = await api.createCustomer({
          firstName: newCustomer.firstName,
          lastName: newCustomer.lastName,
          phone: newCustomer.phone,
          email: newCustomer.email || undefined,
        });
        cid = customer.id;
      }
      let did = deviceId;
      if (!did) {
        const device = await api.createDevice({
          customerId: cid,
          deviceType: newDevice.deviceType,
          manufacturer: newDevice.manufacturer,
          model: newDevice.model,
          serialNumber: newDevice.serialNumber || undefined,
        });
        did = device.id;
      }
      return api.createRepair({
        customerId: cid,
        deviceId: did,
        reportedProblem: problem,
        priority,
        assignedTechnicianId:
          technicianId === "unassigned" ? undefined : technicianId,
        estimatedCompletion: estimate || undefined,
        intake: {
          ...intake,
          otherAccessories: intake.otherAccessories || undefined,
          conditionNotes: intake.conditionNotes || undefined,
        },
      });
    },
    onSuccess: (repair) => {
      queryClient.invalidateQueries();
      toast.success(`Ticket ${repair.ticketNumber} created`, {
        description: `Tracking code ${repair.trackingCode} — give this to the customer.`,
      });
      navigate({ to: "/repairs/$repairId", params: { repairId: repair.id } });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Couldn't create the ticket.");
    },
  });

  const checkboxes: [keyof typeof intake, string][] = [
    ["powersOn", "Device powers on"],
    ["scratches", "Scratches"],
    ["dents", "Dents"],
    ["liquidDamage", "Visible liquid damage"],
    ["missingComponents", "Missing screws or components"],
    ["chargerReceived", "Charger received"],
    ["caseReceived", "Case received"],
  ];

  return (
    <form
      className="mx-auto max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <header>
        <h1 className="font-display text-3xl font-bold">New repair intake</h1>
        <p className="text-sm text-muted-foreground">
          Record the device exactly as it arrives at the counter.
        </p>
      </header>

      <Section title="Customer" description="Search first — avoid duplicate records.">
        <Input
          placeholder="Search by name, phone or email"
          value={customerSearch}
          onChange={(e) => setCustomerSearch(e.target.value)}
          aria-label="Search customers"
        />
        <div className="flex flex-wrap gap-2">
          {customers.data?.slice(0, 8).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCustomerId(c.id === customerId ? null : c.id);
                setDeviceId(null);
              }}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                customerId === c.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="font-medium">
                {c.firstName} {c.lastName}
              </span>
              <span className="block text-xs text-muted-foreground">{c.phone}</span>
            </button>
          ))}
        </div>

        {!customerId && (
          <div className="grid gap-4 border-t border-dashed border-border pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={newCustomer.firstName}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, firstName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={newCustomer.lastName}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, lastName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newCustomer.phone}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={newCustomer.email}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, email: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="Device">
        {customerId && devices.data && devices.data.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {devices.data.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDeviceId(d.id === deviceId ? null : d.id)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  deviceId === d.id
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <span className="font-medium">
                  {d.manufacturer} {d.model}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {d.deviceType}
                </span>
              </button>
            ))}
          </div>
        )}

        {!deviceId && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Device type</Label>
              <Select
                value={newDevice.deviceType}
                onValueChange={(v) =>
                  setNewDevice({ ...newDevice, deviceType: v as DeviceType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                value={newDevice.manufacturer}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, manufacturer: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={newDevice.model}
                onChange={(e) => setNewDevice({ ...newDevice, model: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="serial">Serial number (optional)</Label>
              <Input
                id="serial"
                value={newDevice.serialNumber}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, serialNumber: e.target.value })
                }
              />
            </div>
          </div>
        )}
      </Section>

      <Section title="Reported problem">
        <Textarea
          rows={3}
          placeholder="What did the customer say is wrong?"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          aria-label="Reported problem"
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Assign technician</Label>
            <Select value={technicianId} onValueChange={setTechnicianId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {technicians.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimate">Estimated ready</Label>
            <Input
              id="estimate"
              type="date"
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section
        title="Condition at intake"
        description="Documented with the customer present."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {checkboxes.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={intake[key] as boolean}
                onCheckedChange={(v) => setIntake({ ...intake, [key]: v === true })}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="screen">Screen condition</Label>
            <Input
              id="screen"
              value={intake.screenCondition}
              onChange={(e) =>
                setIntake({ ...intake, screenCondition: e.target.value })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="accessories">Other accessories</Label>
            <Input
              id="accessories"
              value={intake.otherAccessories}
              onChange={(e) =>
                setIntake({ ...intake, otherAccessories: e.target.value })
              }
            />
          </div>
        </div>
        <Textarea
          rows={2}
          placeholder="Additional condition notes"
          value={intake.conditionNotes}
          onChange={(e) => setIntake({ ...intake, conditionNotes: e.target.value })}
          aria-label="Condition notes"
        />
      </Section>

      <div className="flex justify-end gap-3 pb-8">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate({ to: "/repairs" })}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create repair ticket"}
        </Button>
      </div>
    </form>
  );
}
