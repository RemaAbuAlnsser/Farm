import { useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:3001/api";

const TX_CONFIG = {
  cow_purchase:  { label: "شراء بقرة",    color: "#1d4ed8", sign: "-" },
  calf_purchase: { label: "شراء عجل",     color: "#1d4ed8", sign: "-" },
  calf_born:     { label: "ولادة عجل",    color: "#7e22ce", sign: ""  },
  cow_sale:      { label: "بيع بقرة",     color: "#16a34a", sign: "+" },
  calf_sale:     { label: "بيع عجل",      color: "#16a34a", sign: "+" },
  cow_death:     { label: "وفاة بقرة",    color: "#dc2626", sign: "-" },
  calf_death:    { label: "وفاة عجل",     color: "#dc2626", sign: "-" },
  milk_sale:     { label: "بيع حليب",     color: "#16a34a", sign: "+" },
  expense:       { label: "مصروف",        color: "#d97706", sign: "-" },
  salary:        { label: "راتب",         color: "#d97706", sign: "-" },
};

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function Dashboard() {
  const [data, setData]               = useState(null);
  const [error, setError]             = useState(null);
  const [transactions, setTransactions] = useState([]);

  const load = useCallback(() => {
    axios.get(`${API}/dashboard`)
      .then((r) => setData(r.data))
      .catch(() => setError("تعذّر الاتصال بالسيرفر"));
    axios.get(`${API}/transactions?limit=20`)
      .then((r) => setTransactions(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <p style={{ color: "red", padding: 20 }}>{error}</p>;
  if (!data)  return <p style={{ padding: 20 }}>جاري التحميل...</p>;

  const { assets, revenues, expenses, losses, profit } = data;

  return (
    <div>
      <div className="page-header">
        <h1>الصفحة الرئيسية</h1>
      </div>

      <div className="cards-row">
        <div className="card">
          <div className="card-label">قيمة الموجودات</div>
          <div className="card-value blue">{fmt(assets)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">الإيرادات</div>
          <div className="card-value green">{fmt(revenues)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">المصروفات</div>
          <div className="card-value red">{fmt(expenses)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">الخسائر</div>
          <div className="card-value" style={{ color: "#9d174d" }}>{fmt(losses)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">{profit >= 0 ? "صافي الربح" : "صافي الخسارة"}</div>
          <div className={`card-value ${profit >= 0 ? "green" : "red"}`}>
            {fmt(Math.abs(profit))} ₪
          </div>
        </div>
      </div>

      <div className="notifications-section" style={{ marginTop: 24 }}>
        <h2>سجل الحركات الأخيرة</h2>
        {transactions.length === 0 ? (
          <p className="no-notif">لا توجد حركات مسجلة بعد</p>
        ) : (
          <div className="notif-list">
            {transactions.map((tx) => {
              const cfg = TX_CONFIG[tx.type] || { label: tx.type, color: "#64748b", sign: "" };
              return (
                <div key={tx.id} className="notif-item" style={{ borderRight: `4px solid ${cfg.color}` }}>
                  <div className="notif-body">
                    <strong>{tx.description || cfg.label}</strong>
                    <span>
                      {cfg.label} — {tx.date}
                      {tx.user_name && (
                        <span style={{ marginRight: 8, color: "#059669", fontWeight: 600 }}>
                          · {tx.user_name}
                        </span>
                      )}
                    </span>
                  </div>
                  {tx.amount != null && (
                    <span className="notif-days" style={{ color: cfg.sign === "+" ? "#16a34a" : cfg.sign === "-" ? "#dc2626" : "#64748b" }}>
                      {cfg.sign}{fmt(tx.amount)} ₪
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
