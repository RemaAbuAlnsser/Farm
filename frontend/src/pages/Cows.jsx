import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../components/Modal";

const API = "http://localhost:3001/api";
const today = () => new Date().toISOString().split("T")[0];

const EMPTY = {
  number: "",
  arrival_date: "",
  insemination_date: "",
  birth_date: "",
  purchase_price: "",
  notes: "",
  is_pregnant: false,
  pregnancy_days: "",
};

function fmt(n) {
  if (!n) return "—";
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

export default function Cows() {
  const [cows, setCows]         = useState([]);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [sellId, setSellId]     = useState(null);
  const [sellForm, setSellForm] = useState({ sale_price: "", date: today() });
  const [dieId, setDieId]       = useState(null);
  const [dieDate, setDieDate]   = useState(today());
  const [lossAmount, setLossAmount] = useState("");
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [errMsg, setErrMsg]     = useState(null);

  const showErr = (e) => {
    const msg = e?.response?.data?.error || "حدث خطأ، حاول مجدداً";
    setErrMsg(msg);
    setTimeout(() => setErrMsg(null), 4000);
  };

  const load = () => {
    setLoading(true);
    axios.get(`${API}/cows`).then((r) => { setCows(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal("edit"); };
  const openEdit = (cow) => {
    setForm({
      number:            cow.number,
      arrival_date:      cow.arrival_date?.split("T")[0] || "",
      insemination_date: cow.insemination_date?.split("T")[0] || "",
      birth_date:        cow.birth_date?.split("T")[0] || "",
      purchase_price:    cow.purchase_price || "",
      notes:             cow.notes || "",
      is_pregnant:       !!cow.is_pregnant,
      pregnancy_days:    cow.pregnancy_days || "",
    });
    setEditId(cow.id);
    setModal("edit");
  };

  const openSell = (cow) => { setSellId(cow.id); setSellForm({ sale_price: "", date: today() }); setModal("sell"); };
  const openDie  = (cow) => { setDieId(cow.id); setDieDate(today()); setLossAmount(cow.purchase_price || ""); setModal("die"); };

  const handleDie = (e) => {
    e.preventDefault();
    axios.post(`${API}/cows/${dieId}/die`, { date: dieDate, amount: lossAmount })
      .then(() => { setModal(null); load(); }).catch(showErr);
  };

  const handleDelete = (id) => {
    if (!confirm("هل تريد حذف هذه البقرة؟")) return;
    axios.delete(`${API}/cows/${id}`).then(load).catch(showErr);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editId ? axios.put(`${API}/cows/${editId}`, form) : axios.post(`${API}/cows`, form);
    req.then(() => { setModal(null); load(); }).catch(showErr);
  };

  const handleSell = (e) => {
    e.preventDefault();
    axios.post(`${API}/cows/${sellId}/sell`, sellForm)
      .then(() => { setModal(null); load(); }).catch(showErr);
  };

  const set     = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setSell = (k) => (e) => setSellForm((f) => ({ ...f, [k]: e.target.value }));

  const active = cows.filter((c) => !c.is_sold && !c.is_dead);
  const q      = search.trim().toLowerCase();
  const displayed = q
    ? active.filter((c) =>
        String(c.number).includes(q) ||
        (c.notes || "").toLowerCase().includes(q)
      )
    : active;

  return (
    <div>
      {errMsg && <div className="error-toast">{errMsg}</div>}
      <div className="page-header">
        <h1>البقر</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ إضافة بقرة</button>
      </div>

      <div className="summary-bar">
        <div className="s-item"><span className="s-label">الإجمالي</span><span className="s-val">{active.length}</span></div>
        <div className="s-item"><span className="s-label">حوامل</span><span className="s-val" style={{ color: "#9333ea" }}>{active.filter((c) => c.is_pregnant).length}</span></div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="text"
          placeholder="بحث برقم البقرة أو الملاحظات..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", maxWidth: 340, padding: "9px 14px",
            border: "1px solid #e2e8f0", borderRadius: 8,
            fontSize: "0.9rem", fontFamily: "inherit", outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{ padding: 24, textAlign: "center", color: "#aaa" }}>جاري التحميل...</p>
        ) : displayed.length === 0 ? (
          <div className="empty-state"><p>{q ? "لا توجد نتائج" : "لا توجد بقر"}</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>رقم البقرة</th>
                <th>تاريخ الإحضار</th>
                <th>تاريخ التلقيح</th>
                <th>ثمن الشراء</th>
                <th>الحمل</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((cow) => (
                <tr key={cow.id}>
                  <td data-label="رقم البقرة"><strong>{cow.number}</strong></td>
                  <td data-label="تاريخ الإحضار">{fmtDate(cow.arrival_date)}</td>
                  <td data-label="تاريخ التلقيح">{fmtDate(cow.insemination_date)}</td>
                  <td data-label="ثمن الشراء">{fmt(cow.purchase_price)} ₪</td>
                  <td data-label="الحمل">
                    {cow.is_pregnant ? (
                      <span style={{
                        background: "#f3e8ff", color: "#7e22ce", borderRadius: 6,
                        padding: "2px 10px", fontSize: "0.82rem", fontWeight: 600,
                        display: "inline-block",
                      }}>
                        حامل{cow.pregnancy_days ? ` — ${cow.pregnancy_days} يوم` : ""}
                      </span>
                    ) : "—"}
                  </td>
                  <td data-label="ملاحظات">{cow.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => openEdit(cow)}>تعديل</button>
                    <button className="action-btn btn-sell" onClick={() => openSell(cow)}>بيع</button>
                    <button className="action-btn btn-die"  onClick={() => openDie(cow)}>مات</button>
                    <button className="action-btn btn-delete" onClick={() => handleDelete(cow.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal === "edit" && (
        <Modal title={editId ? "تعديل بقرة" : "إضافة بقرة جديدة"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>رقم البقرة *</label>
                <input required value={form.number} onChange={set("number")} placeholder="مثال: 101" />
              </div>
              <div className="form-group">
                <label>تاريخ الإحضار</label>
                <input type="date" value={form.arrival_date} onChange={set("arrival_date")} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>تاريخ التلقيح</label>
                <input type="date" value={form.insemination_date} onChange={set("insemination_date")} />
              </div>
              <div className="form-group">
                <label>تاريخ الولادة</label>
                <input type="date" value={form.birth_date} onChange={set("birth_date")} />
              </div>
            </div>
            <div className="form-group">
              <label>ثمن الشراء (₪)</label>
              <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={set("purchase_price")} placeholder="0.00" />
            </div>

            {/* Pregnancy */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "12px 0 4px" }}>
              <input
                id="pregnant-check"
                type="checkbox"
                checked={form.is_pregnant}
                onChange={(e) => setForm((f) => ({ ...f, is_pregnant: e.target.checked, pregnancy_days: e.target.checked ? f.pregnancy_days : "" }))}
                style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#9333ea" }}
              />
              <label htmlFor="pregnant-check" style={{ cursor: "pointer", fontWeight: 600, color: "#374151", margin: 0 }}>
                البقرة حامل
              </label>
            </div>
            {form.is_pregnant && (
              <div className="form-group" style={{ marginTop: 8 }}>
                <label>تقدير الحمل (بالأيام)</label>
                <input
                  type="number"
                  min="1"
                  max="270"
                  value={form.pregnancy_days}
                  onChange={set("pregnancy_days")}
                  placeholder="مثال: 60 (عدد الأيام منذ التلقيح)"
                />
                <small style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  يُستخدم لحساب مواعيد التنشيف والولادة وإعادة التلقيح تلقائياً
                </small>
              </div>
            )}

            <div className="form-group" style={{ marginTop: form.is_pregnant ? 4 : 12 }}>
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="أي ملاحظات..." />
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">{editId ? "حفظ التعديلات" : "إضافة"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Die modal */}
      {modal === "die" && (
        <Modal title="تسجيل وفاة بقرة" onClose={() => setModal(null)}>
          <form onSubmit={handleDie}>
            <p style={{ marginBottom: 16, color: "#555", fontSize: "0.9rem" }}>
              سيتم تسجيل الوفاة في الخسائر وستبقى البقرة في السجل للمرجعية.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>تاريخ الوفاة *</label>
                <input required type="date" value={dieDate} onChange={(e) => setDieDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>قيمة الخسارة (₪) *</label>
                <input required type="number" min="0" step="0.01" value={lossAmount}
                  onChange={(e) => setLossAmount(e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <p style={{ fontSize: "0.8rem", color: "#888", margin: "-8px 0 12px" }}>
              الافتراضي: سعر الشراء — يمكن تعديله حسب القيمة الفعلية
            </p>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-danger">تأكيد الوفاة</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Sell modal */}
      {modal === "sell" && (
        <Modal title="بيع البقرة" onClose={() => setModal(null)}>
          <form onSubmit={handleSell}>
            <p style={{ marginBottom: 16, color: "#555", fontSize: "0.9rem" }}>
              سيتم تسجيل البيع في الإيرادات وستبقى البقرة في السجل كمباعة.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>ثمن البيع (₪) *</label>
                <input required type="number" min="0" step="0.01" value={sellForm.sale_price} onChange={setSell("sale_price")} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>تاريخ البيع *</label>
                <input required type="date" value={sellForm.date} onChange={setSell("date")} />
              </div>
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-success">تأكيد البيع</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
