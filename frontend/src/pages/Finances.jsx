import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../components/Modal";

const API = "http://localhost:3001/api";

const today = () => new Date().toISOString().split("T")[0];

const REVENUE_TYPES = [
  { value: "milk",  label: "حليب" },
  { value: "cow",   label: "بقر" },
  { value: "calf",  label: "عجول" },
];

const EXPENSE_CATS = [
  { value: "electricity", label: "كهرباء" },
  { value: "fuel",        label: "بنزين" },
  { value: "water",       label: "ماء" },
  { value: "cow_feed",    label: "علف بقر" },
  { value: "farm_rent",   label: "أجرة مزرعة" },
  { value: "calf_feed",   label: "علف عجول" },
  { value: "calf_straw",  label: "قش عجول" },
  { value: "treatments",  label: "علاجات" },
  { value: "other",       label: "مصاريف أخرى" },
  { value: "cow_death",   label: "وفاة بقرة" },
  { value: "calf_death",  label: "وفاة عجل" },
];

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

function labelFor(arr, val) {
  return arr.find((x) => x.value === val)?.label || val;
}

// ── Generic list section ──────────────────────────────────────────────────────

function ListSection({ title, rows, columns, onAdd, onEdit, onDelete, totalLabel, total, accentColor }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "1rem" }}>{title}</h2>
        <div className="section-header-right">
          <span style={{ fontSize: "0.85rem", color: "#555" }}>
            {totalLabel}: <strong style={{ color: accentColor }}>{fmt(total)} ₪</strong>
          </span>
          <button className="btn btn-primary" onClick={onAdd} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>+ إضافة</button>
        </div>
      </div>
      <div className="table-container">
        {rows.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}>
            <p>لا توجد قيود بعد</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {columns.map((c) => <td key={c.key} data-label={c.label}>{c.render ? c.render(row[c.key], row) : row[c.key]}</td>)}
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => onEdit(row)}>تعديل</button>
                    <button className="action-btn btn-delete" onClick={() => onDelete(row.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Capital section ───────────────────────────────────────────────────────────

function CapitalSection({ items, onAdd, onEdit, onDelete }) {
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  return (
    <ListSection
      title="رأس المال"
      rows={items}
      columns={[
        { key: "amount",  label: "المبلغ",   render: (v) => `${fmt(v)} ₪` },
        { key: "date",    label: "التاريخ",  render: fmtDate },
        { key: "notes",   label: "ملاحظات",  render: (v) => v || "—" },
      ]}
      onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}
      totalLabel="الإجمالي" total={total} accentColor="#1d4ed8"
    />
  );
}

// ── Revenues section ──────────────────────────────────────────────────────────

function RevenuesSection({ items, onAdd, onEdit, onDelete }) {
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  return (
    <ListSection
      title="المبيعات (إيرادات)"
      rows={items}
      columns={[
        { key: "type",   label: "النوع",    render: (v) => labelFor(REVENUE_TYPES, v) },
        { key: "amount", label: "المبلغ",   render: (v) => `${fmt(v)} ₪` },
        { key: "date",   label: "التاريخ",  render: fmtDate },
        { key: "notes",  label: "ملاحظات",  render: (v) => v || "—" },
      ]}
      onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}
      totalLabel="إجمالي الإيرادات" total={total} accentColor="#16a34a"
    />
  );
}

// ── Expenses section ──────────────────────────────────────────────────────────

