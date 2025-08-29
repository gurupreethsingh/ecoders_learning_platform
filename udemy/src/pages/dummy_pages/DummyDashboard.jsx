// // // src/pages/dummy_pages/DummyDashboard.jsx
// // import React, { useMemo, useState } from "react";
// // import { motion } from "framer-motion";
// // import {
// //   // Line
// //   LineChart,
// //   Line,
// //   XAxis,
// //   YAxis,
// //   Tooltip,
// //   CartesianGrid,
// //   Legend,
// //   ResponsiveContainer,
// //   // Bar
// //   BarChart,
// //   Bar,
// //   // Area
// //   AreaChart,
// //   Area,
// //   // Pie
// //   PieChart,
// //   Pie,
// //   Cell,
// //   // Radar
// //   RadarChart,
// //   PolarGrid,
// //   PolarAngleAxis,
// //   PolarRadiusAxis,
// //   Radar,
// //   // Scatter
// //   ScatterChart,
// //   Scatter,
// //   ZAxis,
// //   ReferenceLine,
// // } from "recharts";

// // /**
// //  * View switch icons (1 / 2 / 3 columns)
// //  */
// // const ViewIcon = ({ cols, active, onClick, title }) => {
// //   const bars = Array.from({ length: cols });
// //   return (
// //     <button
// //       onClick={onClick}
// //       title={title}
// //       className={`inline-flex items-center justify-center rounded-md border px-2 py-2 transition
// //         ${
// //           active
// //             ? "bg-gray-900 text-white border-gray-900"
// //             : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
// //         }`}
// //       aria-label={title}
// //     >
// //       <div className="flex gap-0.5">
// //         {bars.map((_, i) => (
// //           <span
// //             key={i}
// //             className={`block h-4 w-1.5 ${active ? "bg-white" : "bg-gray-500"}`}
// //           />
// //         ))}
// //       </div>
// //     </button>
// //   );
// // };

// // const DummyDashboard = () => {
// //   // Rich dummy data for a single user: one subject focus per day
// //   const raw = [
// //     {
// //       date: "Jul 1",
// //       subject: "Maths",
// //       score: 72,
// //       hours: 2.5,
// //       questions: 40,
// //       focus: 7,
// //     },
// //     {
// //       date: "Jul 2",
// //       subject: "Science",
// //       score: 80,
// //       hours: 3.0,
// //       questions: 22,
// //       focus: 8,
// //     },
// //     {
// //       date: "Jul 3",
// //       subject: "Chemistry",
// //       score: 68,
// //       hours: 2.0,
// //       questions: 30,
// //       focus: 6,
// //     },
// //     {
// //       date: "Jul 4",
// //       subject: "Maths",
// //       score: 77,
// //       hours: 2.8,
// //       questions: 45,
// //       focus: 8,
// //     },
// //     {
// //       date: "Jul 5",
// //       subject: "Science",
// //       score: 82,
// //       hours: 2.2,
// //       questions: 18,
// //       focus: 7,
// //     },
// //     {
// //       date: "Jul 6",
// //       subject: "Chemistry",
// //       score: 74,
// //       hours: 2.4,
// //       questions: 28,
// //       focus: 7,
// //     },
// //     {
// //       date: "Jul 7",
// //       subject: "Maths",
// //       score: 85,
// //       hours: 3.0,
// //       questions: 50,
// //       focus: 9,
// //     },
// //   ];

// //   // Transform for time-series per subject (sparse → wide)
// //   const timeSeries = useMemo(() => {
// //     const dates = raw.map((r) => r.date);
// //     const subjects = ["Maths", "Science", "Chemistry"];
// //     return dates.map((d) => {
// //       const r = raw.find((x) => x.date === d);
// //       const row = { date: d };
// //       subjects.forEach((s) => {
// //         row[`${s}_score`] = r?.subject === s ? r.score : 0;
// //         row[`${s}_hours`] = r?.subject === s ? r.hours : 0;
// //         row[`${s}_questions`] = r?.subject === s ? r.questions : 0;
// //         row[`${s}_focus`] = r?.subject === s ? r.focus : 0;
// //       });
// //       // also store combined values (useful for area/focus lines)
// //       row.score = r?.score ?? 0;
// //       row.hours = r?.hours ?? 0;
// //       row.focus = r?.focus ?? 0;
// //       return row;
// //     });
// //   }, [raw]);

