import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ companyName: "", name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
const [logo, setLogo] = useState(null);
const [preview, setPreview] = useState(null);
const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
function chooseLogo(e) {
  const file = e.target.files[0];

  if (!file) return;

  setLogo(file);
  setPreview(URL.createObjectURL(file));
}

  function update(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const data = new FormData();

data.append("companyName", form.companyName);
data.append("name", form.name);
data.append("email", form.email);
data.append("phone", form.phone);
data.append("password", form.password);

if (logo) {
  data.append("logo", logo);
}

await signup(data);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="panel panel-pad" style={{ width: 460 }}>
        <div className="flex flex-col items-center gap-8" style={{ marginBottom: 20 }}>
          <span className="brand-mark" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <h1 style={{ fontSize: 24 }}>Set up your company</h1>
          <p className="text-soft text-sm" style={{ margin: 0, textAlign: "center" }}>
            This creates your organization and its first Admin account.
            <br />Every future employee login is generated for them by you.
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">

  {/* Labels */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    }}
  >
    <label style={{ margin: 0 }}>Company Name</label>

    <label
      style={{
        margin: 0,
        width: 35,
        textAlign: "center",
      }}
    >
      Logo
    </label>
  </div>

  {/* Input + Upload */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <input
      value={form.companyName}
      onChange={update("companyName")}
      required
      autoFocus
      style={{ flex: 1 }}
    />

    <div
      onClick={() => fileInputRef.current.click()}
      title="Upload Company Logo"
      style={{
        width: 30,
        height: 30,
        minWidth: 25,
        borderRadius: 7,
        border: "1px solid #444",
        background: "#20242d",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {preview ? (
        <img
          src={preview}
          alt="Company Logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <span
          style={{
            fontSize: 35,
            color: "#7c6cff",
          }}
        >
          ⬆️
        </span>
      )}
    </div>

    <input
      ref={fileInputRef}
      type="file"
      accept="image/png,image/jpeg,image/jpg"
      hidden
      onChange={chooseLogo}
    />
  </div>

  <small
    style={{
      color: "#888",
      marginTop: 6,
      display: "block",
      textAlign: "right",
    }}
  >
    PNG, JPG • Max 2 MB
  </small>

</div>
          <div className="field-row">
            <div className="field">
              <label>Your Name</label>
              <input value={form.name} onChange={update("name")} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={update("phone")} />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={update("email")} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Password</label>
              <input type={showPw ? "text" : "password"} value={form.password} onChange={update("password")} required minLength={8} />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input type={showPw ? "text" : "password"} value={form.confirm} onChange={update("confirm")} required minLength={8} />
            </div>
          </div>
          <label className="text-sm flex items-center gap-8" style={{ marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={showPw} onChange={() => setShowPw((s) => !s)} /> Show passwords
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Creating your workspace…" : "Sign Up"}
          </button>
        </form>

        <p className="text-sm text-soft" style={{ textAlign: "center", marginTop: 18 }}>
          Already have an account? <Link to="/signin" style={{ color: "var(--indigo)", fontWeight: 700 }}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}
