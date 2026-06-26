import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../components/Modal";

const API = "http://localhost:3001/api";
const today = () => new Date().toISOString().split("T")[0];

function fmt(n) {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}

const REVENUE_TYPES = [
  { value: "milk", label: "حليب" },
  { value: "cow",  label: "بيع بقرة" },
  { value: "calf", label: "بيع عجل" },
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
];

const LOSS_TYPES = [
  { value: "cow_death",  label: "وفاة بقرة" },
  { value: "calf_death", label: "وفاة عجل" },
  { value: "abortion",   label: "إجهاض" },
  { value: "theft",      label: "سرقة" },
  { value: "other",      label: "أخرى" },
];

function labelFor(arr, val) {
  return arr.find((x) => x.value === val)?.label || val;
}

// ── Summary cards ─────────────────────────────────────────────────────────────

function SummaryCards({ revenues, expenses, salaries, losses, capital, assets }) {
  const totalExp = expenses + salaries;
  const profit   = revenues - totalExp - losses;
  return (
    <div className="cards-row" style={{ marginBottom: 24 }}>
      <div className="card">
        <div className="card-label">الموجودات (قيمة الحيوانات)</div>
        <div className="card-value blue">{fmt(assets)} ₪</div>
      </div>
      <div className="card">
        <div className="card-label">رأس المال</div>
        <div className="card-value" style={{ color: "#1d4ed8" }}>{fmt(capital)} ₪</div>
      </div>
      <div className="card">
        <div className="card-label">مبيعات</div>
        <div className="card-value green">{fmt(revenues)} ₪</div>
      </div>
      <div className="card">
        <div className="card-label">المصروفات</div>
        <div className="card-value red">{fmt(totalExp)} ₪</div>
      </div>
      <div className="card">
        <div className="card-label">الخسائر</div>
        <div className="card-value" style={{ color: "#9d174d" }}>{fmt(losses)} ₪</div>
      </div>
      <div className="card">
        <div className="card-label">{profit >= 0 ? "صافي الربح" : "صافي الخسارة"}</div>
        <div className={`card-value ${profit >= 0 ? "green" : "red"}`}>{fmt(Math.abs(profit))} ₪</div>
      </div>
    </div>
  );
}

// ── Revenues tab ──────────────────────────────────────────────────────────────

function RevenuesTab({ items, onAdd, onEdit, onDelete, onToggleHide }) {
  const [showHidden, setShowHidden] = useState(false);

  const visible = showHidden ? items : items.filter((i) => !i.is_hidden);
  const hiddenCount = items.filter((i) => i.is_hidden).length;
  const total = items.filter((i) => !i.is_hidden).reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "1rem" }}>مبيعات</h2>
        <div className="section-header-right">
          <span style={{ fontSize: "0.85rem", color: "#555" }}>
            الإجمالي: <strong style={{ color: "#16a34a" }}>{fmt(total)} ₪</strong>
          </span>
          {hiddenCount > 0 && (
            <button
              className="btn btn-ghost"
              style={{ padding: "7px 14px", fontSize: "0.82rem" }}
              onClick={() => setShowHidden((v) => !v)}
            >
              {showHidden ? "إخفاء المخفية" : `عرض المخفية (${hiddenCount})`}
            </button>
          )}
          <button className="btn btn-primary" onClick={onAdd} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>+ إضافة مبيعات</button>
        </div>
      </div>

      <div className="table-container">
        {visible.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}><p>لا توجد مبيعات بعد</p></div>
        ) : (
          <table>
            <thead>
              <tr><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th>الإجراءات</th></tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} style={r.is_hidden ? { opacity: 0.45, background: "#f8fafc" } : {}}>
                  <td data-label="النوع">
                    <span className="badge badge-sold">{labelFor(REVENUE_TYPES, r.type)}</span>
                  </td>
                  <td data-label="المبلغ">{fmt(r.amount)} ₪</td>
                  <td data-label="التاريخ">{fmtDate(r.date)}</td>
                  <td data-label="ملاحظات">{r.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => onEdit(r)}>تعديل</button>
                    <button className="action-btn btn-delete" onClick={() => onDelete(r.id)}>حذف</button>
                    <button
                      className="action-btn"
                      style={r.is_hidden
                        ? { background: "#dcfce7", color: "#16a34a" }
                        : { background: "#f1f5f9", color: "#64748b" }}
                      onClick={() => onToggleHide(r.id)}
                    >
                      {r.is_hidden ? "إظهار" : "إخفاء"}
                    </button>
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

