import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Paperclip } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ALLOWED_TRANSITIONS,
  api,
  ApiError,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "@/services";
import type { ActivityEvent, NoteVisibility, Priority, RepairDetail } from "@/services";

export const Route = createFileRoute("/repairs/$repairId")({
  head: () => ({
    meta: [
      { title: "Repair ticket — RepairDesk" },
      {
        name: "description",
        content:
          "Full repair record: intake condition, diagnosis, notes, parts used and activity history.",
      },
      { property: "og:title", content: "Repair ticket — RepairDesk" },
      {
        property: "og:description",
        content:
          "Full repair record: intake condition, diagnosis, notes, parts used and activity history.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <RepairPage />
    </RequireAuth>
  ),
});

function when(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const ACTIVITY_TEXT: Record<ActivityEvent["type"], string> = {
  repair_created: "Repair created",
  technician_assigned: "Technician assignment changed",
  status_changed: "Status changed",
  diagnosis_recorded: "Diagnosis recorded",
  note_added: "Note added",
  part_added: "Part recorded",
  attachment_uploaded: "Photo uploaded",
  priority_changed: "Priority changed",
  estimate_changed: "Estimated date changed",
  customer_update_changed: "Customer update changed",
  intake_recorded: "Intake condition recorded",
  repair_completed: "Repair completed",
};

function RepairPage() {
  const { repairId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["repair", repairId],
    queryFn: () => api.getRepair(repairId),
  });
  const technicians = useQuery({
    queryKey: ["technicians"],
    queryFn: () => api.listTechnicians(),
  });

  const refresh = () => queryClient.invalidateQueries();
  const onError = (err: unknown) =>
    toast.error(err instanceof ApiError ? err.message : "That didn't work.");

  const setStatus = useMutation({
    mutationFn: (status: RepairDetail["repair"]["status"]) =>
      api.changeStatus(repairId, status),
    onSuccess: (r) => {
      refresh();
      toast.success(`Moved to ${STATUS_LABELS[r.status]}`);
    },
    onError,
  });

  const assign = useMutation({
    mutationFn: (techId: string) =>
      api.assignTechnician(repairId, techId === "unassigned" ? null : techId),
    onSuccess: () => {
      refresh();
      toast.success("Assignment updated");
    },
    onError,
  });

  const updateMeta = useMutation({
    mutationFn: (input: Parameters<typeof api.updateRepair>[1]) =>
      api.updateRepair(repairId, input),
    onSuccess: () => {
      refresh();
      toast.success("Ticket updated");
    },
    onError,
  });

  if (!data) {
    return <p className="text-sm text-muted-foreground">Loading repair…</p>;
  }

  const { repair, customer, device, technician, intake } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/repairs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Repair queue
      </Link>

      <header className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">
                {repair.ticketNumber}
              </span>
              <PriorityBadge priority={repair.priority} />
              <StatusBadge status={repair.status} />
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold">
              {device.manufacturer} {device.model}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {device.deviceType}
              {device.serialNumber ? ` · SN ${device.serialNumber}` : ""} ·{" "}
              <Link
                to="/customers/$customerId"
                params={{ customerId: customer.id }}
                className="text-primary hover:underline"
              >
                {customer.firstName} {customer.lastName}
              </Link>{" "}
              · {customer.phone}
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm">
            <p className="text-muted-foreground">Customer tracking code</p>
            <p className="font-mono text-lg font-bold">{repair.trackingCode}</p>
          </div>
        </div>

        <p className="mt-5 rounded-lg bg-muted p-4 text-sm">{repair.reportedProblem}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Move to</Label>
            <Select value="" onValueChange={(v) => setStatus.mutate(v as never)}>
              <SelectTrigger>
                <SelectValue placeholder="Change status…" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_TRANSITIONS[repair.status].map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {ALLOWED_TRANSITIONS[repair.status].length === 0 && (
              <p className="text-xs text-muted-foreground">
                This repair is closed — its history stays on file.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Technician</Label>
            <Select
              value={technician?.id ?? "unassigned"}
              onValueChange={(v) => assign.mutate(v)}
            >
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
            <Label>Priority</Label>
            <Select
              value={repair.priority}
              onValueChange={(v) => updateMeta.mutate({ priority: v as Priority })}
            >
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
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Tabs defaultValue="work" className="space-y-4">
          <TabsList>
            <TabsTrigger value="work">Work</TabsTrigger>
            <TabsTrigger value="intake">Intake</TabsTrigger>
            <TabsTrigger value="customer">Customer-facing</TabsTrigger>
          </TabsList>

          <TabsContent value="work" className="space-y-6">
            <DiagnosisPanel data={data} onDone={refresh} />
            <NotesPanel data={data} onDone={refresh} />
            <PartsPanel data={data} onDone={refresh} />
            <PhotosPanel data={data} onDone={refresh} />
          </TabsContent>

          <TabsContent value="intake">
            <section className="panel p-6">
              <h2 className="font-display text-lg font-semibold">Condition at intake</h2>
              {intake ? (
                <>
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(
                      [
                        ["Powers on", intake.powersOn],
                        ["Scratches", intake.scratches],
                        ["Dents", intake.dents],
                        ["Liquid damage", intake.liquidDamage],
                        ["Missing components", intake.missingComponents],
                        ["Charger received", intake.chargerReceived],
                        ["Case received", intake.caseReceived],
                      ] as [string, boolean][]
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                      >
                        <dt>{label}</dt>
                        <dd className="font-semibold">{value ? "Yes" : "No"}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-4 text-sm">
                    <span className="text-muted-foreground">Screen: </span>
                    {intake.screenCondition}
                  </p>
                  {intake.otherAccessories && (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">Accessories: </span>
                      {intake.otherAccessories}
                    </p>
                  )}
                  {intake.conditionNotes && (
                    <p className="mt-3 rounded-lg bg-muted p-3 text-sm">
                      {intake.conditionNotes}
                    </p>
                  )}
                  <p className="mt-4 text-xs text-muted-foreground">
                    Recorded {when(intake.createdAt)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No intake record was captured for this repair.
                </p>
              )}
            </section>
          </TabsContent>

          <TabsContent value="customer">
            <CustomerFacingPanel data={data} onDone={refresh} />
          </TabsContent>
        </Tabs>

        <section className="panel p-6">
          <h2 className="font-display text-lg font-semibold">Activity history</h2>
          <ol className="mt-4 space-y-4">
            {data.activity.map((event) => (
              <li key={event.id} className="relative pl-5">
                <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" />
                <p className="text-sm font-medium">{ACTIVITY_TEXT[event.type]}</p>
                {event.type === "status_changed" && (
                  <p className="text-xs text-muted-foreground">
                    {String(event.details["from"] ?? "")} →{" "}
                    {String(event.details["to"] ?? "")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{when(event.createdAt)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

function DiagnosisPanel({ data, onDone }: { data: RepairDetail; onDone: () => void }) {
  const [description, setDescription] = useState("");
  const [recommended, setRecommended] = useState("");
  const [cost, setCost] = useState("");

  const add = useMutation({
    mutationFn: () =>
      api.addDiagnosis(data.repair.id, {
        description,
        recommendedRepair: recommended,
        estimatedCost: cost ? Number(cost) : undefined,
      }),
    onSuccess: () => {
      setDescription("");
      setRecommended("");
      setCost("");
      onDone();
      toast.success("Diagnosis recorded");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't save that."),
  });

  return (
    <section className="panel p-6">
      <h2 className="font-display text-lg font-semibold">Diagnosis</h2>
      <ul className="mt-4 space-y-3">
        {data.diagnoses.map((d) => (
          <li key={d.id} className="rounded-lg border border-border p-4 text-sm">
            <p>{d.description}</p>
            <p className="mt-2 text-muted-foreground">
              Recommended: {d.recommendedRepair}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {when(d.createdAt)}
              {d.estimatedCost !== undefined ? ` · Estimate $${d.estimatedCost}` : ""}
            </p>
          </li>
        ))}
        {data.diagnoses.length === 0 && (
          <li className="text-sm text-muted-foreground">Nothing recorded yet.</li>
        )}
      </ul>
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Textarea
          rows={2}
          placeholder="What did you find?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Diagnosis"
        />
        <Textarea
          rows={2}
          placeholder="Recommended repair"
          value={recommended}
          onChange={(e) => setRecommended(e.target.value)}
          aria-label="Recommended repair"
        />
        <div className="flex gap-3">
          <Input
            type="number"
            min="0"
            placeholder="Estimated cost"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            aria-label="Estimated cost"
          />
          <Button type="submit" disabled={add.isPending}>
            Record diagnosis
          </Button>
        </div>
      </form>
    </section>
  );
}

function NotesPanel({ data, onDone }: { data: RepairDetail; onDone: () => void }) {
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("internal");

  const add = useMutation({
    mutationFn: () => api.addNote(data.repair.id, { content, visibility }),
    onSuccess: () => {
      setContent("");
      onDone();
      toast.success("Note added");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't add the note."),
  });

  return (
    <section className="panel p-6">
      <h2 className="font-display text-lg font-semibold">Repair notes</h2>
      <ul className="mt-4 space-y-3">
        {data.notes.map((n) => (
          <li key={n.id} className="rounded-lg border border-border p-4 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {n.visibility === "customer" ? "Customer-visible" : "Internal"}
              </span>
              <span className="text-xs text-muted-foreground">{when(n.createdAt)}</span>
            </div>
            <p className="mt-2">{n.content}</p>
          </li>
        ))}
        {data.notes.length === 0 && (
          <li className="text-sm text-muted-foreground">No notes yet.</li>
        )}
      </ul>
      <form
        className="mt-5 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Textarea
          rows={2}
          placeholder="Add a note"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          aria-label="New note"
        />
        <div className="flex gap-3">
          <Select
            value={visibility}
            onValueChange={(v) => setVisibility(v as NoteVisibility)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="internal">Internal only</SelectItem>
              <SelectItem value="customer">Customer-visible</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" disabled={add.isPending}>
            Add note
          </Button>
        </div>
      </form>
    </section>
  );
}

function PartsPanel({ data, onDone }: { data: RepairDetail; onDone: () => void }) {
  const [name, setName] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  const add = useMutation({
    mutationFn: () =>
      api.addPart(data.repair.id, {
        name,
        partNumber: partNumber || undefined,
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : undefined,
      }),
    onSuccess: () => {
      setName("");
      setPartNumber("");
      setQuantity("1");
      setUnitCost("");
      onDone();
      toast.success("Part recorded");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't record that part."),
  });

  const total = data.parts.reduce((sum, p) => sum + (p.unitCost ?? 0) * p.quantity, 0);

  return (
    <section className="panel p-6">
      <h2 className="font-display text-lg font-semibold">Parts used</h2>
      <ul className="mt-4 divide-y divide-border">
        {data.parts.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {p.quantity} × {p.name}
              {p.partNumber && (
                <span className="text-muted-foreground"> ({p.partNumber})</span>
              )}
            </span>
            <span className="font-medium">
              {p.unitCost !== undefined ? `$${p.unitCost * p.quantity}` : "—"}
            </span>
          </li>
        ))}
        {data.parts.length === 0 && (
          <li className="py-2 text-sm text-muted-foreground">No parts recorded.</li>
        )}
      </ul>
      {total > 0 && (
        <p className="mt-2 text-right text-sm font-semibold">Parts total ${total}</p>
      )}
      <form
        className="mt-5 grid gap-3 sm:grid-cols-[2fr_1fr_5rem_6rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <Input
          placeholder="Part name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Part name"
        />
        <Input
          placeholder="Part no."
          value={partNumber}
          onChange={(e) => setPartNumber(e.target.value)}
          aria-label="Part number"
        />
        <Input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          aria-label="Quantity"
        />
        <Input
          type="number"
          min="0"
          placeholder="Cost"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
          aria-label="Unit cost"
        />
        <Button type="submit" disabled={add.isPending}>
          Add
        </Button>
      </form>
    </section>
  );
}

function PhotosPanel({ data, onDone }: { data: RepairDetail; onDone: () => void }) {
  const upload = useMutation({
    mutationFn: (file: File) =>
      api.addAttachment(data.repair.id, {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        url: URL.createObjectURL(file),
        category: "damage",
      }),
    onSuccess: () => {
      onDone();
      toast.success("Photo attached");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't attach that file."),
  });

  return (
    <section className="panel p-6">
      <h2 className="font-display text-lg font-semibold">Photos</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {data.attachments.map((a) => (
          <figure key={a.id} className="w-32">
            <img
              src={a.url}
              alt={a.filename}
              className="h-24 w-32 rounded-lg border border-border object-cover"
            />
            <figcaption className="mt-1 truncate text-xs text-muted-foreground">
              {a.filename}
            </figcaption>
          </figure>
        ))}
        {data.attachments.length === 0 && (
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        )}
      </div>
      <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent/20">
        <Paperclip className="size-4" />
        Attach photo
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        PNG, JPEG, WEBP or HEIC up to 8 MB.
      </p>
    </section>
  );
}

function CustomerFacingPanel({
  data,
  onDone,
}: {
  data: RepairDetail;
  onDone: () => void;
}) {
  const [update, setUpdate] = useState(data.repair.customerUpdate ?? "");
  const [estimate, setEstimate] = useState(data.repair.estimatedCompletion ?? "");

  const save = useMutation({
    mutationFn: () =>
      api.updateRepair(data.repair.id, {
        customerUpdate: update,
        estimatedCompletion: estimate,
      }),
    onSuccess: () => {
      onDone();
      toast.success("Customer-facing details saved");
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "Couldn't save that."),
  });

  return (
    <section className="panel space-y-4 p-6">
      <h2 className="font-display text-lg font-semibold">What the customer sees</h2>
      <p className="text-sm text-muted-foreground">
        Shown on the public tracking page with ticket {data.repair.ticketNumber} and code{" "}
        <span className="font-mono">{data.repair.trackingCode}</span>. Internal notes are
        never shown.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="update">Customer update</Label>
        <Textarea
          id="update"
          rows={3}
          value={update}
          onChange={(e) => setUpdate(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="est">Estimated ready date</Label>
        <Input
          id="est"
          type="date"
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
        />
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        Save
      </Button>
    </section>
  );
}
