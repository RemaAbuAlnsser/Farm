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
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#f8fafc", padding: "16px"
    }}>
      <div className="login-card" style={{
        background: "#fff", borderRadius: 16, padding: "40px 36px",
        width: "100%", maxWidth: 380,
        boxShadow: "0 8px 32px rgba(0,0,0,0.10)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "1.4rem", color: "#0f172a", fontWeight: 700 }}>نظام إدارة المزرعة</h1>
          <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: 4 }}>سجّل دخولك للمتابعة</p>
        </div>

        {error && (
          <div style={{
            background: "#fee2e2", color: "#dc2626", padding: "10px 14px",
            borderRadius: 8, fontSize: "0.88rem", marginBottom: 16,
            border: "1px solid #fca5a5"
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
              width: "100%", marginTop: 8, padding: "11px",
              background: loading ? "#6ee7b7" : "#059669",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: "0.95rem", fontWeight: 700, cursor: loading ? "default" : "pointer",
              fontFamily: "inherit"
            }}
          >
            {loading ? "جاري الدخول..." : "دخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
