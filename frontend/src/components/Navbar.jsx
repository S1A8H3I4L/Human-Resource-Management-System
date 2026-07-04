import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

function initials(name = "") {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    api
      .myAttendance(new Date().toISOString().slice(0, 7))
      .then((data) => {
        const t = data.summary?.todayStatus;
        setCheckedIn(!!(t && t.check_in && !t.check_out));
      })
      .catch(() => {});
  }, []);

  async function toggleCheck() {
    setBusy(true);
    try {
      if (checkedIn) {
        await api.checkOut();
        setCheckedIn(false);
      } else {
        await api.checkIn();
        setCheckedIn(true);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <span className="brand-mark" />
          Shiftwork
        </div>
        <NavLink to="/dashboard" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          Employees
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          Attendance
        </NavLink>
        <NavLink to="/timeoff" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
          Time Off
        </NavLink>
        <div className="nav-spacer" />

        <button className="btn btn-sm" onClick={toggleCheck} disabled={busy}>
          {checkedIn ? "Check Out →" : "Check In →"}
        </button>

        <div style={{ position: "relative" }} ref={ref}>
          <button className="avatar-btn" onClick={() => setOpen((o) => !o)}>
            <span className={`status-led ${checkedIn ? "on" : "off"}`} style={{ marginLeft: 4 }} />
            <span className="avatar-circle">{initials(user?.name)}</span>
          </button>
          {open && (
            <div className="dropdown">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate(`/employees/${user.id}`);
                }}
              >
                My Profile
              </button>
              <hr />
              <button onClick={logout}>Log Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
