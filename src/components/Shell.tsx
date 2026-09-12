import type { ReactNode } from "react";
import {
  LayoutDashboard,
  PlayCircle,
  ListChecks,
  Boxes,
  Activity,
  GitBranch,
  RefreshCw,
  BarChart3,
  Settings,
  ShieldAlert,
  ChevronLeft,
  Search,
  Layers,
} from "lucide-react";
import { StatusDot } from "./ui";
import { useTriageContext } from "../context/TriageContext";

export type View =
  | "overview"
  | "start"
  | "active"
  | "state"
  | "risk"
  | "trace"
  | "reassess"
  | "eval"
  | "settings"
  | "architecture";

const nav: { id: View; label: string; icon: typeof LayoutDashboard; group: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "Monitor" },
  { id: "start", label: "Start Triage", icon: PlayCircle, group: "Monitor" },
  { id: "active", label: "Active Cases", icon: ListChecks, group: "Monitor" },
  { id: "state", label: "Patient State", icon: Boxes, group: "Reasoning" },
  { id: "risk", label: "Risk Assessment", icon: Activity, group: "Reasoning" },
  { id: "trace", label: "Decision Trace", icon: GitBranch, group: "Reasoning" },
  { id: "reassess", label: "Reassessment", icon: RefreshCw, group: "Reasoning" },
  { id: "architecture", label: "Architecture", icon: Layers, group: "System" },
  { id: "eval", label: "Evaluation", icon: BarChart3, group: "System" },
  { id: "settings", label: "Settings", icon: Settings, group: "System" },
];

export function Sidebar({
  view,
  setView,
  collapsed,
  onExit,
}: {
  view: View;
  setView: (v: View) => void;
  collapsed: boolean;
  onExit: () => void;
}) {
  const { systemModules } = useTriageContext();
  const onlineCount = systemModules.filter((m) => m.status === "Online").length;
  const allOnline = onlineCount === systemModules.length && systemModules.length > 0;

  let lastGroup = "";
  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 border-r border-border bg-card ${
        collapsed ? "w-[68px]" : "w-[236px]"
      } transition-[width] duration-200`}
    >
      <button
        onClick={onExit}
        className="flex items-center gap-2.5 h-14 px-4 border-b border-border shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
      >
        <div className="grid place-items-center h-8 w-8 rounded-md bg-primary text-primary-foreground shrink-0">
          <ShieldAlert size={17} strokeWidth={2.2} />
        </div>
        {!collapsed && (
          <div className="leading-tight text-left">
            <div className="font-display font-700 text-[15px]">TriageFlow</div>
            <div className="font-mono text-[10px] tracking-widest text-signal uppercase">
              AI · Simulation
            </div>
          </div>
        )}
      </button>

      <nav className="flex-1 overflow-y-auto py-3 px-2.5">
        {nav.map((item) => {
          const showGroup = item.group !== lastGroup && !collapsed;
          lastGroup = item.group;
          const active = view === item.id;
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {showGroup && (
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground px-2.5 pt-4 pb-1.5">
                  {item.group}
                </div>
              )}
              <button
                onClick={() => setView(item.id)}
                title={item.label}
                className={`w-full flex items-center gap-3 h-9 px-2.5 rounded-md text-[13.5px] mb-0.5 transition-colors cursor-pointer ${
                  active
                    ? "bg-accent text-primary font-500"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2.2 : 1.9} className="shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {active && !collapsed && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="p-3 border-t border-border">
          <div className="rounded-md bg-muted/60 border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <StatusDot color={allOnline ? "var(--risk-low)" : "var(--risk-mod)"} pulse />
              <span className="text-[12px] font-500">
                {allOnline ? "All systems online" : `${onlineCount} / ${systemModules.length} online`}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {onlineCount} of {systemModules.length} agent services responding.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}

export function Header({
  onToggle,
  title,
  crumb,
}: {
  onToggle: () => void;
  title: string;
  crumb: string;
}) {
  const { systemModules, sessionStatus } = useTriageContext();
  const allOnline = systemModules.every((m) => m.status === "Online");

  return (
    <header className="h-14 shrink-0 border-b border-border bg-card/80 backdrop-blur-sm flex items-center gap-3 px-4 sticky top-0 z-20">
      <button
        onClick={onToggle}
        className="hidden md:grid place-items-center h-8 w-8 rounded-md text-muted-foreground hover:bg-muted cursor-pointer"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {crumb}
        </div>
        <h1 className="font-display font-600 text-[15px] leading-tight truncate">{title}</h1>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 h-9 w-56 px-3 rounded-md bg-muted border border-border text-muted-foreground">
          <Search size={15} />
          <input
            placeholder="Search cases…"
            className="bg-transparent text-[13px] outline-none w-full placeholder:text-muted-foreground"
          />
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-[var(--risk-mod)] text-[11px] font-mono font-500 uppercase tracking-wide"
          style={{ color: "var(--risk-mod)", background: "#fdf3e2" }}>
          Simulation Environment
        </span>

        <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-card text-[11px] font-mono">
          <StatusDot color={allOnline ? "var(--risk-low)" : "var(--risk-mod)"} pulse />
          {allOnline ? "Systems OK" : "Degraded"}
        </span>

        {sessionStatus === "active" && (
          <span className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-primary/10 border border-primary/30 text-[11px] font-mono text-primary font-500">
            <span className="h-1.5 w-1.5 rounded-full bg-primary pulse-dot" />
            Active Session
          </span>
        )}

        <div className="h-8 w-8 rounded-full bg-primary/10 border border-border grid place-items-center text-[11px] font-600 text-primary">
          DR
        </div>
      </div>
    </header>
  );
}

export function BottomNav({ view, setView }: { view: View; setView: (v: View) => void }) {
  const items = nav.slice(0, 5);
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-card border-t border-border grid grid-cols-5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = view === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center justify-center gap-1 text-[10px] cursor-pointer ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
            {item.label.split(" ")[0]}
          </button>
        );
      })}
    </nav>
  );
}

export function PageWrap({ children }: { children: ReactNode }) {
  return <div className="p-5 md:p-7 max-w-[1400px] mx-auto slide-in pb-24 md:pb-7">{children}</div>;
}
