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
  const [cows, setCows]       = useState([]);
  const [modal, setModal]     = useState(null); // null | 'add' | 'edit' | 'sell'
  const [form, setForm]       = useState(EMPTY);
  const [editId, setEditId]   = useState(null);
  const [sellId, setSellId]     = useState(null);
  const [sellForm, setSellForm] = useState({ sale_price: "", date: today() });
  const [dieId, setDieId]       = useState(null);
  const [dieDate, setDieDate]   = useState(today());
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    axios.get(`${API}/cows`).then((r) => { setCows(r.data); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal("edit"); };

  const openEdit = (cow) => {
    setForm({
      number:            cow.number,
      arrival_date:      cow.arrival_date?.split("T")[0] || "",
      insemination_date: cow.insemination_date?.split("T")[0] || "",
      birth_date:        cow.birth_date?.split("T")[0] || "",
      purchase_price:    cow.purchase_price || "",
      notes:             cow.notes || "",
    });
    setEditId(cow.id);
    setModal("edit");
  };

  const openSell = (cow) => {
    setSellId(cow.id);
    setSellForm({ sale_price: "", date: today() });
    setModal("sell");
  };

  const openDie = (cow) => {
    setDieId(cow.id);
    setDieDate(today());
    setModal("die");
  };

  const handleDie = (e) => {
    e.preventDefault();
    axios.post(`${API}/cows/${dieId}/die`, { date: dieDate })
      .then(() => { setModal(null); load(); });
  };

  const handleDelete = (id) => {
    if (!confirm("هل تريد حذف هذه البقرة؟")) return;
    axios.delete(`${API}/cows/${id}`).then(load);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editId
      ? axios.put(`${API}/cows/${editId}`, form)
      : axios.post(`${API}/cows`, form);
    req.then(() => { setModal(null); load(); });
  };

  const handleSell = (e) => {
    e.preventDefault();
    axios.post(`${API}/cows/${sellId}/sell`, sellForm)
      .then(() => { setModal(null); load(); });
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setSell = (k) => (e) => setSellForm((f) => ({ ...f, [k]: e.target.value }));

  const filtered = cows.filter((c) => {
    if (filter === "active") return !c.is_sold;
    if (filter === "sold")   return !!c.is_sold;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>🐄 البقر</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ إضافة بقرة</button>
      </div>

      <div className="summary-bar">
        <div className="s-item"><span className="s-label">الإجمالي</span><span className="s-val">{cows.length}</span></div>
        <div className="s-item"><span className="s-label">نشط</span><span className="s-val" style={{color:"#1565c0"}}>{cows.filter(c=>!c.is_sold).length}</span></div>
      </div>

      <div className="tabs">
        {[["all","الكل"],["active","النشط"]].map(([v,l]) => (
          <button key={v} className={`tab ${filter===v?"active":""}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{padding:24,textAlign:"center",color:"#aaa"}}>جاري التحميل...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐄</div>
            <p>لا توجد بقر بعد</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>رقم البقرة</th>
                <th>تاريخ الإحضار</th>
                <th>تاريخ التلقيح</th>
                <th>تاريخ الولادة</th>
                <th>ثمن الشراء</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cow) => (
                <tr key={cow.id}>
                  <td data-label="رقم البقرة"><strong>{cow.number}</strong></td>
                  <td data-label="تاريخ الإحضار">{fmtDate(cow.arrival_date)}</td>
                  <td data-label="تاريخ التلقيح">{fmtDate(cow.insemination_date)}</td>
                  <td data-label="تاريخ الولادة">{fmtDate(cow.birth_date)}</td>
                  <td data-label="ثمن الشراء">{fmt(cow.purchase_price)} ₪</td>
                  <td data-label="ملاحظات">{cow.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{whiteSpace:"nowrap"}}>
                    <button className="action-btn btn-edit" onClick={() => openEdit(cow)}>تعديل</button>
                    <button className="action-btn btn-sell" onClick={() => openSell(cow)}>بيع</button>
                    <button className="action-btn btn-die" onClick={() => openDie(cow)}>مات</button>
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
            <div className="form-group">
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="أي ملاحظات إضافية..." />
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
            <p style={{marginBottom:16, color:"#555", fontSize:"0.9rem"}}>
              سيتم إضافة ثمن الشراء للخسائر وحذف البقرة من القائمة.
            </p>
            <div className="form-group">
              <label>تاريخ الوفاة *</label>
              <input required type="date" value={dieDate} onChange={(e) => setDieDate(e.target.value)} />
            </div>
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
            <p style={{marginBottom:16, color:"#555", fontSize:"0.9rem"}}>
              سيتم إضافة ثمن البيع للإيرادات وحذف البقرة من القائمة.
            </p>
            <div className="form-row">
              <div className="form-group">
                <label>ثمن البيع (₪) *</label>
                <input required type="number" min="0" step="0.01"
                  value={sellForm.sale_price} onChange={setSell("sale_price")} placeholder="0.00" />
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
