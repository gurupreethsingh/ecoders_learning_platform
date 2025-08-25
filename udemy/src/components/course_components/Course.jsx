import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaCheckCircle } from "react-icons/fa";

const courseStructure = [
  {
    title: "Python Basics",
    topics: ["What is Python?", "Why Learn Python?", "Python Features"],
  },
  {
    title: "Python Intermediate",
    topics: ["Variables", "Data Types", "Operators"],
  },
  {
    title: "Python Advanced",
    topics: ["if-else", "for loop", "while loop", "Function Syntax"],
  },
  {
    title: "Quizzes",
    topics: [
      {
        title: "Basics",
        quizzes: ["Quiz 1: Intro", "Quiz 2: Syntax"],
      },
      {
        title: "Intermediate",
        quizzes: ["Quiz 3: Variables", "Quiz 4: Data Types"],
      },
      {
        title: "Advanced",
        quizzes: ["Quiz 5: Loops", "Quiz 6: Functions"],
      },
    ],
  },
];

const contentMap = {
  "What is Python?": {
    heading: "What is Python?",
    code: `print("Hello, Python")\nprint(type(3.14))`,
    explanation:
      "Python is a high-level, interpreted programming language known for its readability and flexibility.",
  },
  Variables: {
    heading: "Variables in Python",
    code: `name = "Alice"\nage = 30\nprint(name, age)`,
    explanation:
      "Variables are used to store data in a program. Python uses dynamic typing.",
  },
  "Quiz 1: Intro": {
    heading: "Quiz 1: Python Basics",
    code: "",
    explanation: "This quiz tests your understanding of Python basics.",
  },
  "Quiz 5: Loops": {
    heading: "Quiz 5: Loops",
    code: "",
    explanation: "This quiz focuses on for-loops and while-loops in Python.",
  },
};

const Course = () => {
  const [expandedSection, setExpandedSection] = useState(null);
  const [expandedQuizCategory, setExpandedQuizCategory] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState("What is Python?");
  const [visitedTopics, setVisitedTopics] = useState(["What is Python?"]);

  // 🟡 Toggle this for free vs paid course
  const isPaid = false;

  const allFlatTopics = courseStructure.flatMap((section) =>
    section.title === "Quizzes"
      ? section.topics.flatMap((cat) => cat.quizzes)
      : section.topics
  );

  const currentIndex = allFlatTopics.indexOf(selectedTopic);
  const totalTopics = allFlatTopics.length;
  const percentageCompleted = Math.floor(
    (visitedTopics.length / totalTopics) * 100
  );

  const current = contentMap[selectedTopic] || {
    heading: "Select a topic",
    code: "",
    explanation: "Choose a topic from the left sidebar to see details here.",
  };

  const handleTopicChange = (topic) => {
    setSelectedTopic(topic);
    if (isPaid && !visitedTopics.includes(topic)) {
      setVisitedTopics((prev) => [...prev, topic]);
    }
  };

  const nextTopic = () => {
    if (currentIndex < totalTopics - 1) {
      handleTopicChange(allFlatTopics[currentIndex + 1]);
    }
  };

  const prevTopic = () => {
    if (currentIndex > 0) {
      handleTopicChange(allFlatTopics[currentIndex - 1]);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row px-6 lg:px-20 py-8 container border-b pb-5">
      {/* Sidebar */}
      <div className="lg:w-72 w-full lg:pr-4 border-r mb-6 lg:mb-0">
        <h2 className="text-xl font-bold mb-6 text-purple-700">
          Course Contents
        </h2>
        <div className="space-y-4">
          {courseStructure.map((section, index) => (
            <div key={index}>
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === index ? null : index)
                }
                className="flex justify-between items-center w-full text-left font-medium text-blue-900 hover:underline"
              >
                {section.title}
                {expandedSection === index ? (
                  <FaChevronUp className="ml-2" />
                ) : (
                  <FaChevronDown className="ml-2" />
                )}
              </button>

              {/* Non-Quiz Sections */}
              {section.title !== "Quizzes" && (
                <div
                  className={`transition-all duration-500 overflow-hidden ${
                    expandedSection === index ? "max-h-96 mt-2" : "max-h-0"
                  }`}
                >
                  <ul className="pl-4 space-y-1">
                    {section.topics.map((topic, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <button
                          onClick={() => handleTopicChange(topic)}
                          className={`text-sm ${
                            selectedTopic === topic
                              ? "text-purple-600 font-medium underline"
                              : "text-gray-700 hover:text-purple-500"
                          }`}
                        >
                          {topic}
                        </button>
                        {isPaid && visitedTopics.includes(topic) && (
                          <FaCheckCircle className="text-green-500 text-xs" />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quizzes */}
              {section.title === "Quizzes" && expandedSection === index && (
                <div className="pl-4 mt-2 space-y-2">
                  {section.topics.map((quizCat, quizIndex) => (
                    <div key={quizIndex}>
                      <button
                        onClick={() =>
                          setExpandedQuizCategory(
                            expandedQuizCategory === quizIndex
                              ? null
                              : quizIndex
                          )
                        }
                        className="flex justify-between items-center w-full text-left text-sm font-medium text-indigo-700"
                      >
                        {quizCat.title}
                        {expandedQuizCategory === quizIndex ? (
                          <FaChevronUp />
                        ) : (
                          <FaChevronDown />
                        )}
                      </button>
                      <div
                        className={`transition-all duration-500 overflow-hidden ${
                          expandedQuizCategory === quizIndex
                            ? "max-h-96 mt-1"
                            : "max-h-0"
                        }`}
                      >
                        <ul className="pl-4 space-y-1 mt-1">
                          {quizCat.quizzes.map((quiz, qidx) => (
                            <li key={qidx} className="flex items-center gap-2">
                              <button
                                onClick={() => handleTopicChange(quiz)}
                                className={`text-sm ${
                                  selectedTopic === quiz
                                    ? "text-purple-600 font-medium underline"
                                    : "text-gray-700 hover:text-purple-500"
                                }`}
                              >
                                {quiz}
                              </button>
                              {isPaid && visitedTopics.includes(quiz) && (
                                <FaCheckCircle className="text-green-500 text-xs" />
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 pl-0 lg:pl-8">
        <div className="flex items-center flex-wrap gap-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 border-b pb-2">
            {current.heading}
          </h1>
          {isPaid && (
            <span className="ml-auto text-sm text-gray-600">
              Course Progress: {percentageCompleted}% completed
            </span>
          )}
        </div>

        {/* Code Section */}
        {current.code && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-purple-700 mb-2">
              Code Example:
            </h2>
            <pre className="bg-gray-100 text-sm p-4 rounded border overflow-auto">
              <code>{current.code}</code>
            </pre>
          </div>
        )}

        {/* Explanation Section */}
        <div>
          <h2 className="text-xl font-semibold text-purple-700 mb-2">
            Explanation:
          </h2>
          <p className="text-gray-800 leading-relaxed whitespace-pre-line">
            {current.explanation}
          </p>
        </div>

        {/* Pagination */}
        <div className="mt-8 flex items-center flex-wrap gap-4">
          <button
            onClick={prevTopic}
            disabled={currentIndex === 0}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
          >
            ← {allFlatTopics[currentIndex - 1] || ""}
          </button>
          <button
            onClick={nextTopic}
            disabled={currentIndex === totalTopics - 1}
            className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {allFlatTopics[currentIndex + 1] || ""} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Course;
