import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const STATUS_COLOR = {
  "checked-in": "var(--lime)",
  "checked-out": "var(--sky)",
  "not-checked-in": "var(--sun)",
};

function NewEmployeeModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", jobPosition: "", department: "", manager: "", location: "", role: "EMPLOYEE" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await api.createEmployee({
  name: form.name,
  email: form.email,
  mobile: form.mobile,
  job_position: form.jobPosition,
  department: form.department,
  manager: form.manager,
  location: form.location,
  role: form.role
});
      setResult(data);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{result ? "Employee created" : "New Employee"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {result ? (
            <div>
              <p className="text-sm">
                <b>{result.employee.name}</b> can now sign in with:
              </p>
              <div className="field">
                <label>Login ID</label>
                <input readOnly value={result.employee.login_id} className="mono" />
              </div>
              <div className="field">
                <label>Temporary Password</label>
                <input readOnly value={result.temporaryPassword} className="mono" />
              </div>
              <p className="field-hint">They'll be asked to change this password on first login.</p>
              <button className="btn btn-primary btn-block" onClick={onClose}>Done</button>
            </div>
          ) : (
            <form onSubmit={onSubmit}>
  {error && <div className="error-banner">{error}</div>}

  <div className="field">
    <label>Full Name</label>
    <input value={form.name} onChange={update("name")} required autoFocus />
  </div>

  <div className="field">
    <label>Email</label>
    <input type="email" value={form.email} onChange={update("email")} required />
  </div>

  {/* 👉 ADD THIS HERE */}
  <div className="field">
    <label>Role</label>
    <select value={form.role} onChange={update("role")}>
      <option value="EMPLOYEE">EMPLOYEE</option>
      <option value="HR">HR</option>
      <option value="MANAGER">MANAGER</option>
      <option value="ADMIN">ADMIN</option>
    </select>
  </div>

  <div className="field-row">
    <div className="field">
      <label>Job Position</label>
      <input value={form.jobPosition} onChange={update("jobPosition")} />
    </div>

    <div className="field">
      <label>Department</label>
      <input value={form.department} onChange={update("department")} />
    </div>
  </div>

  <div className="field-row">
    <div className="field">
      <label>Manager</label>
      <input value={form.manager} onChange={update("manager")} />
    </div>

    <div className="field">
      <label>Location</label>
      <input value={form.location} onChange={update("location")} />
    </div>
  </div>

  <button className="btn btn-primary btn-block" disabled={busy}>
    {busy ? "Creating…" : "Create Employee"}
  </button>
</form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  function load() {
    setLoading(true);
    api
      .listEmployees()
      .then(setEmployees)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.department || "").toLowerCase().includes(q) || (e.job_position || "").toLowerCase().includes(q)
    );
  }, [employees, search]);

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <span className="eyebrow">Team · {employees.length} people</span>
          <h1>Employees</h1>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Employee
          </button>
        )}
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Search by name, department or role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <span className="spinner" /> Loading team…
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state panel">
          <h3>No one here yet</h3>
          <p>Try a different search, or add your first employee.</p>
        </div>
      ) : (
        <div className="emp-grid">
          {filtered.map((emp) => (
            <button key={emp.id} className="emp-card" onClick={() => navigate(`/employees/${emp.id}`)}>
              <div className="emp-card-top">
                <div className="emp-avatar">{initials(emp.name)}</div>
                <span
                  className="emp-status-dot"
                  style={{ background: STATUS_COLOR[emp.todayStatus] || "#ccc" }}
                  title={emp.todayStatus}
                />
              </div>
              <div className="emp-name">{emp.name}</div>
              <div className="emp-role">{emp.job_position || "—"}</div>
              <div className="emp-role text-soft">{emp.department}</div>
            </button>
          ))}
        </div>
      )}

      {showNew && (
        <NewEmployeeModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            load();
          }}
        />
      )}
    </div>
  );
}
