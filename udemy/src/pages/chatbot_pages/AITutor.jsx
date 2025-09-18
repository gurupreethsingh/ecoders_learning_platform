// src/pages/ai_pages/AITutor.jsx
import React from "react";
import AIAssistantShell from "../../components/chatbot_component/AIAssistantShell";

export default function AITutor() {
  return (
    <AIAssistantShell
      title="AI Tutor"
      scope="tutor"
      placeholder="Ask the tutor about concepts, problems, and explanations…"
      starterPrompts={[
        "Explain dynamic programming with a simple example.",
        "Help me understand closures in JavaScript.",
        "Create 5 practice questions on binary trees.",
        "Why use normalization in databases?"
      ]}
    />
  );
}
