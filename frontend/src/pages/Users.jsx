import { useEffect, useState } from "react";
import axios from "axios";
import Modal from "../components/Modal";
import { API, getUser } from "../auth";

const EMPTY = { name: "", email: "", password: "" };

export default function Users() {
  const [users, setUsers]   = useState([]);
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [error, setError]   = useState("");
  const me = getUser();

  const load = () => axios.get(`${API}/users`).then((r) => setUsers(r.data));
  useEffect(() => { load(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditId(null); setError(""); setModal(true); };
  const openEdit = (u) => {
    setForm({ name: u.name, email: u.email || "", password: "" });
    setEditId(u.id);
    setError("");
    setModal(true);
  };

  const handleDelete = (id) => {
    if (!confirm("هل تريد حذف هذا المسؤول؟")) return;
    axios.delete(`${API}/users/${id}`)
      .then(load)
      .catch((e) => alert(e.response?.data?.error || "حدث خطأ"));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const req = editId
      ? axios.put(`${API}/users/${editId}`, form)
      : axios.post(`${API}/users`, form);
    req
      .then(() => { setModal(false); load(); })
      .catch((e) => setError(e.response?.data?.error || "حدث خطأ"));
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <div className="page-header">
        <h1>إدارة المسؤولين</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ إضافة مسؤول</button>
      </div>

      <div className="table-container">
        {users.length === 0 ? (
          <div className="empty-state"><p>لا يوجد مسؤولين بعد</p></div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>اسم المستخدم</th>
                <th>الإيميل</th>
                <th>تاريخ الإضافة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td data-label="اسم المستخدم">
                    <strong>{u.name}</strong>
                    {u.name === me?.name && (
                      <span className="badge badge-active" style={{ marginRight: 8 }}>أنت</span>
                    )}
                  </td>
                  <td data-label="الإيميل">{u.email || "—"}</td>
                  <td data-label="تاريخ الإضافة">{u.created_at ? new Date(u.created_at).toLocaleDateString("en-GB") : "—"}</td>
                  <td data-label="الإجراءات" style={{ whiteSpace: "nowrap" }}>
                    <button className="action-btn btn-edit" onClick={() => openEdit(u)}>تعديل</button>
                    <button className="action-btn btn-delete" onClick={() => handleDelete(u.id)}>حذف</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <Modal title={editId ? "تعديل مسؤول" : "إضافة مسؤول جديد"} onClose={() => setModal(false)}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                background: "#fee2e2", color: "#dc2626", padding: "10px 14px",
                borderRadius: 8, fontSize: "0.88rem", marginBottom: 14
              }}>
                {error}
              </div>
            )}
            <div className="form-group">
              <label>اسم المستخدم *</label>
              <input required value={form.name} onChange={set("name")} placeholder="اسم للدخول" />
            </div>
            <div className="form-group">
              <label>الإيميل</label>
              <input type="email" value={form.email} onChange={set("email")} placeholder="example@email.com" />
            </div>
            <div className="form-group">
              <label>{editId ? "كلمة السر الجديدة (اتركها فاضية إذا ما بدك تغيرها)" : "كلمة السر *"}</label>
              <input
                type="password"
                required={!editId}
                value={form.password}
                onChange={set("password")}
                placeholder={editId ? "اتركها فاضية للإبقاء على نفس الكلمة" : "كلمة السر"}
              />
            </div>
            <div className="form-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary">{editId ? "حفظ التعديلات" : "إضافة"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