// //   // Aggregates by subject for pie/radar
// //   const aggregates = useMemo(() => {
// //     const bySubject = {
// //       Maths: {
// //         subject: "Maths",
// //         hours: 0,
// //         avgScore: 0,
// //         days: 0,
// //         questions: 0,
// //         focus: 0,
// //       },
// //       Science: {
// //         subject: "Science",
// //         hours: 0,
// //         avgScore: 0,
// //         days: 0,
// //         questions: 0,
// //         focus: 0,
// //       },
// //       Chemistry: {
// //         subject: "Chemistry",
// //         hours: 0,
// //         avgScore: 0,
// //         days: 0,
// //         questions: 0,
// //         focus: 0,
// //       },
// //     };
// //     raw.forEach((r) => {
// //       const t = bySubject[r.subject];
// //       t.hours += r.hours;
// //       t.questions += r.questions;
// //       t.focus += r.focus;
// //       t.avgScore += r.score;
// //       t.days += 1;
// //     });
// //     Object.values(bySubject).forEach((t) => {
// //       t.avgScore = t.days ? +(t.avgScore / t.days).toFixed(1) : 0;
// //       t.avgFocus = t.days ? +(t.focus / t.days).toFixed(1) : 0;
// //     });
// //     return Object.values(bySubject);
// //   }, [raw]);

// //   // Colors for subjects
// //   const colors = {
// //     Maths: "#f43f5e", // rose-500
// //     Science: "#3b82f6", // blue-500
// //     Chemistry: "#10b981", // emerald-500
// //   };

// //   // View switcher state
// //   const [cols, setCols] = useState(2);
// //   const gridClass =
// //     cols === 1
// //       ? "grid-cols-1"
// //       : cols === 2
// //       ? "grid-cols-1 xl:grid-cols-2"
// //       : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

// //   return (
// //     <div className="flex min-h-screen bg-gray-100">
// //       {/* Left Navigation Bar */}
// //       <aside className="w-64 bg-white shadow-md p-4">
// //         <h2 className="text-xl font-bold mb-6">📊 My Dashboard</h2>
// //         <nav className="space-y-3">
// //           <a href="#overview" className="block hover:bg-gray-200 p-2 rounded">
// //             Overview
// //           </a>
// //           <a href="#scores" className="block hover:bg-gray-200 p-2 rounded">
// //             Scores
// //           </a>
// //           <a href="#hours" className="block hover:bg-gray-200 p-2 rounded">
// //             Study Hours
// //           </a>
// //           <a href="#practice" className="block hover:bg-gray-200 p-2 rounded">
// //             Practice
// //           </a>
// //           <a href="#focus" className="block hover:bg-gray-200 p-2 rounded">
// //             Focus
// //           </a>
// //           <a href="#insights" className="block hover:bg-gray-200 p-2 rounded">
// //             Insights
// //           </a>
// //         </nav>
// //       </aside>

// //       {/* Main Content */}
// //       <main className="flex-1 p-8">
// //         {/* Header with view switcher */}
// //         <motion.div
// //           initial={{ opacity: 0, y: 15 }}
// //           animate={{ opacity: 1, y: 0 }}
// //           transition={{ duration: 0.6 }}
// //           id="overview"
// //           className="mb-6"
// //         >
// //           <div className="flex items-start justify-between gap-4">
// //             <div>
// //               <h1 className="text-3xl font-bold mb-1">Performance Overview</h1>
// //               <p className="text-gray-600">
// //                 This dashboard shows your recent performance across Maths,
// //                 Science, and Chemistry.
// //               </p>
// //             </div>
// //             {/* View icons (top-right) */}
// //             <div className="flex items-center gap-2">
// //               <ViewIcon
// //                 cols={1}
// //                 title="Single column view"
// //                 active={cols === 1}
// //                 onClick={() => setCols(1)}
// //               />
// //               <ViewIcon
// //                 cols={2}
// //                 title="Two columns view"
// //                 active={cols === 2}
// //                 onClick={() => setCols(2)}
// //               />
// //               <ViewIcon
// //                 cols={3}
// //                 title="Three columns view"
// //                 active={cols === 3}
// //                 onClick={() => setCols(3)}
// //               />
// //             </div>
// //           </div>
// //         </motion.div>

// //         {/* Charts grid */}
// //         <div className={`grid ${gridClass} gap-6`}>
// //           {/* 1) Line: Scores over time */}
// //           <section id="scores" className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">Scores Over Time</h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <LineChart data={timeSeries}>
// //                 <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
// //                 <XAxis dataKey="date" />
// //                 <YAxis />
// //                 <Tooltip />
// //                 <Legend />
// //                 <Line
// //                   type="monotone"
// //                   dataKey="Maths_score"
// //                   stroke={colors.Maths}
// //                 />
// //                 <Line
// //                   type="monotone"
// //                   dataKey="Science_score"
// //                   stroke={colors.Science}
// //                 />
// //                 <Line
// //                   type="monotone"
// //                   dataKey="Chemistry_score"
// //                   stroke={colors.Chemistry}
// //                 />
// //               </LineChart>
// //             </ResponsiveContainer>
// //           </section>

