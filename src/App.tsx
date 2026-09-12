import { useState } from "react";
import { Sidebar, Header, BottomNav, type View } from "./components/Shell";
import Landing from "./screens/Landing";
import Overview from "./screens/Overview";
import StartTriage from "./screens/StartTriage";
import ActiveTriage from "./screens/ActiveTriage";
import { EvaluationScreen, SettingsScreen } from "./screens/Evaluation";
import {
  PatientStateScreen,
  RiskAssessmentScreen,
  DecisionTraceScreen,
  ReassessmentScreen,
} from "./screens/Reasoning";
import { TriageProvider } from "./context/TriageContext";

const meta: Record<View, { title: string; crumb: string }> = {
  overview: { title: "Overview", crumb: "Monitor" },
  start: { title: "Start Triage", crumb: "Monitor" },
  active: { title: "Active Cases", crumb: "Monitor" },
  state: { title: "Patient State", crumb: "Reasoning" },
  risk: { title: "Risk Assessment", crumb: "Reasoning" },
  trace: { title: "Decision Trace", crumb: "Reasoning" },
  reassess: { title: "Reassessment", crumb: "Reasoning" },
  eval: { title: "Evaluation", crumb: "System" },
  settings: { title: "Settings", crumb: "System" },
};

export default function App() {
  const [entered, setEntered] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [collapsed, setCollapsed] = useState(false);

  if (!entered) return <Landing onEnter={() => setEntered(true)} />;

  const screens: Record<View, React.ReactNode> = {
    overview: <Overview onStart={() => setView("start")} />,
    start: <StartTriage onInit={() => setView("active")} />,
    active: <ActiveTriage onTrace={() => setView("trace")} />,
    state: <PatientStateScreen />,
    risk: <RiskAssessmentScreen />,
    trace: <DecisionTraceScreen />,
    reassess: <ReassessmentScreen onEscalate={() => setView("trace")} />,
    eval: <EvaluationScreen />,
    settings: <SettingsScreen />,
  };

  return (
    <TriageProvider>
      <div className="flex h-screen bg-background text-foreground overflow-hidden">
        <Sidebar
          view={view}
          setView={setView}
          collapsed={collapsed}
          onExit={() => setEntered(false)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <Header
            onToggle={() => setCollapsed((c) => !c)}
            title={meta[view].title}
            crumb={meta[view].crumb}
          />
          <main className="flex-1 overflow-y-auto" key={view}>
            {screens[view]}
          </main>
        </div>
        <BottomNav view={view} setView={setView} />
      </div>
    </TriageProvider>
  );
}
