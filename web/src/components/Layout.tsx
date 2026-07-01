import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Landmark, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  cn(
    "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2">
            <Landmark className="size-5 text-primary" />
            <span className="text-sm font-semibold tracking-tight">ACME Salary Management</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClasses}>
              Directory
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClasses}>
              Dashboard
            </NavLink>
          </nav>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              USD
            </Badge>
            <div className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pr-3 pl-1.5 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <User className="size-3" />
              </span>
              <span className="text-muted-foreground">HR manager</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