// //           {/* 2) Stacked Bars: Study hours per subject */}
// //           <section id="hours" className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">
// //               Study Hours per Day (Stacked)
// //             </h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <BarChart data={timeSeries}>
// //                 <CartesianGrid strokeDasharray="3 3" />
// //                 <XAxis dataKey="date" />
// //                 <YAxis />
// //                 <Tooltip />
// //                 <Legend />
// //                 <Bar dataKey="Maths_hours" stackId="a" fill={colors.Maths} />
// //                 <Bar
// //                   dataKey="Science_hours"
// //                   stackId="a"
// //                   fill={colors.Science}
// //                 />
// //                 <Bar
// //                   dataKey="Chemistry_hours"
// //                   stackId="a"
// //                   fill={colors.Chemistry}
// //                 />
// //               </BarChart>
// //             </ResponsiveContainer>
// //           </section>

// //           {/* 3) Grouped Bars: Practice questions per subject */}
// //           <section id="practice" className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">
// //               Practice Questions per Day
// //             </h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <BarChart data={timeSeries}>
// //                 <CartesianGrid strokeDasharray="3 3" />
// //                 <XAxis dataKey="date" />
// //                 <YAxis />
// //                 <Tooltip />
// //                 <Legend />
// //                 <Bar dataKey="Maths_questions" fill={colors.Maths} />
// //                 <Bar dataKey="Science_questions" fill={colors.Science} />
// //                 <Bar dataKey="Chemistry_questions" fill={colors.Chemistry} />
// //               </BarChart>
// //             </ResponsiveContainer>
// //           </section>

// //           {/* 4) Area: Focus level over time */}
// //           <section id="focus" className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">
// //               Focus Level Over Time
// //             </h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <AreaChart data={timeSeries}>
// //                 <defs>
// //                   <linearGradient id="gradFocus" x1="0" y1="0" x2="0" y2="1">
// //                     <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6} />
// //                     <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} />
// //                   </linearGradient>
// //                 </defs>
// //                 <CartesianGrid strokeDasharray="3 3" />
// //                 <XAxis dataKey="date" />
// //                 <YAxis domain={[0, 10]} />
// //                 <Tooltip />
// //                 <Area
// //                   type="monotone"
// //                   dataKey="focus"
// //                   stroke="#6366f1"
// //                   fill="url(#gradFocus)"
// //                 />
// //               </AreaChart>
// //             </ResponsiveContainer>
// //           </section>

// //           {/* 5) Pie: Total study hours share by subject */}
// //           <section className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">
// //               Total Study Hours by Subject
// //             </h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <PieChart>
// //                 <Tooltip />
// //                 <Legend />
// //                 <Pie
// //                   dataKey="hours"
// //                   data={aggregates}
// //                   nameKey="subject"
// //                   cx="50%"
// //                   cy="50%"
// //                   outerRadius={100}
// //                   label
// //                 >
// //                   {aggregates.map((a, i) => (
// //                     <Cell key={i} fill={colors[a.subject]} />
// //                   ))}
// //                 </Pie>
// //               </PieChart>
// //             </ResponsiveContainer>
// //           </section>

// //           {/* 6) Radar: Composite by subject (avg score, questions normalized, focus) */}
// //           <section className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">
// //               Subject Profile (Radar)
// //             </h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <RadarChart
// //                 data={aggregates.map((a) => ({
// //                   subject: a.subject,
// //                   Score: a.avgScore,
// //                   Practice: a.questions, // raw count; good to compare shape
// //                   Focus: a.avgFocus,
// //                 }))}
// //               >
// //                 <PolarGrid />
// //                 <PolarAngleAxis dataKey="subject" />
// //                 <PolarRadiusAxis />
// //                 <Radar
// //                   name="Score"
// //                   dataKey="Score"
// //                   stroke="#0ea5e9"
// //                   fill="#0ea5e9"
// //                   fillOpacity={0.2}
// //                 />
// //                 <Radar
// //                   name="Practice"
// //                   dataKey="Practice"
// //                   stroke="#f97316"
// //                   fill="#f97316"
// //                   fillOpacity={0.15}
// //                 />
// //                 <Radar
// //                   name="Focus"
// //                   dataKey="Focus"
// //                   stroke="#22c55e"
// //                   fill="#22c55e"
// //                   fillOpacity={0.15}
// //                 />
// //                 <Legend />
// //                 <Tooltip />
// //               </RadarChart>
// //             </ResponsiveContainer>
// //           </section>

