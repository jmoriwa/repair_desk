import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, PackageSearch, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { api, ApiError, type PublicRepairStatus } from "@/services";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "Check your repair status — RepairDesk" },
      {
        name: "description",
        content:
          "Enter your ticket number and tracking code to see the current status of your device repair.",
      },
      { property: "og:title", content: "Check your repair status — RepairDesk" },
      {
        property: "og:description",
        content:
          "Enter your ticket number and tracking code to see the current status of your device repair.",
      },
    ],
  }),
  component: TrackPage,
});

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TrackPage() {
  const [ticket, setTicket] = useState("");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<PublicRepairStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.trackRepair(ticket, code));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We couldn't check that right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="size-4" />
            </span>
            <span className="font-display text-base font-bold">RepairDesk</span>
          </span>
          <Link to="/login" className="text-sm text-muted-foreground hover:underline">
            Employee sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-3xl font-bold">Check your repair</h1>
        <p className="mt-2 text-muted-foreground">
          Enter the ticket number and tracking code from your intake receipt.
        </p>

        <form onSubmit={submit} className="panel mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="ticket">Ticket number</Label>
            <Input
              id="ticket"
              placeholder="RD-1042"
              value={ticket}
              onChange={(e) => setTicket(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="code">Tracking code</Label>
            <Input
              id="code"
              placeholder="7GQ4KD"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <PackageSearch />}
            Check status
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-6 text-sm font-medium text-destructive">
            {error}
          </p>
        )}

        {result && (
          <section className="panel mt-8 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{result.ticketNumber}</p>
                <h2 className="font-display text-xl font-bold">{result.deviceLabel}</h2>
              </div>
              <StatusBadge status={result.status} />
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Received
                </dt>
                <dd className="mt-1 font-medium">{formatDate(result.receivedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Estimated ready
                </dt>
                <dd className="mt-1 font-medium">
                  {formatDate(result.estimatedCompletion)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Completed
                </dt>
                <dd className="mt-1 font-medium">{formatDate(result.completedAt)}</dd>
              </div>
            </dl>

            {result.customerUpdate && (
              <p className="mt-6 rounded-lg bg-muted p-4 text-sm">
                {result.customerUpdate}
              </p>
            )}

            {result.customerNotes.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold">Updates from the shop</h3>
                <ul className="mt-3 space-y-3">
                  {result.customerNotes.map((n) => (
                    <li key={n.createdAt + n.content} className="text-sm">
                      <span className="text-muted-foreground">
                        {formatDate(n.createdAt)} ·{" "}
                      </span>
                      {n.content}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
