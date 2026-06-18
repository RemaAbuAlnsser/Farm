import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../components/Modal";

const API = "http://localhost:3001/api";

const today = () => new Date().toISOString().split("T")[0];

const NOTIF_CONFIG = {
  drying:         { icon: "", label: "تنشيف البقرة" },
  birth:          { icon: "", label: "موعد الولادة" },
  reinsemination: { icon: "", label: "إعادة التلقيح" },
};

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysLabel(days) {
  if (days < 0)  return `تأخر ${Math.abs(days)} يوم`;
  if (days === 0) return "اليوم";
  if (days === 1) return "غداً";
  return `بعد ${days} يوم`;
}

export default function Dashboard() {
  const [data, setData]         = useState(null);
  const [error, setError]       = useState(null);
  const [modal, setModal]       = useState(false);
  const [capitalForm, setCapitalForm] = useState({ amount: "", date: today() });

  const load = () => {
    axios.get(`${API}/dashboard`)
      .then((r) => setData(r.data))
      .catch(() => setError("تعذّر الاتصال بالسيرفر"));
  };

  useEffect(() => { load(); }, []);

  const handleCapitalSubmit = (e) => {
    e.preventDefault();
    axios.post(`${API}/capital`, capitalForm).then(() => {
      setModal(false);
      setCapitalForm({ amount: "", date: today() });
      load();
    });
  };

  const set = (k) => (e) => setCapitalForm((f) => ({ ...f, [k]: e.target.value }));

  if (error) return <p style={{ color: "red", padding: 20 }}>{error}</p>;
  if (!data)  return <p style={{ padding: 20 }}>جاري التحميل...</p>;

  const { capital, revenues, expenses, profit, notifications } = data;

  return (
    <div>
      <div className="page-header">
        <h1>الصفحة الرئيسية</h1>
      </div>

      <div className="cards-row">
        <div className="card" style={{ position: "relative" }}>
          <div className="card-label">رأس المال</div>
          <div className="card-value blue">{fmt(capital)} ₪</div>
          {/* <button
            onClick={() => setModal(true)}
            style={{
              position: "absolute", top: 12, left: 12,
              background: "#dbeafe", border: "none", borderRadius: 6,
              padding: "4px 10px", fontSize: "0.78rem", color: "#1d4ed8",
              cursor: "pointer", fontFamily: "inherit"
            }}
          >
            + إضافة
          </button> */}
        </div>
        <div className="card">
          <div className="card-label">إجمالي الإيرادات</div>
          <div className="card-value green">{fmt(revenues)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">إجمالي المصاريف</div>
          <div className="card-value red">{fmt(expenses)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">{profit >= 0 ? "الأرباح" : "الخسائر"}</div>
          <div className={`card-value ${profit >= 0 ? "green" : "red"}`}>
            {fmt(Math.abs(profit))} ₪
          </div>
        </div>
      </div>

      <div className="notifications-section">
        <h2>الإشعارات والتنبيهات</h2>

        {notifications.length === 0 ? (
          <p className="no-notif">لا توجد تنبيهات خلال الـ 30 يوم القادمة</p>
        ) : (
          <div className="notif-list">
            {notifications.map((n, i) => {
              const cfg = NOTIF_CONFIG[n.type] || {};
              return (
                <div key={i} className={`notif-item ${n.type}`}>
                  <span className="notif-badge">{cfg.icon}</span>
                  <div className="notif-body">
                    <strong>{n.message}</strong>
                    <span>{cfg.label} — {n.date}</span>
                  </div>
                  <span className="notif-days">{daysLabel(n.days)}</span>
                  <button
                    className="btn-done"
                    onClick={() =>
                      axios.post(`${API}/notifications/dismiss`, {
                        cow_id: n.cow_id,
                        type: n.type,
                        event_date: n.date,
                      }).then(load)
                    }
                  >
                    تم ✓
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <Modal title="إضافة رأس مال" onClose={() => setModal(false)}>
          <form onSubmit={handleCapitalSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>المبلغ (₪) *</label>
                <input
                  required type="number" min="0" step="0.01"
                  value={capitalForm.amount} onChange={set("amount")}
                  placeholder="0.00" autoFocus
                />
              </div>
              <div className="form-group">
                <label>التاريخ *</label>
                <input required type="date" value={capitalForm.date} onChange={set("date")} />
              </div>
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">حفظ</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