// //           {/* 7) Scatter: Correlation of hours vs score */}
// //           <section className="bg-white shadow rounded-lg p-6">
// //             <h2 className="text-xl font-semibold mb-4">
// //               Hours vs Score (Correlation)
// //             </h2>
// //             <ResponsiveContainer width="100%" height={300}>
// //               <ScatterChart>
// //                 <CartesianGrid />
// //                 <XAxis type="number" dataKey="hours" name="Hours" />
// //                 <YAxis type="number" dataKey="score" name="Score" />
// //                 <ZAxis
// //                   type="number"
// //                   dataKey="focus"
// //                   range={[60, 200]}
// //                   name="Focus"
// //                 />
// //                 <Tooltip cursor={{ strokeDasharray: "3 3" }} />
// //                 <Legend />
// //                 <ReferenceLine y={75} stroke="#9ca3af" strokeDasharray="3 3" />
// //                 <Scatter name="Sessions" data={raw} fill="#8b5cf6" />
// //               </ScatterChart>
// //             </ResponsiveContainer>
// //           </section>
// //         </div>

// //         {/* Explanation & Results */}
// //         <div id="insights" className="mt-8 bg-white p-6 shadow rounded-lg">
// //           <h2 className="text-xl font-semibold mb-2">Detailed Analysis</h2>
// //           <p className="text-gray-700">
// //             Maths shows an upward trend peaking at 85% on Jul 7. Science
// //             maintains strong performance with solid hours and consistent scores.
// //             Chemistry is improving—practice volume is decent, but consider
// //             slightly increasing hours to lift scores further. Focus levels align
// //             with higher scores, as seen in the scatter plot: sessions above
// //             ~2.5h correlate with ≥ 77% outcomes.
// //           </p>
// //         </div>
// //       </main>
// //     </div>
// //   );
// // };

// // export default DummyDashboard;


// // new one 

// //

// import React, { useMemo, useState } from "react";
// import { motion } from "framer-motion";
// import {
//   Search,
//   Bell,
//   Download,
//   Plus,
//   Users,
//   CalendarDays,
//   CalendarClock,
//   Wallet,
//   FileBarChart2,
//   ThumbsUp,
// } from "lucide-react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   BarChart,
//   Bar,
//   Legend,
//   ReferenceDot,
// } from "recharts";

// /**
//  * Dashboard.jsx
//  * -----------------------------------------------------------
//  * A modern HR/Admin dashboard inspired by the provided mock.
//  * Uses TailwindCSS, Recharts, Framer Motion, and Lucide icons.
//  * Replace dummy data with real API data when ready.
//  * -----------------------------------------------------------
//  */

// // ---------------------------
// // Dummy Data
// // ---------------------------
// const years = [2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017];

// const salaryStats = years.map((y, i) => ({
//   year: y,
//   Marketing: Math.round(20 + 15 * Math.sin(i / 1.4) + (i % 3) * 2),
//   Design: Math.round(35 + 18 * Math.cos(i / 1.2) + (i % 2) * 3),
//   Development: Math.round(50 + 20 * Math.sin(i / 1.1) + i),
//   Others: Math.round(28 + 12 * Math.cos(i / 1.3) + (i % 4)),
// }));

// const employeesJoin = years.map((y, i) => ({
//   year: y,
//   Male: Math.round(60 + 25 * Math.cos(i / 1.3) + i * 2),
//   Female: Math.round(45 + 20 * Math.sin(i / 1.1) + i * 2),
// }));

// const performance = [
//   { label: "Developer Team", value: 65 },
//   { label: "Design Team", value: 84 },
//   { label: "Marketing Team", value: 28 },
//   { label: "Management Team", value: 16 },
// ];

// // ---------------------------
// // Small UI Primitives
// // ---------------------------
// const Card = ({ children, className = "" }) => (
//   <div
//     className={`rounded-2xl bg-white/70 backdrop-blur shadow-sm ring-1 ring-black/5 ${className}`}
//   >
//     {children}
//   </div>
// );

// function StatRing({ value = 72, size = 52, stroke = 8, color = "#ef8354" }) {
//   const r = (size - stroke) / 2;
//   const c = 2 * Math.PI * r;
//   const dash = (value / 100) * c;
//   return (
//     <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
//       <circle
//         cx={size / 2}
//         cy={size / 2}
//         r={r}
//         stroke="#eaeef7"
//         strokeWidth={stroke}
//         fill="none"
//       />
//       <circle
//         cx={size / 2}
//         cy={size / 2}
//         r={r}
//         stroke={color}
//         strokeWidth={stroke}
//         fill="none"
//         strokeLinecap="round"
//         strokeDasharray={`${dash} ${c - dash}`}
//         transform={`rotate(-90 ${size / 2} ${size / 2})`}
//       />
//     </svg>
//   );
// }

