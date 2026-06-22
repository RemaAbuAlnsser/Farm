import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:3001/api";

const NOTIF_CONFIG = {
  drying:         { label: "تنشيف البقرة",  color: "#f59e0b", bg: "#fffbeb" },
  birth:          { label: "موعد الولادة",  color: "#8b5cf6", bg: "#f5f3ff" },
  reinsemination: { label: "إعادة التلقيح", color: "#3b82f6", bg: "#eff6ff" },
};

function daysLabel(days) {
  if (days < 0)   return `تأخر ${Math.abs(days)} يوم`;
  if (days === 0) return "اليوم";
  if (days === 1) return "غداً";
  return `بعد ${days} يوم`;
}

export default function Notifications({ onDismiss }) {
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    axios.get(`${API}/notifications`)
      .then((r) => { setNotifs(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const dismiss = (n) => {
    axios.post(`${API}/notifications/dismiss`, {
      cow_id: n.cow_id,
      type: n.type,
      event_date: n.date,
    }).then(() => {
      load();
      onDismiss?.();
    });
  };

  return (
    <div>
      <div className="page-header">
        <h1 style={{ display: "flex", alignItems: "center", gap: 12 }}>
          التنبيهات
          {notifs.length > 0 && (
            <span style={{
              background: "#ef4444", color: "#fff", borderRadius: "50px",
              padding: "3px 14px", fontSize: "0.85rem", fontWeight: 700,
            }}>
              {notifs.length}
            </span>
          )}
        </h1>
      </div>

      {loading ? (
        <p style={{ padding: 20 }}>جاري التحميل...</p>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#94a3b8" }}>
          <p style={{ fontSize: "1.15rem", fontWeight: 600 }}>لا توجد تنبيهات حالياً</p>
          <p style={{ fontSize: "0.9rem", marginTop: 6 }}>كل شيء على ما يرام</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 700 }}>
          {notifs.map((n, i) => {
            const cfg      = NOTIF_CONFIG[n.type] || { label: n.type, color: "#64748b", bg: "#f8fafc" };
            const isUrgent = n.days <= 0;
            return (
              <div key={i} style={{
                background: cfg.bg,
                borderRadius: 16,
                padding: "20px 24px",
                borderRight: `6px solid ${cfg.color}`,
                boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "1.08rem", fontWeight: 700, color: "#1e293b", marginBottom: 5 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    <span style={{
                      background: cfg.color + "20",
                      color: cfg.color,
                      borderRadius: 6,
                      padding: "2px 8px",
                      fontWeight: 600,
                      fontSize: "0.82rem",
                      marginLeft: 8,
                    }}>
                      {cfg.label}
                    </span>
                    {n.date}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, flexShrink: 0 }}>
                  <span style={{
                    background: isUrgent ? "#fef2f2" : "#f0fdf4",
                    color: isUrgent ? "#dc2626" : "#16a34a",
                    border: `1px solid ${isUrgent ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: 20,
                    padding: "4px 14px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}>
                    {daysLabel(n.days)}
                  </span>
                  <button
                    onClick={() => dismiss(n)}
                    style={{
                      background: "#fff",
                      border: `1px solid #e2e8f0`,
                      borderRadius: 8,
                      padding: "7px 18px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      color: "#475569",
                      fontFamily: "inherit",
                      fontWeight: 600,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => e.target.style.background = "#f1f5f9"}
                    onMouseLeave={(e) => e.target.style.background = "#fff"}
                  >
                    تم
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
