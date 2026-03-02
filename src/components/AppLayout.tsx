import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, CheckSquare, FolderKanban, LogOut, Wallet, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/devices", label: "Perangkat", icon: Smartphone },
  { to: "/dashboard", label: "Tasks Overview", icon: LayoutDashboard },
  { to: "/tasks", label: "Tugas", icon: CheckSquare },
  { to: "/projects", label: "Proyek", icon: FolderKanban },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-5">
          <CheckSquare className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">TaskFlow</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}>
                <div className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
              {user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-60 flex-1 p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