// const StatCard = ({ icon: Icon, title, value, progress, color }) => (
//   <Card className="p-4 flex items-center gap-4">
//     <div className="shrink-0">
//       <StatRing value={progress} color={color} />
//     </div>
//     <div className="flex-1">
//       <p className="text-sm text-slate-500">{title}</p>
//       <p className="text-2xl font-semibold tracking-tight">{value}</p>
//     </div>
//   </Card>
// );

// function Gauge({ percent = 74 }) {
//   // Semi-circle gauge using SVG
//   const radius = 110;
//   const stroke = 24;
//   const c = Math.PI * radius;
//   const val = Math.max(0, Math.min(100, percent));
//   const dash = (val / 100) * c;
//   return (
//     <div className="relative w-full h-[220px]">
//       <svg
//         viewBox={`0 0 ${radius * 2 + stroke} ${radius + stroke}`}
//         className="w-full h-full"
//       >
//         <g transform={`translate(${stroke / 2}, ${stroke / 2})`}>
//           {/* track */}
//           <path
//             d={`M0 ${radius} A ${radius} ${radius} 0 0 1 ${radius * 2} ${radius}`}
//             fill="none"
//             stroke="#eef2f7"
//             strokeWidth={stroke}
//             strokeLinecap="round"
//           />
//           {/* value */}
//           <path
//             d={`M0 ${radius} A ${radius} ${radius} 0 0 1 ${radius * 2} ${radius}`}
//             fill="none"
//             stroke="#f59e0b"
//             strokeWidth={stroke}
//             strokeLinecap="round"
//             strokeDasharray={`${dash} ${c}`}
//           />
//         </g>
//       </svg>
//       <div className="absolute inset-0 flex flex-col items-center justify-center pt-6">
//         <div className="w-16 h-16 rounded-full grid place-items-center bg-white shadow-sm">
//           <ThumbsUp className="w-6 h-6 text-slate-500" />
//         </div>
//         <p className="mt-3 text-3xl font-semibold">{percent}%</p>
//       </div>
//     </div>
//   );
// }

// // ---------------------------
// // Dashboard
// // ---------------------------
// export default function DummyDashboard() {
//   const [selectedYear, setSelectedYear] = useState(2014);
//   const [sortBy, setSortBy] = useState("Years");

//   const selectedPoint = useMemo(
//     () => salaryStats.find((d) => d.year === selectedYear),
//     [selectedYear]
//   );

//   return (
//     <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-rose-50/40 to-indigo-50/40">
//       {/* Sidebar (minimal icon rail) */}
//       <div className="fixed left-0 top-0 bottom-0 w-16 px-3 py-4 grid grid-rows-[auto_1fr_auto] gap-4 bg-white/70 backdrop-blur border-r border-slate-100">
//         <div className="grid place-items-center">
//           <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white grid place-items-center font-bold">A</div>
//         </div>
//         <nav className="grid gap-3 content-start">
//           {[
//             <Users />,<CalendarClock />,<CalendarDays />,<Wallet />,<FileBarChart2 />,
//           ].map((Icon, idx) => (
//             <button
//               key={idx}
//               className="p-3 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
//             >
//               {Icon}
//             </button>
//           ))}
//         </nav>
//         <div className="grid gap-3">
//           <button className="p-3 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50">
//             <Bell />
//           </button>
//           <div className="w-10 h-10 rounded-full overflow-hidden">
//             <img
//               alt="avatar"
//               src={`https://i.pravatar.cc/100?img=65`}
//               className="w-full h-full object-cover"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="ml-16">
//         {/* Header */}
//         <div className="px-8 pt-6 pb-2">
//           <p className="text-3xl font-semibold tracking-tight">Hello Admin!</p>
//           <p className="text-slate-500 mt-1">
//             Measure how fast you're growing monthly recurring performance
//             management.
//           </p>
//         </div>

//         {/* Toolbar */}
//         <div className="px-8 flex items-center gap-3">
//           <select
//             value={selectedYear}
//             onChange={(e) => setSelectedYear(parseInt(e.target.value))}
//             className="h-10 px-3 rounded-xl bg-white/80 ring-1 ring-slate-200"
//           >
//             {years.map((y) => (
//               <option key={y} value={y}>
//                 {y}
//               </option>
//             ))}
//           </select>

//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
//             <input
//               placeholder="Search..."
//               className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/80 ring-1 ring-slate-200 placeholder:text-slate-400"
//             />
//           </div>

//           <button className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-orange-500 text-white shadow-sm hover:bg-orange-600">
//             <Plus className="w-4 h-4" /> Create Notice
//           </button>
//         </div>

//         {/* Overview */}
//         <div className="px-8 mt-6">
//           <p className="text-xl font-semibold mb-3">Overview</p>