function ExpensesSection({ items, onAdd, onEdit, onDelete }) {
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  const byCategory = EXPENSE_CATS.map((cat) => ({
    ...cat,
    total: items.filter((i) => i.category === cat.value).reduce((s, i) => s + Number(i.amount || 0), 0),
  })).filter((c) => c.total > 0);

  return (
    <div style={{ marginBottom: 28 }}>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "1rem" }}>المصاريف</h2>
        <div className="section-header-right">
          <span style={{ fontSize: "0.85rem", color: "#555" }}>
            إجمالي المصاريف: <strong style={{ color: "#dc2626" }}>{fmt(total)} ₪</strong>
          </span>
          <button className="btn btn-primary" onClick={onAdd} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>+ إضافة</button>
        </div>
      </div>

      {/* {byCategory.length > 0 && (
        <div className="summary-bar" style={{ marginBottom: 12 }}>
          {byCategory.map((c) => (
            <div key={c.value} className="s-item">
              <span className="s-label">{c.label}</span>
              <span className="s-val" style={{ color: "#dc2626", fontSize: "0.9rem" }}>{fmt(c.total)} ₪</span>
            </div>
          ))}
        </div>
      )} */}

      <div className="table-container">
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}>
            <p>لا توجد مصاريف بعد</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>البند</th>
                <th>المبلغ</th>
                <th>التاريخ</th>
                <th>ملاحظات</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="البند">{labelFor(EXPENSE_CATS, item.category)}</td>
                  <td data-label="المبلغ">{fmt(item.amount)} ₪</td>
                  <td data-label="التاريخ">{fmtDate(item.date)}</td>
                  <td data-label="ملاحظات">{item.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => onEdit(item)}>تعديل</button>
                    <button className="action-btn btn-delete" onClick={() => onDelete(item.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Salaries section ──────────────────────────────────────────────────────────

function SalariesSection({ items, onAdd, onEdit, onDelete }) {
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);
  return (
    <ListSection
      title="رواتب الموظفين"
      rows={items}
      columns={[
        { key: "employee_name", label: "اسم الموظف" },
        { key: "amount",        label: "الراتب",    render: (v) => `${fmt(v)} ₪` },
        { key: "date",          label: "التاريخ",   render: fmtDate },
        { key: "notes",         label: "ملاحظات",   render: (v) => v || "—" },
      ]}
      onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}
      totalLabel="إجمالي الرواتب" total={total} accentColor="#d97706"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Finances() {
  const [tab, setTab]           = useState("revenues");
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [capital, setCapital]   = useState([]);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({});
  const [editId, setEditId]     = useState(null);

  const load = () => {
    axios.get(`${API}/revenues`).then((r) => setRevenues(r.data));
    axios.get(`${API}/expenses`).then((r) => setExpenses(r.data));
    axios.get(`${API}/salaries`).then((r) => setSalaries(r.data));
    axios.get(`${API}/capital`).then((r)  => setCapital(r.data));
  };

  useEffect(() => { load(); }, []);

  const openModal = (type, row = null) => {
    setEditId(row?.id || null);
    setModal(type);
    if (type === "revenue")  setForm(row ? { type: row.type, amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { type: "milk", amount: "", date: today(), notes: "" });
    if (type === "expense")  setForm(row ? { category: row.category, amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { category: "electricity", amount: "", date: today(), notes: "" });
    if (type === "salary")   setForm(row ? { employee_name: row.employee_name, amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { employee_name: "", amount: "", date: today(), notes: "" });
    if (type === "capital")  setForm(row ? { amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { amount: "", date: today(), notes: "" });
  };

  const handleDelete = (type, id) => {
    if (!confirm("هل تريد حذف هذا القيد؟")) return;
    const ep = { revenue: "revenues", expense: "expenses", salary: "salaries", capital: "capital" }[type];
    axios.delete(`${API}/${ep}/${id}`).then(load);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const epMap = { revenue: "revenues", expense: "expenses", salary: "salaries", capital: "capital" };
    const ep = epMap[modal];
    const req = editId
      ? axios.put(`${API}/${ep}/${editId}`, form)
      : axios.post(`${API}/${ep}`, form);
    req.then(() => { setModal(null); load(); });
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const totalRevenues = revenues.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalSalaries = salaries.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCapital  = capital.reduce((s, i) => s + Number(i.amount || 0), 0);
  const profit = totalRevenues - totalExpenses - totalSalaries;

  return (
    <div>
      <div className="page-header">
        <h1>الموردات والمصاريف</h1>
      </div>

      <div className="cards-row" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-label">رأس المال</div>
          <div className="card-value blue">{fmt(totalCapital)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">إجمالي الإيرادات</div>
          <div className="card-value green">{fmt(totalRevenues)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">إجمالي المصاريف</div>
          <div className="card-value red">{fmt(totalExpenses + totalSalaries)} ₪</div>
        </div>
        <div className="card">
          <div className="card-label">{profit >= 0 ? "الأرباح" : "الخسائر"}</div>
          <div className={`card-value ${profit >= 0 ? "green" : "red"}`}>{fmt(Math.abs(profit))} ₪</div>
        </div>
      </div>

      <div className="tabs">
        {[["revenues","المبيعات"],["expenses","المصاريف"],["salaries","الرواتب"],["capital","رأس المال"]].map(([v,l]) => (
          <button key={v} className={`tab ${tab===v?"active":""}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === "revenues" && (
        <RevenuesSection
          items={revenues}
          onAdd={() => openModal("revenue")}
          onEdit={(r) => openModal("revenue", r)}
          onDelete={(id) => handleDelete("revenue", id)}
        />
      )}

      {tab === "expenses" && (
        <ExpensesSection
          items={expenses}
          onAdd={() => openModal("expense")}
          onEdit={(r) => openModal("expense", r)}
          onDelete={(id) => handleDelete("expense", id)}
        />
      )}

      {tab === "salaries" && (
        <SalariesSection
          items={salaries}
          onAdd={() => openModal("salary")}
          onEdit={(r) => openModal("salary", r)}
          onDelete={(id) => handleDelete("salary", id)}
        />
      )}

      {tab === "capital" && (
        <CapitalSection
          items={capital}
          onAdd={() => openModal("capital")}
          onEdit={(r) => openModal("capital", r)}
          onDelete={(id) => handleDelete("capital", id)}
        />
      )}

      {/* Revenue Modal */}
      {modal === "revenue" && (
        <Modal title={editId ? "تعديل إيراد" : "إضافة إيراد"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>النوع *</label>
              <select required value={form.type} onChange={set("type")}>
                {REVENUE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>المبلغ (₪) *</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>التاريخ *</label>
                <input required type="date" value={form.date} onChange={set("date")} />
              </div>
            </div>
            <div className="form-group">
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={set("notes")} />
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">{editId ? "حفظ" : "إضافة"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Expense Modal */}
      {modal === "expense" && (
        <Modal title={editId ? "تعديل مصروف" : "إضافة مصروف"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>البند *</label>
              <select required value={form.category} onChange={set("category")}>
                {EXPENSE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>المبلغ (₪) *</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>التاريخ *</label>
                <input required type="date" value={form.date} onChange={set("date")} />
              </div>
            </div>
            <div className="form-group">
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={set("notes")} />
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">{editId ? "حفظ" : "إضافة"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Salary Modal */}
      {modal === "salary" && (
        <Modal title={editId ? "تعديل راتب" : "إضافة راتب"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>اسم الموظف *</label>
              <input required value={form.employee_name} onChange={set("employee_name")} placeholder="اسم الموظف" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>الراتب (₪) *</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>التاريخ *</label>
                <input required type="date" value={form.date} onChange={set("date")} />
              </div>
            </div>
            <div className="form-group">
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={set("notes")} />
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">{editId ? "حفظ" : "إضافة"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Capital Modal */}
      {modal === "capital" && (
        <Modal title={editId ? "تعديل قيد رأس المال" : "إضافة رأس مال"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>المبلغ (₪) *</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>التاريخ *</label>
                <input required type="date" value={form.date} onChange={set("date")} />
              </div>
            </div>
            <div className="form-group">
              <label>ملاحظات</label>
              <textarea rows={2} value={form.notes} onChange={set("notes")} />
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">{editId ? "حفظ" : "إضافة"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
