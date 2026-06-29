import { NavLink } from "react-router-dom";
import { getUser, clearSession } from "../auth";

export default function Navbar({ isOpen, onClose, notifCount = 0 }) {
  const user = getUser();

  const handleLogout = () => {
    if (confirm("هل تريد تسجيل الخروج؟")) {
      clearSession();
      window.location.href = "/login";
    }
  };

  return (
    <nav className={`navbar${isOpen ? " open" : ""}`}>
      <div className="navbar-logo">
        <h2>مزرعة النقاء</h2>
        <p>نظام إدارة المزرعة</p>
      </div>

      <NavLink to="/" end onClick={onClose} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
        الرئيسية
      </NavLink>

      <NavLink
        to="/notifications"
        onClick={onClose}
        className={({ isActive }) => "nav-link nav-link-notif" + (isActive ? " active" : "")}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <span>التنبيهات</span>
        {notifCount > 0 && (
          <span style={{
            background: "#ef4444", color: "#fff", borderRadius: "50px",
            padding: "2px 10px", fontSize: "0.78rem", fontWeight: 700,
            minWidth: 24, textAlign: "center",
          }}>
            {notifCount}
          </span>
        )}
      </NavLink>

      <NavLink to="/cows" onClick={onClose} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
        البقر
      </NavLink>

      <NavLink to="/calves" onClick={onClose} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
        العجول
      </NavLink>

      <NavLink to="/finances" onClick={onClose} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
        المبيعات والمصاريف
      </NavLink>

      <NavLink to="/users" onClick={onClose} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
        المسؤولين
      </NavLink>

      <NavLink to="/guide" onClick={onClose} className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}>
        دليل
      </NavLink>

      <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.15)" }}>
        <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>
          مرحباً، <strong style={{ color: "#fff" }}>{user?.name}</strong>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "8px", background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8,
            color: "rgba(255,255,255,0.8)", fontSize: "0.85rem", cursor: "pointer",
            fontFamily: "inherit"
          }}
        >
          تسجيل الخروج
        </button>
      </div>
    </nav>
  );
}