//           {/* Stat cards */}
//           <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
//             <StatCard title="Users" value="348" progress={72} color="#ef8354" />
//             <StatCard title="Events" value="128" progress={42} color="#8b9cd6" />
//             <StatCard title="Holidays" value="10" progress={64} color="#f59e0b" />
//             <StatCard title="Payrolls" value="3458" progress={58} color="#87d39a" />
//             <StatCard title="Reports" value="3488" progress={76} color="#b9a4ff" />
//           </div>

//           {/* Charts row */}
//           <div className="mt-6 grid xl:grid-cols-3 gap-4">
//             {/* Salary Statistics (Line) */}
//             <Card className="xl:col-span-2">
//               <div className="flex items-center justify-between p-4 pb-2">
//                 <p className="font-semibold">Salary Statistics</p>
//                 <div className="flex items-center gap-2">
//                   <select
//                     value={sortBy}
//                     onChange={(e) => setSortBy(e.target.value)}
//                     className="h-10 px-3 rounded-xl bg-white/80 ring-1 ring-slate-200"
//                   >
//                     <option>Years</option>
//                     <option>Department</option>
//                   </select>
//                   <button className="p-2 rounded-xl hover:bg-slate-100">
//                     <Download className="w-4 h-4 text-slate-500" />
//                   </button>
//                 </div>
//               </div>
//               <div className="h-[280px] pr-2">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <LineChart data={salaryStats} margin={{ left: 16, right: 24, top: 10 }}>
//                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
//                     <XAxis dataKey="year" tick={{ fill: "#94a3b8" }} />
//                     <YAxis tick={{ fill: "#94a3b8" }} />
//                     <Tooltip cursor={{ stroke: "#94a3b8", strokeDasharray: 4 }} />
//                     <Line type="monotone" dataKey="Marketing" stroke="#f59e0b" strokeWidth={3} dot={false} />
//                     <Line type="monotone" dataKey="Design" stroke="#94a3b8" strokeWidth={3} dot={false} />
//                     <Line type="monotone" dataKey="Development" stroke="#64748b" strokeWidth={3} dot={false} />
//                     <Line type="monotone" dataKey="Others" stroke="#c7cedd" strokeWidth={3} dot={false} />
//                     {selectedPoint && (
//                       <ReferenceDot
//                         x={selectedPoint.year}
//                         y={selectedPoint.Marketing}
//                         r={6}
//                         fill="#f59e0b"
//                         stroke="#fff"
//                       />
//                     )}
//                   </LineChart>
//                 </ResponsiveContainer>
//               </div>
//               {/* Inline legend-like chip for 2014 */}
//               <div className="px-4 pb-4">
//                 <div className="inline-flex items-center gap-3 rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
//                   <span className="font-medium">{selectedYear}</span>
//                   <span className="text-slate-500 text-sm">
//                     Marketing: {selectedPoint?.Marketing} &nbsp; Design: {selectedPoint?.Design}
//                     &nbsp; Development: {selectedPoint?.Development} &nbsp; Others: {selectedPoint?.Others}
//                   </span>
//                 </div>
//               </div>
//             </Card>

//             {/* Employee Satisfaction (Gauge) */}
//             <Card>
//               <div className="flex items-center justify-between p-4 pb-0">
//                 <p className="font-semibold">Employee Satisfaction</p>
//                 <button className="p-2 rounded-xl hover:bg-slate-100">
//                   <Download className="w-4 h-4 text-slate-500" />
//                 </button>
//               </div>
//               <Gauge percent={74} />
//             </Card>
//           </div>

//           {/* Bottom row */}
//           <div className="mt-4 grid xl:grid-cols-3 gap-4">
//             {/* Performance Statistics */}
//             <Card className="p-4">
//               <div className="flex items-center justify-between">
//                 <p className="font-semibold">Performance Statistics</p>
//                 <button className="p-2 rounded-xl hover:bg-slate-100">
//                   <Download className="w-4 h-4 text-slate-500" />
//                 </button>
//               </div>
//               <div className="mt-4 grid gap-4">
//                 {performance.map((p, idx) => (
//                   <div key={p.label}>
//                     <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
//                       <span>{p.label}</span>
//                       <span className="font-medium">{p.value}%</span>
//                     </div>
//                     <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
//                       <motion.div
//                         initial={{ width: 0 }}
//                         animate={{ width: `${p.value}%` }}
//                         transition={{ type: "spring", stiffness: 80, damping: 20, delay: idx * 0.08 }}
//                         className="h-full rounded-full bg-gradient-to-r from-orange-400 via-indigo-400 to-purple-400"
//                       />
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </Card>

