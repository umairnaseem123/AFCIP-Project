import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const LoginForm = () => {
  const [email, setEmail] = useState("admin@afcip.gov.pk");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (key) => ({
    width: "100%",
    padding: "14px 16px",
    border: `1px solid ${focused === key ? "#38bdf8" : "#1e3a5f"}`,
    background: "rgba(15,23,42,0.82)",
    color: "white",
    borderRadius: "10px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxShadow: focused === key ? "0 0 0 3px rgba(56,189,248,0.12)" : "none",
  });

  return (
    <div style={{
      width: "440px",
      minHeight: "100vh",
      background: "rgba(15,23,42,0.96)",
      backdropFilter: "blur(20px)",
      borderLeft: "1px solid rgba(56,189,248,0.14)",
      color: "white",
      padding: "48px 44px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ marginBottom: "36px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <div style={{ width: "32px", height: "2px", background: "linear-gradient(90deg, #2563eb, #38bdf8)" }} />
            <span style={{ color: "#38bdf8", fontSize: "11px", letterSpacing: "2px", fontWeight: "600" }}>SECURE ACCESS</span>
          </div>
          <h2 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "8px", color: "white" }}>Welcome Back</h2>
          <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6 }}>Sign in with your backend account to access the intelligence dashboard.</p>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", color: "#fca5a5", fontSize: "13px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "8px" }}>
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              placeholder="admin@afcip.gov.pk"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused("")}
              autoComplete="username"
              style={inputStyle("email")}
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label style={{ display: "block", color: "#94a3b8", fontSize: "12px", fontWeight: "600", letterSpacing: "0.05em", marginBottom: "8px" }}>
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused("")}
                autoComplete="current-password"
                style={{ ...inputStyle("password"), paddingRight: "48px" }}
              />
              <button
                type="button"
                aria-label={showPass ? "Hide password" : "Show password"}
                onClick={() => setShowPass((current) => !current)}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: "4px", display: "flex" }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", marginBottom: "24px" }}>
            <span style={{ color: "#38bdf8", fontSize: "12px", cursor: "pointer" }}>Forgot password?</span>
          </div>

          <button type="submit" disabled={loading} style={{
            width: "100%",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            background: loading ? "#1e3a5f" : "linear-gradient(135deg, #2563eb, #0891b2)",
            color: "white",
            fontSize: "15px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: "0.2px",
            boxShadow: loading ? "none" : "0 4px 20px rgba(37,99,235,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}>
            {loading ? "Authenticating..." : <><LockKeyhole size={17} /> Sign In to AFCIP</>}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "28px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#1e293b" }} />
          <span style={{ color: "#475569", fontSize: "12px" }}>BACKEND CONNECTED</span>
          <div style={{ flex: 1, height: "1px", background: "#1e293b" }} />
        </div>

        <div style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.22)", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ color: "#93c5fd", fontSize: "12px", marginBottom: "8px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={14} /> Live API Login
          </div>
          <div style={{ color: "#94a3b8", fontSize: "12px", lineHeight: 1.8 }}>
            Email: <span style={{ color: "#cbd5e1" }}>admin@afcip.gov.pk</span><br />
            Password: <span style={{ color: "#cbd5e1" }}>your backend user password</span>
          </div>
        </div>

        <div style={{ marginTop: "32px", textAlign: "center" }}>
          <span style={{ color: "#475569", fontSize: "11px" }}>256-bit SSL Encrypted · SBP Compliant · AFCIP v2.1</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #475569; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px rgba(15,23,42,0.95) inset !important;
          -webkit-text-fill-color: white !important;
          caret-color: white;
          border: 1px solid #38bdf8 !important;
        }
      `}</style>
    </div>
  );
};

export default LoginForm;
