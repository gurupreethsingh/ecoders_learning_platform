// src/pages/ai_pages/CodeGenerator.jsx
import React from "react";
import AIAssistantShell from "../../components/chatbot_component/AIAssistantShell";

export default function CodeGenerator() {
  return (
    <AIAssistantShell
      title="Code Generator"
      scope="codegen"
      placeholder="Describe what you want to build, incl. language & constraints…"
      starterPrompts={[
        "Generate an Express.js CRUD API for 'Task' with MongoDB.",
        "React component for a responsive pricing table (Tailwind).",
        "Write a Python script to dedupe CSV by email.",
        "SQL query to get top 10 products by monthly revenue."
      ]}
    />
  );
}