//             {/* New Employees (Bar) */}
//             <Card className="xl:col-span-2">
//               <div className="flex items-center justify-between p-4 pb-2">
//                 <div className="flex items-center gap-3">
//                   <p className="font-semibold">New Employees</p>
//                   <div className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-1.5 ring-1 ring-slate-200 text-sm text-slate-600">
//                     <span className="font-medium">{selectedYear}</span>
//                     <span className="text-slate-500">Male: {employeesJoin.find(d=>d.year===selectedYear)?.Male}</span>
//                     <span className="text-slate-500">Female: {employeesJoin.find(d=>d.year===selectedYear)?.Female}</span>
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-2">
//                   <select className="h-10 px-3 rounded-xl bg-white/80 ring-1 ring-slate-200">
//                     <option>Years</option>
//                     <option>Months</option>
//                   </select>
//                   <button className="p-2 rounded-xl hover:bg-slate-100">
//                     <Download className="w-4 h-4 text-slate-500" />
//                   </button>
//                 </div>
//               </div>
//               <div className="h-[280px] pr-2">
//                 <ResponsiveContainer width="100%" height="100%">
//                   <BarChart data={employeesJoin} margin={{ left: 16, right: 24, top: 10 }}>
//                     <CartesianGrid strokeDasharray="3 3" vertical={false} />
//                     <XAxis dataKey="year" tick={{ fill: "#94a3b8" }} />
//                     <YAxis tick={{ fill: "#94a3b8" }} />
//                     <Tooltip cursor={{ fill: "rgba(148,163,184,0.1)" }} />
//                     <Legend />
//                     <Bar dataKey="Male" fill="#94a3b8" radius={[6, 6, 0, 0]} />
//                     <Bar dataKey="Female" fill="#f59e0b" radius={[6, 6, 0, 0]} />
//                     {/* Dotted trend line */}
//                     <Line type="monotone" dataKey={(d) => (d.Male + d.Female) / 2} stroke="#94a3b8" strokeDasharray="4 4" dot={false} />
//                     {(() => {
//                       const p = employeesJoin.find((d) => d.year === selectedYear);
//                       if (!p) return null;
//                       return (
//                         <ReferenceDot x={p.year} y={(p.Male + p.Female) / 2} r={6} fill="#f59e0b" stroke="#fff" />
//                       );
//                     })()}
//                   </BarChart>
//                 </ResponsiveContainer>
//               </div>
//             </Card>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ---------------------------
// // Usage Notes
// // ---------------------------
// // 1) Ensure TailwindCSS is configured in your project.
// // 2) Install deps: npm i recharts framer-motion lucide-react
// // 3) Place this file at: src/pages/Dashboard.jsx (or similar)
// // 4) Add a route to render <Dashboard /> and enjoy!


