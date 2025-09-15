// pages/notifications/CreateNotification.jsx
import React, { useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../components/auth_components/AuthManager.jsx";

const API = import.meta?.env?.VITE_API_URL || "http://localhost:3011";

/* ---------------- UI primitives (match CreateQuestion style) ---------------- */
const Section = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="rounded-lg border p-4 mb-6">
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-gray-600">{open ? "−" : "+"}</span>
      </div>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
};

const Field = ({ label, children, required, hint }) => (
  <div className="mb-4">
    <label className="block font-medium mb-1">
      {label} {required ? <span className="text-red-600">*</span> : null}
    </label>
    {children}
    {hint ? <div className="text-xs text-gray-500 mt-1">{hint}</div> : null}
  </div>
);

const Row = ({ children }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
);

const Button = ({ className = "", ...props }) => (
  <button
    className={
      "px-3 py-2 rounded-md border border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100 " +
      className
    }
    {...props}
  />
);

const PrimaryButton = ({ className = "", ...props }) => (
  <button
    className={
      "px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 " +
      className
    }
    {...props}
  />
);

/* ---------------- constants ---------------- */
const ROLES = [
  "superadmin",
  "admin",
  "instructor",
  "teacher",
  "student",
  "author",
];
const CATEGORIES = [
  "general",
  "exam",
  "result",
  "fees",
  "events",
  "attendance",
  "assignment",
  "system",
];
const PRIORITY = ["low", "normal", "high", "urgent"];
const CHANNELS = ["inapp", "email", "sms"];
const AUDIENCE_TYPES = [
  { value: "all", label: "All users" },
  { value: "roles", label: "By roles" },
  { value: "users", label: "Specific users" },
  { value: "contextual", label: "Contextual (degree/semester/course)" },
];

