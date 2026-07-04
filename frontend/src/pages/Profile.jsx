import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

function initials(name = "") {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function Field({ label, value, onChange, editable, mono, type = "text" }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        disabled={!editable}
        className={mono ? "mono" : ""}
      />
    </div>
  );
}

export default function Profile() {
  const { id } = useParams();
  const { user, isAdmin, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [draft, setDraft] = useState(null);
  const [tab, setTab] = useState("resume");
  const [salary, setSalary] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const isSelf = user && Number(id) === user.id;
  const canEdit = isSelf || isAdmin;

  function load() {
    api.getEmployee(id).then((data) => {
      setEmp(data);
      setDraft(data);
    });
  }
  useEffect(load, [id]);

  useEffect(() => {
    if (tab === "salary" && isAdmin) {
      api.getSalary(id).then(setSalary).catch(() => setSalary(null));
    }
  }, [tab, id, isAdmin]);

  function set(key) {
    return (value) => setDraft((d) => ({ ...d, [key]: value }));
  }

  async function saveResume() {
    setSaving(true);
    setMessage("");
    try {
      await api.updateEmployee(id, {
        about: draft.about,
        what_i_love: draft.what_i_love,
        interests: draft.interests,
      });
      await api.updateSkills(id, {
        skills: draft.skills?.map((s) => s.label) || [],
        certifications: draft.certifications?.map((c) => c.label) || [],
      });
      setMessage("Saved.");
      load();
      if (isSelf) refreshUser();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function savePrivate() {
    setSaving(true);
    setMessage("");
    try {
      await api.updateEmployee(id, {
        date_of_birth: draft.date_of_birth,
        residing_address: draft.residing_address,
        nationality: draft.nationality,
        personal_email: draft.personal_email,
        gender: draft.gender,
        marital_status: draft.marital_status,
        bank_account_number: draft.bank_account_number,
        bank_name: draft.bank_name,
        ifsc_code: draft.ifsc_code,
        pan_no: draft.pan_no,
        uan_no: draft.uan_no,
        mobile: draft.mobile,
      });
      setMessage("Saved.");
      load();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function updateSalaryField(key, value) {
    const updated = await api.updateSalary(id, { [key]: value });
    setSalary(updated);
  }

  if (!emp || !draft) {
    return (
      <div className="container">
        <div className="loading-screen" style={{ minHeight: 200 }}>
          <span className="spinner" /> Loading profile…
        </div>
      </div>
    );
  }

  const tabs = [
    { key: "resume", label: "Resume" },
    { key: "private", label: "Private Info" },
    ...(isAdmin ? [{ key: "salary", label: "Salary Info" }] : []),
    { key: "security", label: "Security" },
  ];

  return (
    <div className="container">
      <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)} style={{ marginBottom: 14 }}>
        ← Back
      </button>

      <div className="panel panel-pad" style={{ marginBottom: 20 }}>
        <div className="flex gap-16 items-center" style={{ flexWrap: "wrap" }}>
          <div className="emp-avatar" style={{ width: 84, height: 84, fontSize: 28, borderRadius: 18 }}>
            {initials(emp.name)}
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 24 }}>{emp.name}</h1>
            <div className="text-soft text-sm mono">{emp.login_id}</div>
            <div className="text-soft text-sm">{emp.job_position || "—"} · {emp.department || "—"}</div>
          </div>
          <div className="chip-row" style={{ marginBottom: 0 }}>
            <div className="chip">
              <span className="value">{emp.role.toUpperCase()}</span>
              <span className="label">Role</span>
            </div>
            <div className="chip">
              <span className="value">{emp.location || "—"}</span>
              <span className="label">Location</span>
            </div>
            <div className="chip">
              <span className="value">{emp.date_of_joining}</span>
              <span className="label">Joined</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tab-btn${tab === t.key ? " active" : ""}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {message && <div className="field-hint" style={{ marginBottom: 14 }}>{message}</div>}

      {tab === "resume" && (
        <div className="panel panel-pad">
          <div className="field-row">
            <div className="field">
              <label>About</label>
              <textarea rows={4} value={draft.about || ""} disabled={!canEdit} onChange={(e) => set("about")(e.target.value)} />
            </div>
            <div className="field">
              <label>Skills</label>
              <textarea
                rows={4}
                placeholder="Comma-separated"
                disabled={!canEdit}
                value={(draft.skills || []).map((s) => s.label).join(", ")}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, skills: e.target.value.split(",").map((label) => ({ label: label.trim() })) }))
                }
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>What I love about my job</label>
              <textarea rows={4} value={draft.what_i_love || ""} disabled={!canEdit} onChange={(e) => set("what_i_love")(e.target.value)} />
            </div>
            <div className="field">
              <label>Certifications</label>
              <textarea
                rows={4}
                placeholder="Comma-separated"
                disabled={!canEdit}
                value={(draft.certifications || []).map((c) => c.label).join(", ")}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, certifications: e.target.value.split(",").map((label) => ({ label: label.trim() })) }))
                }
              />
            </div>
          </div>
          <div className="field">
            <label>My interests and hobbies</label>
            <textarea rows={3} value={draft.interests || ""} disabled={!canEdit} onChange={(e) => set("interests")(e.target.value)} />
          </div>
          {canEdit && (
            <button className="btn btn-primary" onClick={saveResume} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      )}

      {tab === "private" && (
        <div className="panel panel-pad">
          <div className="field-row">
            <Field label="Date of Birth" value={draft.date_of_birth} onChange={set("date_of_birth")} editable={canEdit} />
            <Field label="Gender" value={draft.gender} onChange={set("gender")} editable={canEdit} />
          </div>
          <div className="field-row">
            <Field label="Nationality" value={draft.nationality} onChange={set("nationality")} editable={canEdit} />
            <Field label="Marital Status" value={draft.marital_status} onChange={set("marital_status")} editable={canEdit} />
          </div>
          <Field label="Residing Address" value={draft.residing_address} onChange={set("residing_address")} editable={canEdit} />
          <div className="field-row">
            <Field label="Personal Email" value={draft.personal_email} onChange={set("personal_email")} editable={canEdit} />
            <Field label="Mobile" value={draft.mobile} onChange={set("mobile")} editable={canEdit} />
          </div>
          <h3 style={{ margin: "18px 0 12px", fontSize: 16 }}>Bank Details</h3>
          <div className="field-row">
            <Field label="Account Number" value={draft.bank_account_number} onChange={set("bank_account_number")} editable={canEdit} mono />
            <Field label="Bank Name" value={draft.bank_name} onChange={set("bank_name")} editable={canEdit} />
          </div>
          <div className="field-row">
            <Field label="IFSC Code" value={draft.ifsc_code} onChange={set("ifsc_code")} editable={canEdit} mono />
            <Field label="PAN No." value={draft.pan_no} onChange={set("pan_no")} editable={canEdit} mono />
          </div>
          <Field label="UAN No." value={draft.uan_no} onChange={set("uan_no")} editable={canEdit} mono />
          {canEdit && (
            <button className="btn btn-primary" onClick={savePrivate} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          )}
        </div>
      )}

      {tab === "salary" && isAdmin && (
        <div className="panel panel-pad">
          {!salary ? (
            <div className="loading-screen" style={{ minHeight: 100 }}><span className="spinner" /></div>
          ) : (
            <>
              <div className="field-row">
                <div className="field">
                  <label>Monthly Wage (₹)</label>
                  <input type="number" defaultValue={salary.monthlyWage} onBlur={(e) => updateSalaryField("monthlyWage", Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Yearly Wage (₹)</label>
                  <input readOnly value={salary.yearlyWage} className="mono" />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>Working Days / Week</label>
                  <input type="number" defaultValue={salary.workingDaysPerWeek} onBlur={(e) => updateSalaryField("workingDaysPerWeek", Number(e.target.value))} />
                </div>
                <div className="field">
                  <label>Break Time (hrs)</label>
                  <input type="number" defaultValue={salary.breakTimeHrs} onBlur={(e) => updateSalaryField("breakTimeHrs", Number(e.target.value))} />
                </div>
              </div>

              <h3 style={{ margin: "18px 0 12px", fontSize: 16 }}>Salary Components</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>Component</th><th>% of Wage</th><th>Amount / month</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>Basic Salary</td><td>{salary.components.basic.pct}%</td><td className="mono">₹{salary.components.basic.amount}</td></tr>
                    <tr><td>House Rent Allowance</td><td>{salary.components.hra.pct}% of Basic</td><td className="mono">₹{salary.components.hra.amount}</td></tr>
                    <tr><td>Standard Allowance</td><td>{salary.components.standardAllowance.pct}%</td><td className="mono">₹{salary.components.standardAllowance.amount}</td></tr>
                    <tr><td>Performance Bonus</td><td>{salary.components.performanceBonus.pct}%</td><td className="mono">₹{salary.components.performanceBonus.amount}</td></tr>
                    <tr><td>Leave Travel Allowance</td><td>{salary.components.leaveTravelAllowance.pct}%</td><td className="mono">₹{salary.components.leaveTravelAllowance.amount}</td></tr>
                    <tr><td>Fixed Allowance</td><td>auto</td><td className="mono">₹{salary.components.fixedAllowance.amount}</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 style={{ margin: "18px 0 12px", fontSize: 16 }}>Provident Fund &amp; Tax</h3>
              <div className="field-row">
                <Field label="Employee PF %" value={salary.providentFund.employee.pct} onChange={(v) => updateSalaryField("employeePfPct", Number(v))} editable />
                <Field label="Employer PF %" value={salary.providentFund.employer.pct} onChange={(v) => updateSalaryField("employerPfPct", Number(v))} editable />
              </div>
              <Field label="Professional Tax (₹/month)" value={salary.taxDeductions.professionalTax} onChange={(v) => updateSalaryField("professionalTax", Number(v))} editable />
              <p className="field-hint">Changes save automatically when you click away from a field.</p>
            </>
          )}
        </div>
      )}

      {tab === "security" && (
        <SecurityTab isSelf={isSelf} />
      )}
    </div>
  );
}

function SecurityTab({ isSelf }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isSelf) {
    return (
      <div className="panel panel-pad">
        <p className="text-soft text-sm">Security settings are only editable by the account owner.</p>
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (next !== confirm) {
      setMsg("New passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await api.changePassword({ currentPassword: current, newPassword: next });
      setMsg("Password updated.");
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel panel-pad" style={{ maxWidth: 420 }}>
      <h3 style={{ marginBottom: 14, fontSize: 16 }}>Change Password</h3>
      {msg && <div className="field-hint" style={{ marginBottom: 12 }}>{msg}</div>}
      <form onSubmit={submit}>
        <Field label="Current Password" type="password" value={current} onChange={setCurrent} editable />
        <Field label="New Password" type="password" value={next} onChange={setNext} editable />
        <Field label="Confirm New Password" type="password" value={confirm} onChange={setConfirm} editable />
        <button className="btn btn-primary" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
      </form>
    </div>
  );
}