//
// src/components/DegreeDifficultyPieDynamic.jsx
import React, { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

/* =========================================================
   Utility: Color palette & helpers
   ========================================================= */
const PALETTE = [
  "#86efac", "#f59e0b", "#a78bfa", "#60a5fa",
  "#f97316", "#34d399", "#c084fc", "#f472b6",
  "#22d3ee", "#fca5a5",
];

function resolveCategory(deg, categorizer) {
  if (!categorizer) return "Uncategorized";
  if (typeof categorizer === "function") return categorizer(deg) ?? "Uncategorized";
  // object map: try code, slug, _id
  return (
    categorizer[deg.code] ??
    categorizer[deg.slug] ??
    categorizer[deg._id] ??
    "Uncategorized"
  );
}

/* =========================================================
   Tooltip that lists degree names for the hovered slice
   ========================================================= */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  const names = p?.degreeNames || [];
  return (
    <div
      style={{
        background: "white",
        borderRadius: 12,
        border: "1px solid #e5e7eb",
        padding: 12,
        maxWidth: 320,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        {p.name} • {p.value}
      </div>
      <div style={{ fontSize: 12, color: "#475569", maxHeight: 180, overflow: "auto" }}>
        {names.length ? (
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {names.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        ) : (
          <em>No degrees</em>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   Dynamic Pie Component
   - Provide `degrees`, `categorizer` (map or fn), optional `categories`
   - Labels show Category (count); tooltip lists degree names
   ========================================================= */
export function DegreeDifficultyPieDynamic({
  degrees = [],
  categorizer,
  categories,
  colors = {},
  innerRadius = 70,
  outerRadius = 110,
  showSideList = true,
}) {
  const { data, colorByCategory, listsByCategory } = useMemo(() => {
    const grouped = new Map();
    const allCats = new Set(categories || []);

    degrees.forEach((d) => {
      const c = resolveCategory(d, categorizer);
      allCats.add(c);
      if (!grouped.has(c))
        grouped.set(c, { name: c, value: 0, degreeNames: [] });
      const g = grouped.get(c);
      g.value += 1;
      g.degreeNames.push(d.name || d.code || d.slug || d._id);
    });

    const order = categories ? [...categories] : [...allCats];
    const dataArr = order
      .filter((c) => grouped.has(c)) // only slices that exist
      .map((c) => grouped.get(c));

    const colorByCategory = {};
    order.forEach((c, i) => {
      colorByCategory[c] = colors[c] || PALETTE[i % PALETTE.length];
    });

    // for the side list (includes empty categories too)
    const listsByCategory = order.map((c) => ({
      name: c,
      items: grouped.get(c)?.degreeNames || [],
    }));

    return { data: dataArr, colorByCategory, listsByCategory };
  }, [degrees, categorizer, categories, colors]);

  const noData = !Array.isArray(degrees) || degrees.length === 0;

  return (
    <div className="w-full rounded-2xl bg-white shadow-sm ring-1 ring-black/5 p-4">
      <h3 className="text-lg font-semibold mb-2">Degree Difficulty Split</h3>

      {noData ? (
        <div className="text-sm text-slate-500 p-6">
          No degrees provided. Pass an array to the component.
        </div>
      ) : (
        <div className="grid md:grid-cols-5 gap-4">
          {/* Chart */}
          <div className="md:col-span-3 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={3}
                  stroke="#ffffff"
                  strokeWidth={2}
                  isAnimationActive
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={colorByCategory[entry.name]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="bottom" height={24} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Side list of names by category */}
          {showSideList && (
            <div className="md:col-span-2">
              <div className="grid gap-3">
                {listsByCategory.map(({ name, items }, idx) => (
                  <div key={name} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ background: colorByCategory[name] || "#94a3b8" }}
                      />
                      <div className="font-medium text-sm">
                        {name} <span className="text-slate-500">({items.length})</span>
                      </div>
                    </div>
                    {items.length ? (
                      <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1 max-h-36 overflow-auto">
                        {items.map((n) => (
                          <li key={`${name}-${n}`}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-400 italic">No degrees</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Demo Page (works immediately)
   - Replace `degrees` with your DB data
   - Adjust `userCategories` & `difficultyMap` at runtime
   ========================================================= */
const stubDegrees = [
  { _id: "68a9b746a8dde74b3a228fba", name: "Master of Computer Applications", code: "MCA", slug: "master-of-computer-applications", level: "postgraduate" },
  { _id: "68a9b746a8dde74b3a228fbb", name: "Master of Business Administration (Finance)", code: "MBA-FIN", slug: "master-of-business-administration-finance", level: "postgraduate" },
  { _id: "68a9b746a8dde74b3a228fbc", name: "Doctor of Philosophy in Physics", code: "PHD-PHY", slug: "doctor-of-philosophy-in-physics", level: "doctorate" },
  { _id: "68a9b746a8dde74b3a228fbe", name: "Postgraduate Diploma in Cyber Security", code: "PGD-CYBER", slug: "postgraduate-diploma-in-cyber-security", level: "postgraduate" },
  { _id: "68a9b7f3b164ba4ece449262", name: "Master of Data Science", code: "MDS", slug: "master-of-data-science", level: "postgraduate" },
  // add the rest of your degrees here…
];

export default function DegreeDifficultyPiePage() {
  // User-controllable buckets (edit or replace with UI inputs)
  const [userCategories] = useState(["Easy", "Medium", "Hard"]);

  // Either supply a function…
  // const categorizer = (d) => (d.level === "doctorate" ? "Hard" : "Medium");

  // …or a mapping by code/slug/_id (below is just an example):
  const [difficultyMap] = useState({
    MCA: "Medium",
    "MBA-FIN": "Medium",
    "PHD-PHY": "Hard",
    "PGD-CYBER": "Hard",
    MDS: "Hard",
    // anything not listed falls back to "Uncategorized"
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <DegreeDifficultyPieDynamic
          degrees={stubDegrees}
          categories={userCategories}
          categorizer={difficultyMap} // or use the function shown above
          colors={{
            Easy: "#86efac",
            Medium: "#f59e0b",
            Hard: "#a78bfa",
          }}
          showSideList
        />
      </div>
    </div>
  );
}

/* =======================
  HOW TO USE WITH REAL DATA
  -------------------------
  1) Make sure you installed recharts:
       npm i recharts
  2) Import the default page/component into your route, OR
     import { DegreeDifficultyPieDynamic } and feed your own props:
       <DegreeDifficultyPieDynamic
         degrees={degreesFromDB}
         categories={userDefinedBucketsArray}      // e.g. ["Easy","Medium","Hard","Very Hard"]
         categorizer={mapOrFunction}               // map by code/slug/_id OR fn(degree)=>bucket
       />
  3) Slice labels show Category (count). Hover to see the degree names.
     The side list shows names under each category as well.
======================= */
