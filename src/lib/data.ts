export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL" | "UNRESOLVED";
export type FieldStatus = "Known" | "Unknown" | "Updated" | "Conflicting";

export const riskMeta: Record<
  RiskLevel,
  { color: string; bg: string; label: string }
> = {
  LOW: { color: "var(--risk-low)", bg: "#e6f6ef", label: "Low" },
  MODERATE: { color: "var(--risk-mod)", bg: "#fdf3e2", label: "Moderate" },
  HIGH: { color: "var(--risk-high)", bg: "#fdeaea", label: "High" },
  CRITICAL: { color: "var(--risk-crit)", bg: "#f9e5e5", label: "Critical" },
  UNRESOLVED: { color: "var(--risk-mod)", bg: "#f3f0ea", label: "Unresolved" },
};
