import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Stamp from "../components/Stamp";

const TYPES = ["Paid Time Off", "Sick Leave", "Unpaid Leave"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];


function MiniCalendar({ requests }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const leaveDays = useMemo(() => {
    const set = new Set();
    requests
      .filter((r) => r.status === "approved")
      .forEach((r) => {
        for (let d = new Date(r.start_date); d <= new Date(r.end_date); d.setDate(d.getDate() + 1)) {
          set.add(d.toISOString().slice(0, 10));
        }
      });
    return set;
  }, [requests]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="panel panel-pad">
      <h3 style={{ marginBottom: 12, fontSize: 15 }}>
        {today.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </h3>
      <div className="calendar-grid" style={{ marginBottom: 6 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="calendar-weekday">{w}</div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="calendar-cell muted" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const isToday = dateStr === today.toISOString().slice(0, 10);
          const onLeave = leaveDays.has(dateStr);
          return (
            <div key={i} className={`calendar-cell ${onLeave ? "leave" : "present"} ${isToday ? "selected" : ""}`}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="flex gap-16" style={{ marginTop: 14 }}>
        <span className="text-sm flex items-center gap-8"><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--sky)", display: "inline-block" }} /> Approved leave</span>
        <span className="text-sm flex items-center gap-8"><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--indigo)", display: "inline-block" }} /> Today</span>
      </div>
    </div>
  );
}

function NewRequestModal({ balances, onClose, onCreated }) {
const [certificate, setCertificate] = useState(null);
  const [form, setForm] = useState({ type: TYPES[0], startDate: "", endDate: "", remarks: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (
  certificate &&
  certificate.size > 5 * 1024 * 1024
) {
  setError("Maximum file size is 5 MB.");
  setBusy(false);
  return;
}

if (
  form.type === "Sick Leave" &&
  !certificate
) {
  setError("Please upload a medical certificate.");
  setBusy(false);
  return;
}

const formData = new FormData();

formData.append("type", form.type);
formData.append("startDate", form.startDate);
formData.append("endDate", form.endDate);
formData.append("remarks", form.remarks);

if (certificate) {
  formData.append("certificate", certificate);
}

await api.applyTimeOff(formData);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const balance = balances.find((b) => b.type === form.type);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Time off Request</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-banner">{error}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Time off Type</label>
              <select value={form.type} onChange={update("type")}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {balance && <span className="field-hint">{balance.remaining_days} days available</span>}
            </div>
            <div className="field-row">
              <div className="field">
                <label>Start Date</label>
                <input type="date" value={form.startDate} onChange={update("startDate")} required />
              </div>
              <div className="field">
                <label>End Date</label>
                <input type="date" value={form.endDate} onChange={update("endDate")} required />
              </div>
            </div>
<div className="field">
  <label>Medical Certificate / Supporting Document</label>

  <input
    type="file"
    accept=".pdf,.jpg,.jpeg,.png"
    onChange={(e) => {
      if (e.target.files.length > 0) {
        setCertificate(e.target.files[0]);
      }
    }}
  />

  <small className="field-hint">
    PDF, JPG, JPEG, PNG (Maximum 5 MB)
  </small>

  {certificate && (
    <div className="field-hint">
      Selected File: <strong>{certificate.name}</strong>
    </div>
  )}

  {certificate && (
    <button
      type="button"
      className="btn btn-sm"
      onClick={() => setCertificate(null)}
    >
      Remove File
    </button>
  )}
</div>
            <div className="field">
              <label>Remarks</label>
              <textarea rows={3} value={form.remarks} onChange={update("remarks")} placeholder="Optional note for your manager" />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>{busy ? "Submitting…" : "Submit"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MyTimeOff() {
  const [requests, setRequests] = useState([]);
  const [balances, setBalances] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    Promise.all([api.myTimeOff(), api.leaveBalances()])
      .then(([r, b]) => {
        setRequests(r);
        setBalances(b);
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <>
      <div className="chip-row">
        {balances.map((b) => (
          <div className="chip" key={b.type}>
            <span className="value">{b.remaining_days}</span>
            <span className="label">{b.type}</span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>+ New</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="panel">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th></tr></thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 30 }}><span className="spinner" /></td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={5} className="text-soft" style={{ textAlign: "center", padding: 30 }}>No time off requested yet.</td></tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.type}</td>
                      <td className="mono">{r.start_date}</td>
                      <td className="mono">{r.end_date}</td>
                      <td className="mono">{r.days}</td>
                      <td><Stamp status={r.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <MiniCalendar requests={requests} />
      </div>

      {showModal && <NewRequestModal balances={balances} onClose={() => setShowModal(false)} onCreated={load} />}
    </>
  );
}

function TeamTimeOff() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    api.teamTimeOff().then(setRequests).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function review(id, decision) {
    setBusyId(id);
    try {
      await api.reviewTimeOff(id, { decision });
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="panel">
      <div className="table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 30 }}><span className="spinner" /></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} className="text-soft" style={{ textAlign: "center", padding: 30 }}>No requests yet.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td>{r.employee_name}</td>
                  <td>{r.type}</td>
                  <td className="mono">{r.start_date}</td>
                  <td className="mono">{r.end_date}</td>
                  <td className="mono">{r.days}</td>
                  <td><Stamp status={r.status} /></td>
                  <td>
                    {r.status === "pending" && (
                      <div className="flex gap-8">
                        <button className="btn btn-sm btn-success" disabled={busyId === r.id} onClick={() => review(r.id, "approved")}>Approve</button>
                        <button className="btn btn-sm btn-danger" disabled={busyId === r.id} onClick={() => review(r.id, "rejected")}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function TimeOff() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState("mine");

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <span className="eyebrow">Leave desk</span>
          <h1>Time Off</h1>
        </div>
        {isAdmin && (
          <div className="tabs" style={{ border: "none", marginBottom: 0 }}>
            <button className={`tab-btn${view === "mine" ? " active" : ""}`} onClick={() => setView("mine")}>My Requests</button>
            <button className={`tab-btn${view === "team" ? " active" : ""}`} onClick={() => setView("team")}>Team Approvals</button>
          </div>
        )}
      </div>
      {view === "mine" ? <MyTimeOff /> : <TeamTimeOff />}
    </div>
  );
}
