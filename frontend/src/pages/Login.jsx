import { useState } from "react";
import axios from "axios";
import { API, saveSession } from "../auth";

export default function Login({ onLogin }) {
  const [form, setForm]   = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    axios.post(`${API}/auth/login`, form)
      .then((r) => {
        saveSession(r.data.token, r.data.name, r.data.email);
        onLogin();
      })
      .catch((err) => {
        setError(err.response?.data?.error || "حدث خطأ");
        setLoading(false);
      });
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      background: "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)",
      direction: "rtl",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* subtle pattern overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.04) 0%, transparent 50%)",
      }} />

      <div className="login-card" style={{
        position: "relative",
        background: "#fff",
        borderRadius: 20,
        padding: "44px 40px",
        width: "100%",
        maxWidth: 400,
        boxShadow: "0 24px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)",
      }}>
        {/* header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "linear-gradient(135deg, #064e3b, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem", margin: "0 auto 16px",
            boxShadow: "0 6px 20px rgba(5,150,105,0.35)",
          }}>
            م
          </div>
          <h1 style={{ fontSize: "1.35rem", color: "#0f172a", fontWeight: 800, marginBottom: 4 }}>
            مزرعة النقاء
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.83rem" }}>سجّل دخولك للمتابعة</p>
        </div>

        {error && (
          <div style={{
            background: "#fef2f2", color: "#b91c1c", padding: "10px 14px",
            borderRadius: 10, fontSize: "0.88rem", marginBottom: 20,
            border: "1px solid #fecaca",
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              required autoFocus
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="أدخل اسم المستخدم"
            />
          </div>
          <div className="form-group">
            <label>كلمة السر</label>
            <input
              required type="password"
              value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="أدخل كلمة السر"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", marginTop: 8, padding: "12px",
              background: loading ? "#6ee7b7" : "linear-gradient(135deg, #059669, #047857)",
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: "0.95rem", fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              fontFamily: "inherit",
              boxShadow: loading ? "none" : "0 4px 16px rgba(5,150,105,0.4)",
              transition: "opacity 0.2s",
            }}
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