// ── Expenses tab ──────────────────────────────────────────────────────────────

function HideBtn({ hidden, onToggle }) {
  return (
    <button
      className="action-btn"
      style={hidden ? { background: "#dcfce7", color: "#16a34a" } : { background: "#f1f5f9", color: "#64748b" }}
      onClick={onToggle}
    >
      {hidden ? "إظهار" : "إخفاء"}
    </button>
  );
}

function HideToggle({ count, show, onToggle }) {
  if (!count) return null;
  return (
    <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }} onClick={onToggle}>
      {show ? "إخفاء المخفية" : `عرض المخفية (${count})`}
    </button>
  );
}

const FIXED_EXP_CATS = EXPENSE_CATS.filter((c) => c.value !== "other");

function ExpensesTab({ expenses, salaries, onEditExp, onDeleteExp, onToggleHideExp, onAddSal, onEditSal, onDeleteSal, onToggleHideSal }) {
  const [sub, setSub]             = useState("expenses");
  const [showHiddenSal, setShowHiddenSal] = useState(false);
  const [showOtherHidden, setShowOtherHidden] = useState(false);

  const fixedExpenses = expenses.filter((e) => e.category !== "other");
  const otherExpenses = expenses.filter((e) => e.category === "other");

  const totalFixed = fixedExpenses.filter((e) => !e.is_hidden).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalOther = otherExpenses.filter((e) => !e.is_hidden).reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalExp   = totalFixed + totalOther;

  const visibleOther   = showOtherHidden ? otherExpenses : otherExpenses.filter((e) => !e.is_hidden);
  const hiddenOtherCnt = otherExpenses.filter((e) => e.is_hidden).length;

  const visibleSal   = showHiddenSal ? salaries : salaries.filter((i) => !i.is_hidden);
  const hiddenSalCnt = salaries.filter((i) => i.is_hidden).length;
  const totalSal     = salaries.filter((i) => !i.is_hidden).reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${sub === "expenses" ? "active" : ""}`} onClick={() => setSub("expenses")}>
          مصاريف تشغيلية ({fmt(totalExp)} ₪)
        </button>
        <button className={`tab ${sub === "salaries" ? "active" : ""}`} onClick={() => setSub("salaries")}>
          رواتب ({fmt(totalSal)} ₪)
        </button>
      </div>

      {sub === "expenses" && (
        <div>
          {/* Fixed categories table */}
          <div className="table-container" style={{ marginBottom: 28 }}>
            <table>
              <thead>
                <tr><th>البند</th><th>الإجمالي</th><th>الإجراءات</th></tr>
              </thead>
              <tbody>
                {FIXED_EXP_CATS.map((cat) => {
                  const catTotal = fixedExpenses
                    .filter((e) => e.category === cat.value && !e.is_hidden)
                    .reduce((s, e) => s + Number(e.amount || 0), 0);
                  return (
                    <tr key={cat.value}>
                      <td data-label="البند"><strong>{cat.label}</strong></td>
                      <td data-label="الإجمالي">
                        {catTotal > 0
                          ? <span style={{ color: "#dc2626", fontWeight: 600 }}>{fmt(catTotal)} ₪</span>
                          : <span style={{ color: "#94a3b8" }}>—</span>}
                      </td>
                      <td data-label="الإجراءات">
                        <button
                          className="action-btn btn-edit"
                          onClick={() => onEditExp({ category: cat.value })}
                        >
                          + إضافة سجل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Other expenses */}
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: "1rem" }}>مصاريف أخرى</h2>
            <div className="section-header-right">
              <HideToggle count={hiddenOtherCnt} show={showOtherHidden} onToggle={() => setShowOtherHidden((v) => !v)} />
              <button className="btn btn-primary" onClick={() => onEditExp({ category: "other" })} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>
                + إضافة
              </button>
            </div>
          </div>
          <div className="table-container">
            {visibleOther.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 20px" }}><p>لا توجد مصاريف أخرى بعد</p></div>
            ) : (
              <table>
                <thead><tr><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
                <tbody>
                  {visibleOther.map((e) => (
                    <tr key={e.id} style={e.is_hidden ? { opacity: 0.45, background: "#f8fafc" } : {}}>
                      <td data-label="المبلغ">{fmt(e.amount)} ₪</td>
                      <td data-label="التاريخ">{fmtDate(e.date)}</td>
                      <td data-label="ملاحظات">{e.notes || "—"}</td>
                      <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                        <button className="action-btn btn-edit" onClick={() => onEditExp(e)}>تعديل</button>
                        <button className="action-btn btn-delete" onClick={() => onDeleteExp(e.id)}>حذف</button>
                        <HideBtn hidden={e.is_hidden} onToggle={() => onToggleHideExp(e.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {sub === "salaries" && (
        <div>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: "1rem" }}>رواتب الموظفين</h2>
            <div className="section-header-right">
              <HideToggle count={hiddenSalCnt} show={showHiddenSal} onToggle={() => setShowHiddenSal((v) => !v)} />
              <button className="btn btn-primary" onClick={onAddSal} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>+ إضافة راتب</button>
            </div>
          </div>
          <div className="table-container">
            {visibleSal.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 20px" }}><p>لا توجد رواتب بعد</p></div>
            ) : (
              <table>
                <thead><tr><th>اسم الموظف</th><th>الراتب</th><th>التاريخ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
                <tbody>
                  {visibleSal.map((s) => (
                    <tr key={s.id} style={s.is_hidden ? { opacity: 0.45, background: "#f8fafc" } : {}}>
                      <td data-label="الموظف">{s.employee_name}</td>
                      <td data-label="الراتب">{fmt(s.amount)} ₪</td>
                      <td data-label="التاريخ">{fmtDate(s.date)}</td>
                      <td data-label="ملاحظات">{s.notes || "—"}</td>
                      <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                        <button className="action-btn btn-edit" onClick={() => onEditSal(s)}>تعديل</button>
                        <button className="action-btn btn-delete" onClick={() => onDeleteSal(s.id)}>حذف</button>
                        <HideBtn hidden={s.is_hidden} onToggle={() => onToggleHideSal(s.id)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Losses tab ────────────────────────────────────────────────────────────────

function LossesTab({ items, onAdd, onEdit, onDelete, onToggleHide }) {
  const [showHidden, setShowHidden] = useState(false);

  const newLosses    = items.filter((i) => i.source === "loss");
  const legacyLosses = [];

  const visibleNew   = showHidden ? newLosses : newLosses.filter((i) => !i.is_hidden);
  const hiddenCount  = newLosses.filter((i) => i.is_hidden).length;
  const total        = newLosses.filter((i) => !i.is_hidden).reduce((s, i) => s + Number(i.amount || 0), 0)
                     + legacyLosses.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "1rem" }}>الخسائر</h2>
        <div className="section-header-right">
          <span style={{ fontSize: "0.85rem", color: "#555" }}>
            الإجمالي: <strong style={{ color: "#9d174d" }}>{fmt(total)} ₪</strong>
          </span>
          <HideToggle count={hiddenCount} show={showHidden} onToggle={() => setShowHidden((v) => !v)} />
          <button className="btn btn-primary" onClick={onAdd} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>+ إضافة خسارة</button>
        </div>
      </div>

      <div className="table-container">
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}><p>لا توجد خسائر مسجلة</p></div>
        ) : (
          <table>
            <thead><tr><th>النوع</th><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
            <tbody>
              {visibleNew.map((l) => (
                <tr key={`loss-${l.id}`} style={l.is_hidden ? { opacity: 0.45, background: "#f8fafc" } : {}}>
                  <td data-label="النوع">{labelFor(LOSS_TYPES, l.type)}</td>
                  <td data-label="المبلغ">{fmt(l.amount)} ₪</td>
                  <td data-label="التاريخ">{fmtDate(l.date)}</td>
                  <td data-label="ملاحظات">{l.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => onEdit(l)}>تعديل</button>
                    <button className="action-btn btn-delete" onClick={() => onDelete(l.id)}>حذف</button>
                    <HideBtn hidden={l.is_hidden} onToggle={() => onToggleHide(l.id)} />
                  </td>
                </tr>
              ))}
              {legacyLosses.map((l) => (
                <tr key={`exp-${l.id}`} style={{ opacity: 0.6 }}>
                  <td data-label="النوع">{labelFor(LOSS_TYPES, l.type)}</td>
                  <td data-label="المبلغ">{fmt(l.amount)} ₪</td>
                  <td data-label="التاريخ">{fmtDate(l.date)}</td>
                  <td data-label="ملاحظات">{l.notes || "—"}</td>
                  <td data-label="الإجراءات"><span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>سجل قديم</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Assets tab ────────────────────────────────────────────────────────────────

function AssetsTab({ cows, calves, custom, onToggleHideCow, onToggleHideCalve, onAddCustom, onEditCustom, onDeleteCustom }) {
  const [showHidden, setShowHidden] = useState(false);
  const [subTab, setSubTab]         = useState("animals");

  const visibleCows   = showHidden ? cows   : cows.filter((c) => !c.is_hidden_asset);
  const visibleCalves = showHidden ? calves : calves.filter((c) => !c.is_hidden_asset);
  const hiddenCount   = cows.filter((c) => c.is_hidden_asset).length + calves.filter((c) => c.is_hidden_asset).length;

  const totalCows    = visibleCows.reduce((s, c) => s + Number(c.purchase_price || 0), 0);
  const totalCalves  = visibleCalves.reduce((s, c) => s + Number(c.purchase_price || 0), 0);
  const totalAnimals = totalCows + totalCalves;
  const totalCustom  = custom.reduce((s, c) => s + Number(c.value || 0), 0);
  const totalAll     = totalAnimals + totalCustom;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ padding: "14px 18px", background: "#f0fdf4", borderRadius: 10, border: "1px solid #bbf7d0", marginBottom: 16 }}>
        <span style={{ fontSize: "0.85rem", color: "#15803d", fontWeight: 600 }}>
          إجمالي الموجودات: {fmt(totalAll)} ₪
        </span>
        <span style={{ fontWeight: 400, marginRight: 16, color: "#64748b", fontSize: "0.82rem" }}>
          حيوانات: {fmt(totalAnimals)} ₪ · أخرى: {fmt(totalCustom)} ₪
        </span>
      </div>

      {/* Sub tabs */}
      <div className="tabs" style={{ marginBottom: 16 }}>
        <button className={`tab ${subTab === "animals" ? "active" : ""}`} onClick={() => setSubTab("animals")}>
          حيوانات ({fmt(totalAnimals)} ₪)
        </button>
        <button className={`tab ${subTab === "custom" ? "active" : ""}`} onClick={() => setSubTab("custom")}>
          موجودات أخرى ({fmt(totalCustom)} ₪)
        </button>
      </div>

      {/* Animals sub-tab */}
      {subTab === "animals" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            {hiddenCount > 0 && (
              <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: "0.82rem" }}
                onClick={() => setShowHidden((v) => !v)}>
                {showHidden ? "إخفاء المخفية" : `عرض المخفية (${hiddenCount})`}
              </button>
            )}
          </div>

          {visibleCows.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8, fontWeight: 600 }}>
                الأبقار النشطة — إجمالي {fmt(totalCows)} ₪
              </p>
              <div className="table-container">
                <table>
                  <thead><tr><th>رقم البقرة</th><th>تاريخ الإحضار</th><th>ثمن الشراء</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
                  <tbody>
                    {visibleCows.map((c) => (
                      <tr key={c.id} style={c.is_hidden_asset ? { opacity: 0.45, background: "#f8fafc" } : {}}>
                        <td data-label="رقم البقرة"><strong>{c.number}</strong></td>
                        <td data-label="تاريخ الإحضار">{fmtDate(c.arrival_date)}</td>
                        <td data-label="ثمن الشراء">{fmt(c.purchase_price)} ₪</td>
                        <td data-label="ملاحظات">{c.notes || "—"}</td>
                        <td data-label="الإجراءات">
                          <HideBtn hidden={c.is_hidden_asset} onToggle={() => onToggleHideCow(c.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {visibleCalves.length > 0 && (
            <div>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: 8, fontWeight: 600 }}>
                العجول النشطة — إجمالي {fmt(totalCalves)} ₪
              </p>
              <div className="table-container">
                <table>
                  <thead><tr><th>رقم العجل</th><th>المصدر</th><th>التاريخ</th><th>ثمن الشراء</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
                  <tbody>
                    {visibleCalves.map((c) => (
                      <tr key={c.id} style={c.is_hidden_asset ? { opacity: 0.45, background: "#f8fafc" } : {}}>
                        <td data-label="رقم العجل"><strong>{c.number || "—"}</strong></td>
                        <td data-label="المصدر">
                          <span className={`badge ${c.origin === "born" ? "badge-born" : "badge-purchased"}`}>
                            {c.origin === "born" ? "مواليد" : "مشتراة"}
                          </span>
                        </td>
                        <td data-label="التاريخ">{fmtDate(c.birth_date || c.arrival_date)}</td>
                        <td data-label="ثمن الشراء">{fmt(c.purchase_price)} ₪</td>
                        <td data-label="ملاحظات">{c.notes || "—"}</td>
                        <td data-label="الإجراءات">
                          <HideBtn hidden={c.is_hidden_asset} onToggle={() => onToggleHideCalve(c.id)} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {visibleCows.length === 0 && visibleCalves.length === 0 && (
            <div className="empty-state" style={{ padding: "48px 20px" }}><p>لا توجد موجودات حيوانية حالياً</p></div>
          )}
        </div>
      )}

      {/* Custom assets sub-tab */}
      {subTab === "custom" && (
        <div>
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: "1rem" }}>موجودات أخرى</h2>
            <div className="section-header-right">
              <span style={{ fontSize: "0.85rem", color: "#555" }}>
                الإجمالي: <strong style={{ color: "#1d4ed8" }}>{fmt(totalCustom)} ₪</strong>
              </span>
              <button className="btn btn-primary" onClick={onAddCustom} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>
                + إضافة
              </button>
            </div>
          </div>
          <div className="table-container">
            {custom.length === 0 ? (
              <div className="empty-state" style={{ padding: "28px 20px" }}><p>لا توجد موجودات مضافة بعد</p></div>
            ) : (
              <table>
                <thead><tr><th>الاسم</th><th>القيمة</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead>
                <tbody>
                  {custom.map((c) => (
                    <tr key={c.id}>
                      <td data-label="الاسم"><strong>{c.name}</strong></td>
                      <td data-label="القيمة">{fmt(c.value)} ₪</td>
                      <td data-label="ملاحظات">{c.notes || "—"}</td>
                      <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                        <button className="action-btn btn-edit" onClick={() => onEditCustom(c)}>تعديل</button>
                        <button className="action-btn btn-delete" onClick={() => onDeleteCustom(c.id)}>حذف</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Capital tab ───────────────────────────────────────────────────────────────

function CapitalTab({ items, onAdd, onEdit, onDelete }) {
  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: "1rem" }}>رأس المال</h2>
        <div className="section-header-right">
          <span style={{ fontSize: "0.85rem", color: "#555" }}>
            الإجمالي: <strong style={{ color: "#1d4ed8" }}>{fmt(total)} ₪</strong>
          </span>
          <button className="btn btn-primary" onClick={onAdd} style={{ padding: "7px 14px", fontSize: "0.82rem" }}>
            + إضافة
          </button>
        </div>
      </div>

      <div className="table-container">
        {items.length === 0 ? (
          <div className="empty-state" style={{ padding: "28px 20px" }}><p>لا يوجد رأس مال مسجل بعد</p></div>
        ) : (
          <table>
            <thead>
              <tr><th>المبلغ</th><th>التاريخ</th><th>ملاحظات</th><th>الإجراءات</th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td data-label="المبلغ"><strong style={{ color: "#1d4ed8" }}>{fmt(c.amount)} ₪</strong></td>
                  <td data-label="التاريخ">{fmtDate(c.date)}</td>
                  <td data-label="ملاحظات">{c.notes || "—"}</td>
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => onEdit(c)}>تعديل</button>
                    <button className="action-btn btn-delete" onClick={() => onDelete(c.id)}>حذف</button>
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

// ── Main component ────────────────────────────────────────────────────────────

export default function Finances() {
  const [tab, setTab]           = useState("revenues");
  const [revenues, setRevenues] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [losses, setLosses]     = useState([]);
  const [capital, setCapital]   = useState([]);
  const [assets, setAssets]     = useState({ cows: [], calves: [] });
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState({});
  const [editId, setEditId]     = useState(null);
  const [fixedCat, setFixedCat] = useState(false);
  const [errMsg, setErrMsg]     = useState(null);

  const showErr = (e) => {
    const msg = e?.response?.data?.error || "حدث خطأ، حاول مجدداً";
    setErrMsg(msg);
    setTimeout(() => setErrMsg(null), 4000);
  };

  const load = () => {
    axios.get(`${API}/revenues`).then((r) => setRevenues(r.data));
    axios.get(`${API}/expenses`).then((r) => setExpenses(r.data.filter(e => !["cow_death","calf_death"].includes(e.category))));
    axios.get(`${API}/salaries`).then((r) => setSalaries(r.data));
    axios.get(`${API}/losses`).then((r) => setLosses(r.data));
    axios.get(`${API}/capital`).then((r) => setCapital(r.data));
    axios.get(`${API}/assets`).then((r) => setAssets(r.data));
  };

  useEffect(() => { load(); }, []);

  const openModal = (type, row = null) => {
    setEditId(row?.id || null);
    setModal(type);
    if (type === "revenue") setForm(row ? { amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { amount: "", date: today(), notes: "" });
    if (type === "expense") {
      const isFixed = row && !row.id;
      setFixedCat(isFixed);
      setForm(row
        ? { category: row.category || "electricity", amount: row.amount || "", date: row.date?.split("T")[0] || today(), notes: row.notes || "" }
        : { category: "electricity", amount: "", date: today(), notes: "" });
    }
    if (type === "salary")  setForm(row ? { employee_name: row.employee_name, amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { employee_name: "", amount: "", date: today(), notes: "" });
    if (type === "loss")    setForm(row ? { type: row.type, amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { type: "cow_death", amount: "", date: today(), notes: "" });
    if (type === "capital") setForm(row ? { amount: row.amount, date: row.date?.split("T")[0] || today(), notes: row.notes || "" } : { amount: "", date: today(), notes: "" });
  };

  const handleDelete = (type, id) => {
    if (!confirm("هل تريد حذف هذا القيد؟")) return;
    const ep = { revenue: "revenues", expense: "expenses", salary: "salaries", loss: "losses", capital: "capital" }[type];
    axios.delete(`${API}/${ep}/${id}`).then(load).catch(showErr);
  };

  const openCustomAsset = (row = null) => {
    setEditId(row?.id || null);
    setForm(row ? { name: row.name, value: row.value, notes: row.notes || "" } : { name: "", value: "", notes: "" });
    setModal("custom_asset");
  };
  const handleDeleteCustom = (id) => {
    if (!confirm("هل تريد حذف هذا الموجود؟")) return;
    axios.delete(`${API}/custom-assets/${id}`).then(load).catch(showErr);
  };
  const handleSubmitCustom = (e) => {
    e.preventDefault();
    const req = editId
      ? axios.put(`${API}/custom-assets/${editId}`, form)
      : axios.post(`${API}/custom-assets`, form);
    req.then(() => { setModal(null); load(); }).catch(showErr);
  };

  const handleToggleHide = (id) => {
    axios.patch(`${API}/revenues/${id}/hide`).then(load);
  };
  const handleToggleHideExp  = (id) => axios.patch(`${API}/expenses/${id}/hide`).then(load);
  const handleToggleHideSal  = (id) => axios.patch(`${API}/salaries/${id}/hide`).then(load);
  const handleToggleHideLoss = (id) => axios.patch(`${API}/losses/${id}/hide`).then(load);
  const handleToggleHideCow  = (id) => axios.patch(`${API}/assets/cow/${id}/hide`).then(load);
  const handleToggleHideCalve = (id) => axios.patch(`${API}/assets/calf/${id}/hide`).then(load);

  const handleSubmit = (e) => {
    e.preventDefault();
    const epMap = { revenue: "revenues", expense: "expenses", salary: "salaries", loss: "losses", capital: "capital" };
    const ep    = epMap[modal];
    const data  = modal === "revenue" ? { type: "milk", ...form } : form;
    const req   = editId ? axios.put(`${API}/${ep}/${editId}`, data) : axios.post(`${API}/${ep}`, data);
    req.then(() => { setModal(null); load(); }).catch(showErr);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const totalRevenues = revenues.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalSalaries = salaries.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalLosses   = losses.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCapital  = capital.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalAssets   = [...(assets.cows || []), ...(assets.calves || [])].reduce((s, c) => s + Number(c.purchase_price || 0), 0)
                      + (assets.custom || []).reduce((s, c) => s + Number(c.value || 0), 0);

  return (
    <div>
      {errMsg && <div className="error-toast">{errMsg}</div>}
      <div className="page-header">
        <h1>المبيعات والمصاريف</h1>
      </div>

      <SummaryCards
        revenues={totalRevenues}
        expenses={totalExpenses}
        salaries={totalSalaries}
        losses={totalLosses}
        capital={totalCapital}
        assets={totalAssets}
      />

      <div className="tabs">
        {[["revenues","مبيعات"],["expenses","المصروفات"],["losses","الخسائر"],["assets","الموجودات"],["capital","رأس المال"]].map(([v, l]) => (
          <button key={v} className={`tab ${tab === v ? "active" : ""}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {tab === "revenues" && (
        <RevenuesTab
          items={revenues}
          onAdd={() => openModal("revenue")}
          onEdit={(r) => openModal("revenue", r)}
          onDelete={(id) => handleDelete("revenue", id)}
          onToggleHide={handleToggleHide}
        />
      )}

      {tab === "expenses" && (
        <ExpensesTab
          expenses={expenses}
          salaries={salaries}
          onEditExp={(e) => openModal("expense", e)}
          onDeleteExp={(id) => handleDelete("expense", id)}
          onToggleHideExp={handleToggleHideExp}
          onAddSal={() => openModal("salary")}
          onEditSal={(s) => openModal("salary", s)}
          onDeleteSal={(id) => handleDelete("salary", id)}
          onToggleHideSal={handleToggleHideSal}
        />
      )}

      {tab === "losses" && (
        <LossesTab
          items={losses}
          onAdd={() => openModal("loss")}
          onEdit={(l) => openModal("loss", l)}
          onDelete={(id) => handleDelete("loss", id)}
          onToggleHide={handleToggleHideLoss}
        />
      )}

      {tab === "assets" && (
        <AssetsTab
          cows={assets.cows}
          calves={assets.calves}
          custom={assets.custom || []}
          onToggleHideCow={handleToggleHideCow}
          onToggleHideCalve={handleToggleHideCalve}
          onAddCustom={() => openCustomAsset()}
          onEditCustom={(c) => openCustomAsset(c)}
          onDeleteCustom={handleDeleteCustom}
        />
      )}

      {tab === "capital" && (
        <CapitalTab
          items={capital}
          onAdd={() => openModal("capital")}
          onEdit={(c) => openModal("capital", c)}
          onDelete={(id) => handleDelete("capital", id)}
        />
      )}

      {/* Revenue Modal (milk only) */}
      {modal === "revenue" && (
        <Modal title={editId ? "تعديل مبيعات حليب" : "إضافة مبيعات حليب"} onClose={() => setModal(null)}>
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

      {/* Expense Modal */}
      {modal === "expense" && (
        <Modal
          title={editId ? "تعديل مصروف" : fixedCat ? `إضافة سجل — ${labelFor(EXPENSE_CATS, form.category)}` : "إضافة مصروف"}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSubmit}>
            {!fixedCat && (
              <div className="form-group">
                <label>البند *</label>
                <select required value={form.category} onChange={set("category")}>
                  {EXPENSE_CATS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
            )}
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

      {/* Loss Modal */}
      {modal === "loss" && (
        <Modal title={editId ? "تعديل خسارة" : "إضافة خسارة"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>نوع الخسارة *</label>
              <select required value={form.type} onChange={set("type")}>
                {LOSS_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
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

      {/* Capital Modal */}
      {modal === "capital" && (
        <Modal title={editId ? "تعديل رأس مال" : "إضافة رأس مال"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>المبلغ (₪) *</label>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={set("amount")} placeholder="0.00" autoFocus />
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

      {/* Custom Asset Modal */}
      {modal === "custom_asset" && (
        <Modal title={editId ? "تعديل موجود" : "إضافة موجود"} onClose={() => setModal(null)}>
          <form onSubmit={handleSubmitCustom}>
            <div className="form-group">
              <label>الاسم *</label>
              <input required value={form.name} onChange={set("name")} placeholder="مثال: تراكتور، أرض، معدات..." autoFocus />
            </div>
            <div className="form-group">
              <label>القيمة (₪) *</label>
              <input required type="number" min="0" step="0.01" value={form.value} onChange={set("value")} placeholder="0.00" />
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
