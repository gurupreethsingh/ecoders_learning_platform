// src/pages/ai_pages/CodeSummary.jsx
import React from "react";
import AIAssistantShell from "../../components/chatbot_component/AIAssistantShell";

export default function CodeSummary() {
  return (
    <AIAssistantShell
      title="Code Summary"
      scope="summary"
      placeholder="Paste code or a snippet to summarize & explain…"
      starterPrompts={[
        "Summarize this function and list potential edge cases.",
        "Explain time and space complexity of this code.",
        "Document this file with JSDoc comments.",
        "Find potential bugs and suggest refactors."
      ]}
    />
  );
}
