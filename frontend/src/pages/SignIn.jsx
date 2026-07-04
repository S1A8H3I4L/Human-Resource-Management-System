import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(loginId, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="center-screen">
      <div className="panel panel-pad" style={{ width: 400 }}>
        <div className="flex flex-col items-center gap-8" style={{ marginBottom: 22 }}>
          <span className="brand-mark" style={{ width: 40, height: 40, borderRadius: 10 }} />
          <h1 style={{ fontSize: 24 }}>Sign in to Shiftwork</h1>
          <p className="text-soft text-sm" style={{ margin: 0 }}>Every workday, perfectly aligned.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label>Login ID / Email</label>
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="e.g. admin@odoo.com"
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-with-icon">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              <button type="button" className="icon-btn" onClick={() => setShowPw((s) => !s)}>
                {showPw ? "🙈" : "👁️"}
              </button>
            </div>
          </div>
          <button className="btn btn-primary btn-block" disabled={busy} style={{ marginTop: 8 }}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-sm text-soft" style={{ textAlign: "center", marginTop: 18 }}>
          Don't have an account? <Link to="/signup" style={{ color: "var(--indigo)", fontWeight: 700 }}>Sign Up</Link>
        </p>

        <div className="field-hint" style={{ marginTop: 18, textAlign: "center" }}>
          Demo: admin@odoo.com / hr@odoo.com / jodo@odoo.com — password <b>password123</b>
        </div>
      </div>
    </div>
  );
}