/* ---------------- helpers ---------------- */
const authHeaders = () => {
  let raw = localStorage.getItem("token") || "";
  if (!raw) return { "Content-Type": "application/json" };

  // remove accidental "Bearer " prefix or quotes
  raw = raw.replace(/^Bearer\s+/i, "").replace(/^"(.+)"$/, "$1");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${raw}`,
  };
};

export default function CreateNotification() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useContext(AuthContext);
  const role = (user?.role || "").toLowerCase();
  const isSuperadmin = role === "superadmin";

  // content
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [html, setHtml] = useState("");

  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [channels, setChannels] = useState(["inapp"]);

  // audience
  const [audienceType, setAudienceType] = useState("all");
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [excludeUsers, setExcludeUsers] = useState([]);

  // contextual filters
  const [degrees, setDegrees] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [courses, setCourses] = useState([]);
  const [contextDegreeId, setContextDegreeId] = useState("");
  const [contextSemesterId, setContextSemesterId] = useState("");
  const [contextCourseId, setContextCourseId] = useState("");

  // data sources
  const [allUsers, setAllUsers] = useState([]);

  // flow state
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState(null);
  const [serverMsg, setServerMsg] = useState("");
  const [serverErr, setServerErr] = useState("");

  /* ------------- toggle helpers ------------- */
  const toggleArray = (arr, value) =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];

  const onToggleRole = (r) => setSelectedRoles((prev) => toggleArray(prev, r));
  const onToggleChannel = (ch) => setChannels((prev) => toggleArray(prev, ch));
  const onToggleExclude = (id) =>
    setExcludeUsers((prev) => toggleArray(prev, id));
  const onToggleSelectedUser = (id) =>
    setSelectedUsers((prev) => toggleArray(prev, id));

  /* ------------- load lists ------------- */
  useEffect(() => {
    if (!isLoggedIn) return;

    const loadUsers = async () => {
      try {
        const r = await fetch(`${API}/api/all-users`, {
          headers: authHeaders(),
        });
        const j = await r.json();
        const data = Array.isArray(j?.users)
          ? j.users
          : Array.isArray(j)
          ? j
          : Array.isArray(j?.data)
          ? j.data
          : [];
        const normalized = data.map((u) => ({
          _id: u._id || u.id,
          name: u.name || u.fullName || u.username || u.email || "Unknown",
          email: u.email || "",
          role: (u.role || "").toLowerCase(),
          degree: u.degree || u.degreeId || u.degree_id || null,
          semester: u.semester || u.semester || u.semesterId || null,
          course: u.course || u.courseId || null,
        }));
        setAllUsers(normalized.filter((u) => u._id));
      } catch {
        setAllUsers([]);
      }
    };

    const loadDegrees = async () => {
      try {
        const r = await fetch(`${API}/api/list-degrees`, {
          headers: authHeaders(),
        });
        const j = await r.json();
        const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setDegrees(arr);
      } catch {
        setDegrees([]);
      }
    };

    const loadSemesters = async () => {
      try {
        const r = await fetch(`${API}/api/semesters`, {
          headers: authHeaders(),
        });
        const j = await r.json();
        const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setSemesters(arr);
      } catch {
        setSemesters([]);
      }
    };

    const loadCourses = async () => {
      try {
        const r = await fetch(`${API}/api/list-courses`, {
          headers: authHeaders(),
        });
        const j = await r.json();
        const arr = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
        setCourses(arr);
      } catch {
        setCourses([]);
      }
    };

    loadUsers();
    loadDegrees();
    loadSemesters();
    loadCourses();
  }, [isLoggedIn]);

  /* ------------- audience preview ------------- */
  const roleMatches = (u) =>
    selectedRoles.length > 0 ? selectedRoles.includes(u.role) : false;

  const contextualMatches = (u) => {
    if (!contextDegreeId && !contextSemesterId && !contextCourseId)
      return false;
    const degreeOk = contextDegreeId
      ? String(u.degree) === String(contextDegreeId)
      : true;
    const semOk = contextSemesterId
      ? String(u.semester) === String(contextSemesterId) ||
        String(u.semester) === String(contextSemesterId)
      : true;
    const courseOk = contextCourseId
      ? String(u.course) === String(contextCourseId)
      : true;
    return degreeOk, semOk, courseOk;
  };

  const baseCandidates = useMemo(() => {
    switch (audienceType) {
      case "all":
        return allUsers;
      case "roles":
        return allUsers.filter(roleMatches);
      case "users":
        return allUsers.filter((u) => selectedUsers.includes(u._id));
      case "contextual":
        return allUsers.filter(contextualMatches);
      default:
        return [];
    }
  }, [
    audienceType,
    allUsers,
    selectedRoles,
    selectedUsers,
    contextDegreeId,
    contextSemesterId,
    contextCourseId,
  ]);

  const recipients = useMemo(() => {
    const excl = new Set(excludeUsers);
    return baseCandidates.filter((u) => !excl.has(u._id));
  }, [baseCandidates, excludeUsers]);

  useEffect(() => {
    setExcludeUsers([]);
    if (audienceType !== "users") setSelectedUsers([]);
    if (audienceType !== "roles") setSelectedRoles([]);
  }, [audienceType]);

  /* ------------- payload builder ------------- */
  const buildPayload = () => ({
    title,
    message,
    html: html || undefined,
    category,
    priority,
    channels,
    audienceType,
    roles: audienceType === "roles" ? selectedRoles : undefined,
    users: audienceType === "users" ? selectedUsers : undefined,
    context:
      audienceType === "contextual"
        ? {
            degree: contextDegreeId || undefined,
            semester: contextSemesterId || undefined,
            course: contextCourseId || undefined,
          }
        : undefined,
    excludeUsers: excludeUsers.length ? excludeUsers : undefined,
    status: "draft",
  });

  /* ------------- actions ------------- */
  const createDraft = async () => {
    setServerErr("");
    setServerMsg("");

    if (!isSuperadmin) {
      setServerErr("Only superadmin can create notifications.");
      return null;
    }
    if (!title?.trim() || !message?.trim()) {
      setServerErr("Title and Message are required.");
      return null;
    }
    if (audienceType === "users" && selectedUsers.length === 0) {
      setServerErr("Select at least one user for 'Specific users'.");
      return null;
    }
    if (audienceType === "roles" && selectedRoles.length === 0) {
      setServerErr("Select at least one role for 'By roles'.");
      return null;
    }

    setLoading(true);
    try {
      const r = await fetch(`${API}/api/create-notification`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildPayload()),
      });
      const j = await r.json();
      if (!r.ok) {
        setServerErr(j?.message || j?.error || "Failed to save draft.");
        return null;
      }
      const obj = j?.data || j;
      const id = obj?._id || obj?.id || obj?.notification?._id || null;
      setCreatingId(id);
      setServerMsg("✅ Draft saved.");
      return id;
    } catch {
      setServerErr("Network error while saving draft.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setServerErr("");
    setServerMsg("");
    if (!isSuperadmin) {
      setServerErr("Only superadmin can update notification status.");
      return;
    }
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/update-notification/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const j = await r.json();
      if (!r.ok) {
        setServerErr(j?.message || j?.error || "Failed to update status.");
        return;
      }
      setServerMsg(`✅ Status updated to ${status}.`);
    } catch {
      setServerErr("Network error while updating status.");
    } finally {
      setLoading(false);
    }
  };

  const sendNow = async () => {
    setServerErr("");
    setServerMsg("");
    if (!isSuperadmin) {
      setServerErr("Only superadmin can send notifications.");
      return;
    }
    setLoading(true);
    try {
      let id = creatingId;
      if (!id) {
        id = await createDraft();
        if (!id) return; // createDraft shows error
      }
      const r = await fetch(`${API}/api/send-notification/${id}`, {
        method: "POST",
        headers: authHeaders(),
      });
      const j = await r.json();
      if (!r.ok) {
        setServerErr(j?.message || j?.error || "Failed to send notification.");
        return;
      }
      setServerMsg("✅ Notification queued to send.");
    } catch {
      setServerErr("Network error while sending notification.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------- small UI helpers ------------- */
  const ChannelCheckbox = ({ ch }) => (
    <label className="inline-flex items-center gap-2 mr-4">
      <input
        type="checkbox"
        checked={channels.includes(ch)}
        onChange={() =>
          setChannels((prev) =>
            prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
          )
        }
      />
      <span>{ch.toUpperCase()}</span>
    </label>
  );

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Create Notification</h1>
        <Button onClick={() => navigate("/all-notifications")}>
          Back to Notifications
        </Button>
      </div>

      {!isSuperadmin && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          You are not logged in as <b>superadmin</b>. Creating/sending will be
          blocked by the server.
        </div>
      )}

      {/* Content */}
      <Section title="Content" defaultOpen={true}>
        <Row>
          <Field label="Title" required>
            <input
              className="w-full border rounded-md p-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Midterm Exam Announcement"
            />
          </Field>

          <Field label="Category">
            <select
              className="w-full border rounded-md p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </Row>

        <Row>
          <Field label="Priority">
            <select
              className="w-full border rounded-md p-2"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              {PRIORITY.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Channels">
            <div className="mt-1 flex flex-wrap">
              {CHANNELS.map((ch) => (
                <ChannelCheckbox key={ch} ch={ch} />
              ))}
            </div>
          </Field>
        </Row>

        <Field label="Message (plain text)" required>
          <textarea
            className="w-full border rounded-md p-2"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message…"
          />
        </Field>

        <Field label="HTML (optional, for email)">
          <textarea
            className="w-full border rounded-md p-2"
            rows={4}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="<p>HTML version of your message</p>"
          />
        </Field>
      </Section>

      {/* Audience */}
      <Section title="Audience" defaultOpen={true}>
        <Field
          label="Audience Type"
          hint="Choose who should receive this notification"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AUDIENCE_TYPES.map((opt) => (
              <label
                key={opt.value}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
              >
                <input
                  type="radio"
                  name="audienceType"
                  checked={audienceType === opt.value}
                  onChange={() => setAudienceType(opt.value)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </Field>

        {audienceType === "roles" && (
          <Field label="Select roles">
            <div className="flex flex-wrap">
              {ROLES.map((r) => (
                <label
                  key={r}
                  className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mr-2 mb-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(r)}
                    onChange={() =>
                      setSelectedRoles((prev) =>
                        prev.includes(r)
                          ? prev.filter((x) => x !== r)
                          : [...prev, r]
                      )
                    }
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              You can deselect specific people below in the preview.
            </div>
          </Field>
        )}

        {audienceType === "users" && (
          <Field label="Pick users">
            <div className="max-h-64 overflow-auto border rounded-md p-2">
              {allUsers.map((u) => (
                <label key={u._id} className="flex items-center py-1">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedUsers.includes(u._id)}
                    onChange={() =>
                      setSelectedUsers((prev) =>
                        prev.includes(u._id)
                          ? prev.filter((x) => x !== u._id)
                          : [...prev, u._id]
                      )
                    }
                  />
                  <span className="text-sm">
                    {u.name}{" "}
                    <span className="text-gray-500">({u.email || u.role})</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
        )}

        {audienceType === "contextual" && (
          <Row>
            <Field label="Degree">
              <select
                className="w-full border rounded-md p-2"
                value={contextDegreeId}
                onChange={(e) => setContextDegreeId(e.target.value)}
              >
                <option value="">-- Any degree --</option>
                {degrees.map((d) => (
                  <option key={d._id || d.id} value={d._id || d.id}>
                    {d.name || d.title || d.slug || d._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Semester">
              <select
                className="w-full border rounded-md p-2"
                value={contextSemesterId}
                onChange={(e) => setContextSemesterId(e.target.value)}
              >
                <option value="">-- Any semester --</option>
                {semesters.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name || s.title || s.slug || s._id}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Course">
              <select
                className="w-full border rounded-md p-2"
                value={contextCourseId}
                onChange={(e) => setContextCourseId(e.target.value)}
              >
                <option value="">-- Any course --</option>
                {courses.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title || c.name || c.slug || c._id}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
        )}

        {(audienceType === "all" ||
          audienceType === "roles" ||
          audienceType === "contextual") && (
          <Field label="Exclude specific users">
            <div className="max-h-48 overflow-auto border rounded-md p-2">
              {baseCandidates.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No candidates to exclude yet. Adjust audience selection above.
                </div>
              ) : (
                baseCandidates.map((u) => (
                  <label key={u._id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={excludeUsers.includes(u._id)}
                      onChange={() =>
                        setExcludeUsers((prev) =>
                          prev.includes(u._id)
                            ? prev.filter((x) => x !== u._id)
                            : [...prev, u._id]
                        )
                      }
                    />
                    <span className="text-sm">
                      {u.name}{" "}
                      <span className="text-gray-500">
                        ({u.email || u.role})
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </Field>
        )}
      </Section>

      {/* Preview */}
      <Section title="Recipient Preview" defaultOpen={false}>
        <div className="mb-3 text-sm">
          <span className="font-medium">Candidates:</span>{" "}
          {baseCandidates.length} &nbsp;|&nbsp;{" "}
          <span className="font-medium">Will receive:</span> {recipients.length}
        </div>
        <div className="max-h-72 overflow-auto border rounded-md p-2">
          {recipients.length === 0 ? (
            <div className="text-sm text-gray-500">
              No recipients yet. Adjust audience or remove exclusions.
            </div>
          ) : (
            recipients.map((u) => (
              <div
                key={u._id}
                className="flex items-center justify-between py-1"
              >
                <div className="text-sm">
                  {u.name}{" "}
                  <span className="text-gray-500">
                    ({u.email || u.role || "user"})
                  </span>
                </div>
                <button
                  className="text-xs text-rose-600 hover:underline"
                  onClick={() =>
                    setExcludeUsers((prev) =>
                      prev.includes(u._id)
                        ? prev.filter((x) => x !== u._id)
                        : [...prev, u._id]
                    )
                  }
                  title="Exclude this user"
                >
                  Exclude
                </button>
              </div>
            ))
          )}
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Server resolves the final audience at send-time.
        </div>
      </Section>

      {/* Server feedback */}
      {(serverErr || serverMsg) && (
        <div
          className={
            "mb-4 rounded-md px-3 py-2 text-sm " +
            (serverErr
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-green-50 text-green-700 border border-green-200")
          }
        >
          {serverErr || serverMsg}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-gray-600">
          {creatingId ? (
            <>
              <span className="font-medium">Notification ID:</span> {creatingId}
            </>
          ) : (
            "Notification not saved yet."
          )}
        </div>

        <div className="flex items-center gap-3">
          <PrimaryButton
            type="button"
            onClick={createDraft}
            disabled={
              loading || !isSuperadmin || !title?.trim() || !message?.trim()
            }
          >
            {loading ? "Saving…" : "Save Draft"}
          </PrimaryButton>

          <Button
            type="button"
            onClick={sendNow}
            disabled={
              loading || !isSuperadmin || !title?.trim() || !message?.trim()
            }
          >
            Send Now
          </Button>

          <Button
            type="button"
            onClick={() => updateStatus(creatingId, "draft")}
            disabled={loading || !isSuperadmin || !creatingId}
          >
            Activate
          </Button>

          <Button
            type="button"
            className="text-rose-600 border-rose-300"
            onClick={() => updateStatus(creatingId, "canceled")}
            disabled={loading || !isSuperadmin || !creatingId}
          >
            Deactivate
          </Button>
        </div>
      </div>
    </div>
  );
}
