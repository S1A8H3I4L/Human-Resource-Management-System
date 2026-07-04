import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Stamp from "../components/Stamp";

function monthLabel(month) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}
function shiftMonth(month, delta) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dateLabel(date) {
  return new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}
function shiftDate(date, delta) {
  const d = new Date(date);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

function MyAttendance() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.myAttendance(month).then(setData).finally(() => setLoading(false));
  }, [month]);

  const summary = data?.summary;

  return (
    <>
      <div className="chip-row">
        <div className="chip">
          <span className="value">{summary?.daysPresent ?? "—"}</span>
          <span className="label">Days present</span>
        </div>
        <div className="chip">
          <span className="value">{summary?.totalDaysInMonth ?? "—"}</span>
          <span className="label">Total days</span>
        </div>
        <div className="chip">
          <Stamp status={summary?.todayStatus?.check_in ? (summary?.todayStatus?.check_out ? "checked-out" : "checked-in") : "not-checked-in"} />
          <span className="label" style={{ marginTop: 6 }}>Today</span>
        </div>
      </div>

      <div className="toolbar">
        <button className="btn btn-sm" onClick={() => setMonth((m) => shiftMonth(m, -1))}>←</button>
        <button className="btn btn-sm" onClick={() => setMonth((m) => shiftMonth(m, 1))}>→</button>
        <strong style={{ fontFamily: "var(--font-display)" }}>{monthLabel(month)}</strong>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Work Hours</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 30 }}><span className="spinner" /></td></tr>
              ) : data.records.length === 0 ? (
                <tr><td colSpan={5} className="text-soft" style={{ textAlign: "center", padding: 30 }}>No attendance recorded this month.</td></tr>
              ) : (
                data.records.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.work_date}</td>
                    <td className="mono">{r.check_in || "—"}</td>
                    <td className="mono">{r.check_out || "—"}</td>
                    <td className="mono">{r.work_hours ? r.work_hours.toFixed(2) + "h" : "—"}</td>
                    <td><Stamp status={r.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function TeamAttendance() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.teamAttendance(date).then(setData).finally(() => setLoading(false));
  }, [date]);

  return (
    <>
      <div className="toolbar">
        <button className="btn btn-sm" onClick={() => setDate((d) => shiftDate(d, -1))}>←</button>
        <button className="btn btn-sm" onClick={() => setDate((d) => shiftDate(d, 1))}>→</button>
        <strong style={{ fontFamily: "var(--font-display)" }}>{dateLabel(date)}</strong>
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Employee</th><th>Check In</th><th>Check Out</th><th>Work Hours</th><th>Status</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 30 }}><span className="spinner" /></td></tr>
              ) : !data || data.records.length === 0 ? (
                <tr><td colSpan={5} className="text-soft" style={{ textAlign: "center", padding: 30 }}>No one has checked in on this day yet.</td></tr>
              ) : (
                data.records.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="mono">{r.check_in || "—"}</td>
                    <td className="mono">{r.check_out || "—"}</td>
                    <td className="mono">{r.work_hours ? r.work_hours.toFixed(2) + "h" : "—"}</td>
                    <td><Stamp status={r.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function Attendance() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState("mine");

  return (
    <div className="container">
      <div className="page-head">
        <div>
          <span className="eyebrow">Punch card</span>
          <h1>Attendance</h1>
        </div>
        {isAdmin && (
          <div className="tabs" style={{ border: "none", marginBottom: 0 }}>
            <button className={`tab-btn${view === "mine" ? " active" : ""}`} onClick={() => setView("mine")}>My Attendance</button>
            <button className={`tab-btn${view === "team" ? " active" : ""}`} onClick={() => setView("team")}>Team</button>
          </div>
        )}
      </div>
      {view === "mine" ? <MyAttendance /> : <TeamAttendance />}
    </div>
  );
}
