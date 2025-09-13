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
  "#86efac",
  "#f59e0b",
  "#a78bfa",
  "#60a5fa",
  "#f97316",
  "#34d399",
  "#c084fc",
  "#f472b6",
  "#22d3ee",
  "#fca5a5",
];

function resolveCategory(deg, categorizer) {
  if (!categorizer) return "Uncategorized";
  if (typeof categorizer === "function")
    return categorizer(deg) ?? "Uncategorized";
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
      <div
        style={{
          fontSize: 12,
          color: "#475569",
          maxHeight: 180,
          overflow: "auto",
        }}
      >
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
                  <div
                    key={name}
                    className="rounded-xl border border-slate-200 p-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{
                          background: colorByCategory[name] || "#94a3b8",
                        }}
                      />
                      <div className="font-medium text-sm">
                        {name}{" "}
                        <span className="text-slate-500">({items.length})</span>
                      </div>
                    </div>
                    {items.length ? (
                      <ul className="text-sm text-slate-600 list-disc ml-5 space-y-1 max-h-36 overflow-auto">
                        {items.map((n) => (
                          <li key={`${name}-${n}`}>{n}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-slate-400 italic">
                        No degrees
                      </div>
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
  {
    _id: "68a9b746a8dde74b3a228fba",
    name: "Master of Computer Applications",
    code: "MCA",
    slug: "master-of-computer-applications",
    level: "postgraduate",
  },
  {
    _id: "68a9b746a8dde74b3a228fbb",
    name: "Master of Business Administration (Finance)",
    code: "MBA-FIN",
    slug: "master-of-business-administration-finance",
    level: "postgraduate",
  },
  {
    _id: "68a9b746a8dde74b3a228fbc",
    name: "Doctor of Philosophy in Physics",
    code: "PHD-PHY",
    slug: "doctor-of-philosophy-in-physics",
    level: "doctorate",
  },
  {
    _id: "68a9b746a8dde74b3a228fbe",
    name: "Postgraduate Diploma in Cyber Security",
    code: "PGD-CYBER",
    slug: "postgraduate-diploma-in-cyber-security",
    level: "postgraduate",
  },
  {
    _id: "68a9b7f3b164ba4ece449262",
    name: "Master of Data Science",
    code: "MDS",
    slug: "master-of-data-science",
    level: "postgraduate",
  },
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
