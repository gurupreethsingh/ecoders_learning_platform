// src/pages/ai_pages/DashboardGenerator.jsx
import React from "react";
import AIAssistantShell from "../../components/chatbot_component/AIAssistantShell";

export default function DashboardGenerator() {
  return (
    <AIAssistantShell
      title="Dashboard Generator"
      scope="dashboard"
      placeholder="What KPIs and widgets do you want? I’ll sketch a dashboard…"
      starterPrompts={[
        "Design a student performance dashboard (cards + charts).",
        "E-commerce admin: orders, revenue, cohorts, funnel.",
        "Analytics dashboard with role-based access for LMS.",
        "Explain how to wire Recharts with API data."
      ]}
    />
  );
}
