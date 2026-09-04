import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Users,
  UserCog,
  Wrench,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
  const [navOpen, setNavOpen] = useState(false);

  const items = [
    ...NAV,
    ...(user?.role === "admin"
      ? [{ to: "/employees", label: "Employees", icon: UserCog }]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Application bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 text-sidebar-foreground">
        <button
          type="button"
          onClick={() => setNavOpen((v) => !v)}
          className="flex size-8 items-center justify-center rounded-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden"
          aria-label="Toggle navigation"
        >
          <Menu className="size-4" />
        </button>

        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
            <Wrench className="size-4" />
          </span>
          <span className="truncate font-display text-sm font-semibold tracking-tight">
            RepairDesk
          </span>
          <span className="hidden text-[11px] text-sidebar-foreground/45 sm:inline">
            | Service Management
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <span className="hidden items-center gap-2 rounded-sm border border-sidebar-border bg-sidebar-accent/50 px-2 py-1 text-xs text-sidebar-foreground/60 md:flex">
            <Search className="size-3.5" />
            Search tickets…
          </span>
          <button
            type="button"
            className="flex size-8 items-center justify-center rounded-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
            aria-label="Notifications"
          >
            <Bell className="size-4" />
          </button>
          <button
            type="button"
            className="hidden size-8 items-center justify-center rounded-sm text-sidebar-foreground/70 hover:bg-sidebar-accent sm:flex"
            aria-label="Help"
          >
            <HelpCircle className="size-4" />
          </button>
          <div className="ml-1 flex items-center gap-2 border-l border-sidebar-border pl-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground">
              {initials(user?.displayName ?? "")}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-xs font-semibold">{user?.displayName}</span>
              <span className="block text-[10px] uppercase tracking-wide text-sidebar-foreground/45">
                {user?.role}
              </span>
            </span>
            <ChevronDown className="hidden size-3.5 text-sidebar-foreground/45 sm:block" />
          </div>
        </div>
      </header>

      <div className="lg:flex">
        {/* Module navigation */}
        <aside
          className={cn(
            "border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-12 lg:h-[calc(100vh-3rem)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r",
            navOpen ? "block" : "hidden lg:block",
          )}
        >
          <div className="flex h-full flex-col">
            <p className="eyebrow px-3 pb-1.5 pt-3 text-sidebar-foreground/40">
              Modules
            </p>
            <nav className="flex flex-col gap-px px-2 pb-3">
              {items.map((item) => {
                const active = item.exact
                  ? pathname === item.to
                  : pathname.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setNavOpen(false)}
                    className={cn(
                      "relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute inset-y-1 left-0 w-[3px] rounded-r bg-sidebar-primary",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <item.icon
                      className={cn(
                        "size-4",
                        active ? "text-sidebar-primary" : "text-sidebar-foreground/45",
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto hidden border-t border-sidebar-border p-2 lg:block">
              <button
                type="button"
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/login" });
                }}
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
