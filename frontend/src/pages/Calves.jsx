import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../components/Modal";

const API = "http://localhost:3001/api";

const today = () => new Date().toISOString().split("T")[0];

const EMPTY = {
  number: "",
  origin: "born",
  arrival_date: "",
  birth_date: "",
  mother_cow_id: "",
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

export default function Calves() {
  const [calves, setCalves]     = useState([]);
  const [cows, setCows]         = useState([]);
  const [modal, setModal]       = useState(null); // null | 'edit' | 'sell'
  const [form, setForm]         = useState(EMPTY);
  const [editId, setEditId]     = useState(null);
  const [sellId, setSellId]     = useState(null);
  const [sellForm, setSellForm] = useState({ sale_price: "", date: today() });
  const [dieId, setDieId]       = useState(null);
  const [dieDate, setDieDate]   = useState(today());
  const [filter, setFilter]     = useState("all");
  const [loading, setLoading]   = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      axios.get(`${API}/calves`),
      axios.get(`${API}/cows`),
    ]).then(([c, cw]) => {
      setCalves(c.data);
      setCows(cw.data);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setModal("edit"); };

  const openEdit = (calf) => {
    setForm({
      number:         calf.number || "",
      origin:         calf.origin,
      arrival_date:   calf.arrival_date?.split("T")[0] || "",
      birth_date:     calf.birth_date?.split("T")[0] || "",
      mother_cow_id:  calf.mother_cow_id || "",
      purchase_price: calf.purchase_price || "",
      notes:          calf.notes || "",
    });
    setEditId(calf.id);
    setModal("edit");
  };

  const openSell = (calf) => {
    setSellId(calf.id);
    setSellForm({ sale_price: "", date: today() });
    setModal("sell");
  };

  const openDie = (calf) => {
    setDieId(calf.id);
    setDieDate(today());
    setModal("die");
  };

  const handleDie = (e) => {
    e.preventDefault();
    axios.post(`${API}/calves/${dieId}/die`, { date: dieDate })
      .then(() => { setModal(null); load(); });
  };

  const handleDelete = (id) => {
    if (!confirm("هل تريد حذف هذا العجل؟")) return;
    axios.delete(`${API}/calves/${id}`).then(load);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const req = editId
      ? axios.put(`${API}/calves/${editId}`, form)
      : axios.post(`${API}/calves`, form);
    req.then(() => { setModal(null); load(); });
  };

  const handleSell = (e) => {
    e.preventDefault();
    axios.post(`${API}/calves/${sellId}/sell`, sellForm)
      .then(() => { setModal(null); load(); });
  };

  const set = (k) => (e) => {
    const val = e.target.value;
    if (k === "mother_cow_id") {
      const mother = cows.find((c) => String(c.id) === String(val));
      setForm((f) => ({
        ...f,
        mother_cow_id: val,
        birth_date: mother?.birth_date || f.birth_date,
      }));
    } else {
      setForm((f) => ({ ...f, [k]: val }));
    }
  };
  const setSell = (k) => (e) => setSellForm((f) => ({ ...f, [k]: e.target.value }));

  const filtered = calves.filter((c) => {
    if (filter === "born")      return c.origin === "born";
    if (filter === "purchased") return c.origin === "purchased";
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>🐮 العجول</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ إضافة عجل</button>
      </div>

      <div className="summary-bar">
        <div className="s-item"><span className="s-label">الإجمالي</span><span className="s-val">{calves.length}</span></div>
        <div className="s-item"><span className="s-label">مواليد</span><span className="s-val" style={{color:"#6a1b9a"}}>{calves.filter(c=>c.origin==="born").length}</span></div>
        <div className="s-item"><span className="s-label">مشتراة</span><span className="s-val" style={{color:"#e65100"}}>{calves.filter(c=>c.origin==="purchased").length}</span></div>
      </div>

      <div className="tabs">
        {[["all","الكل"],["born","مواليد"],["purchased","مشتراة"]].map(([v,l]) => (
          <button key={v} className={`tab ${filter===v?"active":""}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{padding:24,textAlign:"center",color:"#aaa"}}>جاري التحميل...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🐮</div>
            <p>لا توجد عجول بعد</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>رقم العجل</th>
                <th>المصدر</th>
                <th>تاريخ الإحضار / الميلاد</th>
                <th>الأم</th>
                <th>ثمن الشراء</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((calf) => (
                <tr key={calf.id}>
                  <td data-label="رقم العجل"><strong>{calf.number || "—"}</strong></td>
                  <td data-label="المصدر">
                    <span className={`badge ${calf.origin === "born" ? "badge-born" : "badge-purchased"}`}>
                      {calf.origin === "born" ? "مواليد" : "مشتراة"}
                    </span>
                  </td>
                  <td data-label="التاريخ">{fmtDate(calf.birth_date || calf.arrival_date)}</td>
                  <td data-label="الأم">{calf.mother_number || "—"}</td>
                  <td data-label="ثمن الشراء">{fmt(calf.purchase_price)} ₪</td>
                  <td data-label="ملاحظات">{calf.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{whiteSpace:"nowrap"}}>
                    <button className="action-btn btn-edit" onClick={() => openEdit(calf)}>تعديل</button>
                    <button className="action-btn btn-sell" onClick={() => openSell(calf)}>بيع</button>
                    <button className="action-btn btn-die" onClick={() => openDie(calf)}>مات</button>
                    <button className="action-btn btn-delete" onClick={() => handleDelete(calf.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit modal */}
      {modal === "edit" && (
        <Modal title={editId ? "تعديل عجل" : "إضافة عجل جديد"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>رقم العجل</label>
                <input value={form.number} onChange={set("number")} placeholder="مثال: E-01" />
              </div>
              <div className="form-group">
                <label>المصدر *</label>
                <select value={form.origin} onChange={set("origin")}>
                  <option value="born">مواليد</option>
                  <option value="purchased">مشتراة</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>{form.origin === "born" ? "تاريخ الميلاد" : "تاريخ الإحضار"}</label>
                <input type="date"
                  value={form.origin === "born" ? form.birth_date : form.arrival_date}
                  onChange={form.origin === "born" ? set("birth_date") : set("arrival_date")} />
              </div>
              {form.origin === "born" && (
                <div className="form-group">
                  <label>البقرة الأم</label>
                  <select value={form.mother_cow_id} onChange={set("mother_cow_id")}>
                    <option value="">— اختر —</option>
                    {cows.map((c) => (
                      <option key={c.id} value={c.id}>بقرة رقم {c.number}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {form.origin === "purchased" && (
              <div className="form-group">
                <label>ثمن الشراء (₪)</label>
                <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={set("purchase_price")} placeholder="0.00" />
              </div>
            )}

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
        <Modal title="تسجيل وفاة عجل" onClose={() => setModal(null)}>
          <form onSubmit={handleDie}>
            <p style={{marginBottom:16, color:"#555", fontSize:"0.9rem"}}>
              سيتم إضافة ثمن الشراء للخسائر وحذف العجل من القائمة.
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
        <Modal title="بيع العجل" onClose={() => setModal(null)}>
          <form onSubmit={handleSell}>
            <p style={{marginBottom:16, color:"#555", fontSize:"0.9rem"}}>
              سيتم إضافة ثمن البيع للإيرادات وحذف العجل من القائمة.
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
