import type { ReactNode } from "react";
import { riskMeta, type RiskLevel, type FieldStatus } from "../lib/data";

export function Card({
  children,
  className = "",
  pad = true,
}: {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div
      className={`bg-card border border-border rounded-lg ${pad ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 cursor-pointer";
  const sizes = { sm: "text-[13px] px-3 h-8", md: "text-sm px-4 h-10" };
  const variants = {
    primary: "bg-primary text-primary-foreground hover:brightness-110 shadow-sm",
    secondary:
      "bg-card text-foreground border border-border hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "text-white hover:brightness-110 shadow-sm",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={variant === "danger" ? { background: "var(--risk-high)" } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusDot({ color, pulse = false }: { color: string; pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2">
      {pulse && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-40 pulse-dot"
          style={{ background: color }}
        />
      )}
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: color }}
      />
    </span>
  );
}

export function RiskBadge({ level, size = "md" }: { level: RiskLevel; size?: "sm" | "md" }) {
  const m = riskMeta[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-medium uppercase tracking-wide rounded ${
        size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-[11px] px-2 py-1"
      }`}
      style={{ background: m.bg, color: m.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.color }} />
      {level}
    </span>
  );
}

const statusStyle: Record<FieldStatus, { bg: string; color: string }> = {
  Known: { bg: "#eef0f3", color: "#5b6472" },
  Unknown: { bg: "#f3f0ea", color: "#8a7d5f" },
  Updated: { bg: "#e6eefb", color: "#1a56db" },
  Conflicting: { bg: "#fdeaea", color: "#e02424" },
};

export function FieldStatusBadge({ status }: { status: FieldStatus }) {
  const s = statusStyle[status];
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}
    >
      {status}
    </span>
  );
}

export function StatePill({
  field,
  value,
  status,
}: {
  field: string;
  value: string;
  status: FieldStatus;
}) {
  const dim = status === "Unknown";
  return (
    <div
      className={`flex items-center justify-between gap-3 py-2 px-3 rounded-md border ${
        status === "Conflicting"
          ? "border-[var(--risk-high)] bg-[#fdeaea]/40"
          : "border-transparent hover:bg-muted/60"
      }`}
    >
      <div className="min-w-0">
        <div className="text-[13px] text-foreground truncate">{field}</div>
        <div
          className={`text-sm font-mono ${dim ? "text-muted-foreground italic" : "text-foreground"}`}
        >
          {value}
        </div>
      </div>
      <FieldStatusBadge status={status} />
    </div>
  );
}
