import React, { useMemo, useState } from "react";
import {
  FiChevronDown,
  FiSearch,
  FiGrid,
  FiList,
  FiCheckCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi";

/* ---------------- Demo Data ---------------- */
const DEMO_DEGREE = {
  id: "deg-1",
  name: "B.Sc. Computer Science",
  semesters: [
    { id: "sem-1", name: "Semester 1" },
    { id: "sem-2", name: "Semester 2" },
    { id: "sem-3", name: "Semester 3" },
    { id: "sem-4", name: "Semester 4" },
    { id: "sem-5", name: "Semester 5" },
    { id: "sem-6", name: "Semester 6" },
  ],
};

const DEMO_COURSES = [
  { id: "c-101", title: "Programming Fundamentals", semesterId: "sem-1", completion: 100 },
  { id: "c-102", title: "Discrete Mathematics", semesterId: "sem-1", completion: 45 },
  { id: "c-103", title: "Computer Organization", semesterId: "sem-1", completion: 0 },
  { id: "c-201", title: "Data Structures", semesterId: "sem-2", completion: 75 },
  { id: "c-202", title: "Operating Systems", semesterId: "sem-2", completion: 20 },
  { id: "c-301", title: "Database Systems", semesterId: "sem-3", completion: 10 },
  { id: "c-302", title: "Computer Networks", semesterId: "sem-3", completion: 0 },
  { id: "c-401", title: "Algorithms", semesterId: "sem-4", completion: 65 },
  { id: "c-501", title: "Software Engineering", semesterId: "sem-5", completion: 30 },
  { id: "c-601", title: "AI & ML", semesterId: "sem-6", completion: 5 },
];

const DEMO_ACTIVITIES = [
  { id: "a-1", title: "DSA Coding Challenge", status: "ongoing", courseId: "c-201", due: "2025-09-20" },
  { id: "a-2", title: "OS Lab Report", status: "pending", courseId: "c-202", due: "2025-09-12" },
  { id: "a-3", title: "DBMS Project Milestone 1", status: "completed", courseId: "c-301", due: "2025-08-28" },
  { id: "a-4", title: "Networks Quiz", status: "pending", courseId: "c-302", due: "2025-09-15" },
  { id: "a-5", title: "Algo Assignment", status: "ongoing", courseId: "c-401", due: "2025-09-18" },
  { id: "a-6", title: "SE Case Study", status: "completed", courseId: "c-501", due: "2025-08-25" },
  { id: "a-7", title: "AI Research Summary", status: "pending", courseId: "c-601", due: "2025-09-30" },
];

/* ---------------- Small UI Bits ---------------- */
const TabButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-sm transition ${
      active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
    }`}
  >
    {children}
  </button>
);

const StatusBadge = ({ status }) => {
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        <FiCheckCircle /> Completed
      </span>
    );
  if (status === "ongoing")
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <FiClock /> Ongoing
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
      <FiXCircle /> Pending
    </span>
  );
};

const CompletionPill = ({ pct }) => (
  <span
    className={`text-xs px-2 py-0.5 rounded-full border ${
      pct === 100
        ? "bg-green-50 text-green-700 border-green-200"
        : pct === 0
        ? "bg-gray-50 text-gray-600 border-gray-200"
        : "bg-sky-50 text-sky-700 border-sky-200"
    }`}
  >
    {pct}% complete
  </span>
);

/* ---------------- Main Component ---------------- */
export default function StudentDashboard() {
  const [selectedDegree] = useState(DEMO_DEGREE);
  const [selectedSemesterId, setSelectedSemesterId] = useState(DEMO_DEGREE.semesters[0].id);

  const [activeMainTab, setActiveMainTab] = useState("overview"); // overview | activities | courses
  const [activitiesTab, setActivitiesTab] = useState("ongoing"); // ongoing | completed | pending | all

  const [search, setSearch] = useState("");

  const semesters = selectedDegree.semesters;

  /* ---------- Data Filters ---------- */
  const semesterCourses = useMemo(
    () => DEMO_COURSES.filter((c) => c.semesterId === selectedSemesterId),
    [selectedSemesterId]
  );

  const filteredCourses = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return semesterCourses;
    return semesterCourses.filter((c) => c.title.toLowerCase().includes(needle));
  }, [semesterCourses, search]);

  const searchActivities = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return DEMO_ACTIVITIES;
    return DEMO_ACTIVITIES.filter((a) => a.title.toLowerCase().includes(needle));
  }, [search]);

  const tabbedActivities = useMemo(() => {
    if (activitiesTab === "all") return searchActivities;
    return searchActivities.filter((a) => a.status === activitiesTab);
  }, [activitiesTab, searchActivities]);

  const [showAllActivities, setShowAllActivities] = useState(false);
  const [activityView, setActivityView] = useState("cards");
  const [statusFilter, setStatusFilter] = useState(new Set(["all"]));
  const allActivitiesFiltered = useMemo(() => {
    if (statusFilter.has("all")) return searchActivities;
    return searchActivities.filter((a) => statusFilter.has(a.status));
  }, [statusFilter, searchActivities]);

  const toggleFilter = (val) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (val === "all") return new Set(["all"]);
      if (next.has("all")) next.delete("all");
      if (next.has(val)) next.delete(val);
      else next.add(val);
      if (next.size === 0) next.add("all");
      return next;
    });
  };

  /* ---------- Renderers ---------- */
  const ActivityCard = ({ item }) => (
    <div className="border rounded-lg p-4 bg-white flex justify-between items-start">
      <div>
        <div className="font-medium text-gray-900">{item.title}</div>
        <div className="text-xs text-gray-500 mt-1">Due: {item.due || "—"}</div>
        <div className="mt-2">
          <StatusBadge status={item.status} />
        </div>
      </div>
      <div className="text-xs text-gray-500">#{item.id}</div>
    </div>
  );

  const ActivityRow = ({ item }) => (
    <div className="grid grid-cols-12 gap-3 border-b py-3 items-center">
      <div className="col-span-6 md:col-span-7 text-gray-900 font-medium">{item.title}</div>
      <div className="col-span-3 md:col-span-2 text-xs text-gray-600">{item.due || "—"}</div>
      <div className="col-span-3 md:col-span-3 flex justify-end md:justify-start">
        <StatusBadge status={item.status} />
      </div>
    </div>
  );

  const CourseCard = ({ c }) => (
    <div className="border rounded-lg p-4 bg-white">
      <div className="font-medium text-gray-900">{c.title}</div>
      <div className="mt-2">
        <CompletionPill pct={c.completion} />
      </div>
      <div className="mt-2 w-full bg-gray-100 h-2 rounded">
        <div
          className={`h-2 rounded ${c.completion === 100 ? "bg-green-500" : "bg-indigo-500"}`}
          style={{ width: `${c.completion}%` }}
        />
      </div>
    </div>
  );

  /* ---------- Header (Global) ---------- */
  return (
    <div className="max-w-9xl mx-auto w-full px-5 md:px-8 py-6">
      {/* Top App Header */}
<header className="border rounded-xl bg-white p-4 md:p-5 mb-5 shadow-sm">
  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
    {/* Left: Title + Degree + Semester */}
    <div className="flex flex-col md:flex-row md:items-center gap-4">
      {/* Dashboard Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Student Dashboard</h1>
      </div>

      {/* Divider (only on desktop for spacing) */}
      <div className="hidden md:block w-px bg-gray-300 mx-4"></div>

      {/* Degree + Semester */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-lg font-semibold text-gray-900">{selectedDegree.name}</span>

        {/* Semester Dropdown */}
        <div className="relative">
          <select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            className="appearance-none pr-8 pl-3 py-2 rounded border text-sm bg-white hover:border-gray-400 cursor-pointer"
            title="Select semester"
          >
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" />
        </div>
      </div>
            <div>
        <ul className="flex flex-wrap items-center ">
          <li><a href="/grade-book" className="btn btn-sm bg-gray-100 rounded-pill px-3 m-2">Grade Book</a></li>
          <li><a href="/grade-book" className="btn btn-sm bg-gray-100 rounded-pill px-3 m-2">Attendence</a></li>
        </ul>
      </div>
    </div>

    {/* Right: Search + Tabs */}
    <div className="flex items-center gap-3 w-full md:w-auto">
      {/* Search */}
      <div className="relative flex-1 md:w-[320px]">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search courses or activities…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-full border border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 px-10 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm"
        />
      </div>



      {/* Tabs */}
      <div className="flex items-center gap-2">
        <TabButton
          active={activeMainTab === "overview"}
          onClick={() => {
            setActiveMainTab("overview");
            setShowAllActivities(false);
          }}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeMainTab === "activities"}
          onClick={() => setActiveMainTab("activities")}
        >
          Activities
        </TabButton>
        <TabButton
          active={activeMainTab === "courses"}
          onClick={() => {
            setActiveMainTab("courses");
            setShowAllActivities(false);
          }}
        >
          Courses
        </TabButton>
      </div>
    </div>
  </div>
</header>


      {/* ---------------- CONTENT ---------------- */}
      {activeMainTab === "overview" && (
        <section className="space-y-5">
          {/* Activities quick view */}
          <div className="border rounded-xl bg-white p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
              <div className="flex items-center gap-2">
                {["ongoing", "completed", "pending", "all"].map((k) => (
                  <TabButton key={k} active={activitiesTab === k} onClick={() => setActivitiesTab(k)}>
                    {k[0].toUpperCase() + k.slice(1)}
                  </TabButton>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {tabbedActivities.slice(0, 6).map((a) => (
                <ActivityCard key={a.id} item={a} />
              ))}
              {tabbedActivities.length === 0 && (
                <div className="text-sm text-gray-500">No activities found.</div>
              )}
            </div>

            <div className="mt-4 text-right">
              <button
                className="text-sm text-indigo-700 hover:underline"
                onClick={() => {
                  setActiveMainTab("activities");
                  setShowAllActivities(true);
                }}
              >
                View all activities →
              </button>
            </div>
          </div>

          {/* Courses quick view (selected semester) */}
          <div className="border rounded-xl bg-white p-4 md:p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {semesters.find((s) => s.id === selectedSemesterId)?.name} • Courses
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCourses.map((c) => (
                <CourseCard key={c.id} c={c} />
              ))}
              {filteredCourses.length === 0 && (
                <div className="text-sm text-gray-500">No courses found.</div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeMainTab === "activities" && (
        <>
          {!showAllActivities ? (
            <section className="border rounded-xl bg-white p-4 md:p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Activities</h2>
                <div className="flex items-center gap-2">
                  {["ongoing", "completed", "pending", "all"].map((k) => (
                    <TabButton key={k} active={activitiesTab === k} onClick={() => setActivitiesTab(k)}>
                      {k[0].toUpperCase() + k.slice(1)}
                    </TabButton>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tabbedActivities.map((a) => (
                  <ActivityCard key={a.id} item={a} />
                ))}
                {tabbedActivities.length === 0 && (
                  <div className="text-sm text-gray-500">No activities found.</div>
                )}
              </div>

              <div className="mt-4 text-right">
                <button
                  className="text-sm text-indigo-700 hover:underline"
                  onClick={() => setShowAllActivities(true)}
                >
                  All Activities (card/list + filters) →
                </button>
              </div>
            </section>
          ) : (
            <section className="border rounded-xl bg-white">
              <div className="flex flex-col md:flex-row">
                {/* Left Filter Panel */}
                <aside className="md:w-64 border-b md:border-b-0 md:border-r p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Status Filters
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: "all", label: "All" },
                      { id: "ongoing", label: "Ongoing" },
                      { id: "completed", label: "Completed" },
                      { id: "pending", label: "Pending" },
                    ].map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={statusFilter.has(f.id)}
                          onChange={() => toggleFilter(f.id)}
                        />
                        <span>{f.label}</span>
                      </label>
                    ))}
                  </div>
                </aside>

                {/* Right Results */}
                <main className="flex-1 p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {allActivitiesFiltered.length} activities
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${
                          activityView === "cards" ? "bg-gray-100" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setActivityView("cards")}
                        title="Cards view"
                      >
                        <FiGrid /> Cards
                      </button>
                      <button
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded border ${
                          activityView === "list" ? "bg-gray-100" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setActivityView("list")}
                        title="List view"
                      >
                        <FiList /> List
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {activityView === "cards" ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {allActivitiesFiltered.map((a) => (
                          <ActivityCard key={a.id} item={a} />
                        ))}
                        {allActivitiesFiltered.length === 0 && (
                          <div className="text-sm text-gray-500">No activities found.</div>
                        )}
                      </div>
                    ) : (
                      <div className="border rounded-lg bg-white p-3">
                        <div className="grid grid-cols-12 gap-3 text-xs text-gray-500 border-b pb-2">
                          <div className="col-span-6 md:col-span-7">Title</div>
                          <div className="col-span-3 md:col-span-2">Due</div>
                          <div className="col-span-3 md:col-span-3">Status</div>
                        </div>
                        <div>
                          {allActivitiesFiltered.map((a) => (
                            <ActivityRow key={a.id} item={a} />
                          ))}
                          {allActivitiesFiltered.length === 0 && (
                            <div className="text-sm text-gray-500 p-3">No activities found.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </main>
              </div>
            </section>
          )}
        </>
      )}

      {activeMainTab === "courses" && (
        <section className="border rounded-xl bg-white p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              All Courses • {selectedDegree.name}
            </h2>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredCourses.map((c) => (
              <CourseCard key={c.id} c={c} />
            ))}
            {filteredCourses.length === 0 && (
              <div className="text-sm text-gray-500">No courses found.</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
