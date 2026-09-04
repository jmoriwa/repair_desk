import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Users,
  UserCog,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/repairs", label: "Repair queue", icon: ClipboardList },
  { to: "/customers", label: "Customers", icon: Users },
];

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    ...NAV,
    ...(user?.role === "admin"
      ? [{ to: "/employees", label: "Employees", icon: UserCog }]
      : []),
  ];

  return (
    <div className="workbench min-h-screen lg:flex">
      <aside className="chrome-deep text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-[16.5rem] lg:shrink-0 lg:flex-col">
        <div className="flex items-center gap-3 px-5 py-6">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_20px_-8px] shadow-sidebar-primary/70">
            <Wrench className="size-5" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-bold tracking-tight">
              RepairDesk
            </span>
            <span className="block text-[11px] text-sidebar-foreground/50">
              Bench operations
            </span>
          </span>
        </div>

        <p className="eyebrow hidden px-6 pb-2 text-sidebar-foreground/40 lg:block">
          Workspace
        </p>

        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.to
              : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0] shadow-white/5"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity duration-200",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <item.icon
                  className={cn(
                    "size-4 transition-colors",
                    active ? "text-sidebar-primary" : "text-sidebar-foreground/50",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden px-4 pb-5 lg:mt-auto lg:block">
          <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 p-3 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary font-display text-xs font-bold text-sidebar-primary-foreground">
                {initials(user?.displayName ?? "")}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user?.displayName}</p>
                <p className="text-[11px] uppercase tracking-wide text-sidebar-foreground/50">
                  {user?.role}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2.5 w-full justify-start px-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={async () => {
                await signOut();
                navigate({ to: "/login" });
              }}
            >
              <LogOut className="size-4" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}
