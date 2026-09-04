import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/services";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — RepairDesk" },
      {
        name: "description",
        content: "Shop employees sign in to manage repair tickets in RepairDesk.",
      },
      { property: "og:title", content: "Sign in — RepairDesk" },
      {
        property: "og:description",
        content: "Shop employees sign in to manage repair tickets in RepairDesk.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(username, password);
      navigate({ to: "/" });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function demo(u: string, p: string) {
    setUsername(u);
    setPassword(p);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="grid-paper hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Wrench className="size-5" />
          </span>
          <span className="font-display text-lg font-bold">RepairDesk</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-bold leading-tight">
            Every device, every repair, off the paper pad.
          </h1>
          <p className="mt-4 text-sidebar-foreground/70">
            Log intake condition, track work through the bench, record parts, and give
            customers a status page — without the sticky notes.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Demo data runs entirely in your browser.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-2xl font-bold">Sign in</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Employee access to the shop workspace.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border p-3 text-sm">
            <p className="font-medium">Demo accounts</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => demo("admin", "admin123")}
              >
                Shop owner
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => demo("miguel", "tech123")}
              >
                Technician
              </Button>
            </div>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Customer looking for a repair?{" "}
            <Link to="/track" className="font-medium text-primary hover:underline">
              Check your repair status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
