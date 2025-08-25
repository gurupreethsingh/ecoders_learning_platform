// src/pages/dummy_pages/DummyDashboard.jsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  // Line
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  // Bar
  BarChart,
  Bar,
  // Area
  AreaChart,
  Area,
  // Pie
  PieChart,
  Pie,
  Cell,
  // Radar
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  // Scatter
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
} from "recharts";

/**
 * View switch icons (1 / 2 / 3 columns)
 */
const ViewIcon = ({ cols, active, onClick, title }) => {
  const bars = Array.from({ length: cols });
  return (
    <button
      onClick={onClick}
      title={title}
      className={`inline-flex items-center justify-center rounded-md border px-2 py-2 transition
        ${
          active
            ? "bg-gray-900 text-white border-gray-900"
            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
        }`}
      aria-label={title}
    >
      <div className="flex gap-0.5">
        {bars.map((_, i) => (
          <span
            key={i}
            className={`block h-4 w-1.5 ${active ? "bg-white" : "bg-gray-500"}`}
          />
        ))}
      </div>
    </button>
  );
};

const DummyDashboard = () => {
  // Rich dummy data for a single user: one subject focus per day
  const raw = [
    {
      date: "Jul 1",
      subject: "Maths",
      score: 72,
      hours: 2.5,
      questions: 40,
      focus: 7,
    },
    {
      date: "Jul 2",
      subject: "Science",
      score: 80,
      hours: 3.0,
      questions: 22,
      focus: 8,
    },
    {
      date: "Jul 3",
      subject: "Chemistry",
      score: 68,
      hours: 2.0,
      questions: 30,
      focus: 6,
    },
    {
      date: "Jul 4",
      subject: "Maths",
      score: 77,
      hours: 2.8,
      questions: 45,
      focus: 8,
    },
    {
      date: "Jul 5",
      subject: "Science",
      score: 82,
      hours: 2.2,
      questions: 18,
      focus: 7,
    },
    {
      date: "Jul 6",
      subject: "Chemistry",
      score: 74,
      hours: 2.4,
      questions: 28,
      focus: 7,
    },
    {
      date: "Jul 7",
      subject: "Maths",
      score: 85,
      hours: 3.0,
      questions: 50,
      focus: 9,
    },
  ];

  // Transform for time-series per subject (sparse → wide)
  const timeSeries = useMemo(() => {
    const dates = raw.map((r) => r.date);
    const subjects = ["Maths", "Science", "Chemistry"];
    return dates.map((d) => {
      const r = raw.find((x) => x.date === d);
      const row = { date: d };
      subjects.forEach((s) => {
        row[`${s}_score`] = r?.subject === s ? r.score : 0;
        row[`${s}_hours`] = r?.subject === s ? r.hours : 0;
        row[`${s}_questions`] = r?.subject === s ? r.questions : 0;
        row[`${s}_focus`] = r?.subject === s ? r.focus : 0;
      });
      // also store combined values (useful for area/focus lines)
      row.score = r?.score ?? 0;
      row.hours = r?.hours ?? 0;
      row.focus = r?.focus ?? 0;
      return row;
    });
  }, [raw]);

  // Aggregates by subject for pie/radar
  const aggregates = useMemo(() => {
    const bySubject = {
      Maths: {
        subject: "Maths",
        hours: 0,
        avgScore: 0,
        days: 0,
        questions: 0,
        focus: 0,
      },
      Science: {
        subject: "Science",
        hours: 0,
        avgScore: 0,
        days: 0,
        questions: 0,
        focus: 0,
      },
      Chemistry: {
        subject: "Chemistry",
        hours: 0,
        avgScore: 0,
        days: 0,
        questions: 0,
        focus: 0,
      },
    };
    raw.forEach((r) => {
      const t = bySubject[r.subject];
      t.hours += r.hours;
      t.questions += r.questions;
      t.focus += r.focus;
      t.avgScore += r.score;
      t.days += 1;
    });
    Object.values(bySubject).forEach((t) => {
      t.avgScore = t.days ? +(t.avgScore / t.days).toFixed(1) : 0;
      t.avgFocus = t.days ? +(t.focus / t.days).toFixed(1) : 0;
    });
    return Object.values(bySubject);
  }, [raw]);

  // Colors for subjects
  const colors = {
    Maths: "#f43f5e", // rose-500
    Science: "#3b82f6", // blue-500
    Chemistry: "#10b981", // emerald-500
  };

  // View switcher state
  const [cols, setCols] = useState(2);
  const gridClass =
    cols === 1
      ? "grid-cols-1"
      : cols === 2
      ? "grid-cols-1 xl:grid-cols-2"
      : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Navigation Bar */}
      <aside className="w-64 bg-white shadow-md p-4">
        <h2 className="text-xl font-bold mb-6">📊 My Dashboard</h2>
        <nav className="space-y-3">
          <a href="#overview" className="block hover:bg-gray-200 p-2 rounded">
            Overview
          </a>
          <a href="#scores" className="block hover:bg-gray-200 p-2 rounded">
            Scores
          </a>
          <a href="#hours" className="block hover:bg-gray-200 p-2 rounded">
            Study Hours
          </a>
          <a href="#practice" className="block hover:bg-gray-200 p-2 rounded">
            Practice
          </a>
          <a href="#focus" className="block hover:bg-gray-200 p-2 rounded">
            Focus
          </a>
          <a href="#insights" className="block hover:bg-gray-200 p-2 rounded">
            Insights
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header with view switcher */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          id="overview"
          className="mb-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">Performance Overview</h1>
              <p className="text-gray-600">
                This dashboard shows your recent performance across Maths,
                Science, and Chemistry.
              </p>
            </div>
            {/* View icons (top-right) */}
            <div className="flex items-center gap-2">
              <ViewIcon
                cols={1}
                title="Single column view"
                active={cols === 1}
                onClick={() => setCols(1)}
              />
              <ViewIcon
                cols={2}
                title="Two columns view"
                active={cols === 2}
                onClick={() => setCols(2)}
              />
              <ViewIcon
                cols={3}
                title="Three columns view"
                active={cols === 3}
                onClick={() => setCols(3)}
              />
            </div>
          </div>
        </motion.div>

        {/* Charts grid */}
        <div className={`grid ${gridClass} gap-6`}>
          {/* 1) Line: Scores over time */}
          <section id="scores" className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Scores Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Maths_score"
                  stroke={colors.Maths}
                />
                <Line
                  type="monotone"
                  dataKey="Science_score"
                  stroke={colors.Science}
                />
                <Line
                  type="monotone"
                  dataKey="Chemistry_score"
                  stroke={colors.Chemistry}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>

          {/* 2) Stacked Bars: Study hours per subject */}
          <section id="hours" className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Study Hours per Day (Stacked)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Maths_hours" stackId="a" fill={colors.Maths} />
                <Bar
                  dataKey="Science_hours"
                  stackId="a"
                  fill={colors.Science}
                />
                <Bar
                  dataKey="Chemistry_hours"
                  stackId="a"
                  fill={colors.Chemistry}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* 3) Grouped Bars: Practice questions per subject */}
          <section id="practice" className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Practice Questions per Day
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Maths_questions" fill={colors.Maths} />
                <Bar dataKey="Science_questions" fill={colors.Science} />
                <Bar dataKey="Chemistry_questions" fill={colors.Chemistry} />
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* 4) Area: Focus level over time */}
          <section id="focus" className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Focus Level Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeries}>
                <defs>
                  <linearGradient id="gradFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="focus"
                  stroke="#6366f1"
                  fill="url(#gradFocus)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </section>

          {/* 5) Pie: Total study hours share by subject */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Total Study Hours by Subject
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Tooltip />
                <Legend />
                <Pie
                  dataKey="hours"
                  data={aggregates}
                  nameKey="subject"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {aggregates.map((a, i) => (
                    <Cell key={i} fill={colors[a.subject]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </section>

          {/* 6) Radar: Composite by subject (avg score, questions normalized, focus) */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Subject Profile (Radar)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart
                data={aggregates.map((a) => ({
                  subject: a.subject,
                  Score: a.avgScore,
                  Practice: a.questions, // raw count; good to compare shape
                  Focus: a.avgFocus,
                }))}
              >
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis />
                <Radar
                  name="Score"
                  dataKey="Score"
                  stroke="#0ea5e9"
                  fill="#0ea5e9"
                  fillOpacity={0.2}
                />
                <Radar
                  name="Practice"
                  dataKey="Practice"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.15}
                />
                <Radar
                  name="Focus"
                  dataKey="Focus"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.15}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </section>

          {/* 7) Scatter: Correlation of hours vs score */}
          <section className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">
              Hours vs Score (Correlation)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid />
                <XAxis type="number" dataKey="hours" name="Hours" />
                <YAxis type="number" dataKey="score" name="Score" />
                <ZAxis
                  type="number"
                  dataKey="focus"
                  range={[60, 200]}
                  name="Focus"
                />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Legend />
                <ReferenceLine y={75} stroke="#9ca3af" strokeDasharray="3 3" />
                <Scatter name="Sessions" data={raw} fill="#8b5cf6" />
              </ScatterChart>
            </ResponsiveContainer>
          </section>
        </div>

        {/* Explanation & Results */}
        <div id="insights" className="mt-8 bg-white p-6 shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Detailed Analysis</h2>
          <p className="text-gray-700">
            Maths shows an upward trend peaking at 85% on Jul 7. Science
            maintains strong performance with solid hours and consistent scores.
            Chemistry is improving—practice volume is decent, but consider
            slightly increasing hours to lift scores further. Focus levels align
            with higher scores, as seen in the scatter plot: sessions above
            ~2.5h correlate with ≥ 77% outcomes.
          </p>
        </div>
      </main>
    </div>
  );
};

export default DummyDashboard;
