// src/pages/ai_pages/RoadmapGenerator.jsx
import React from "react";
import AIAssistantShell from "../../components/chatbot_component/AIAssistantShell";

export default function RoadmapGenerator() {
  return (
    <AIAssistantShell
      title="Roadmap Generator"
      scope="roadmap"
      placeholder="Describe your goal; I’ll map a learning or project plan…"
      starterPrompts={[
        "Make a 12-week MERN + DevOps learning plan.",
        "Project roadmap for building an LMS with AI features.",
        "Interview prep plan for full-stack developer (8 weeks).",
        "Cloud readiness checklist for a small startup."
      ]}
    />
  );
}
