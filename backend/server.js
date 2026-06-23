const express  = require("express");
const cors     = require("cors");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const db       = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "farm_secret_2026";

// ─── Auth middleware ──────────────────────────────────────────────────────────

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "يجب تسجيل الدخول" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "جلسة منتهية، سجّل الدخول مجدداً" });
  }
}

// ─── Auth routes (public) ─────────────────────────────────────────────────────

app.post("/api/auth/login", (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "أدخل الاسم وكلمة السر" });
  db.query("SELECT * FROM users WHERE name=TRIM(?)", [name.trim()], (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    if (rows.length === 0) return res.status(401).json({ error: "اسم المستخدم غير موجود" });
    const user = rows[0];
    if (!bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: "كلمة السر غير صحيحة" });
    const token = jwt.sign({ id: user.id, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, name: user.name, email: user.email });
  });
});

// ─── Users management ─────────────────────────────────────────────────────────

app.get("/api/users", auth, (req, res) => {
  db.query("SELECT id, name, email, created_at FROM users ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/users", auth, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "الاسم وكلمة السر مطلوبان" });
  const hashed = bcrypt.hashSync(password, 10);
  db.query("INSERT INTO users (name, email, password) VALUES (?,?,?)",
    [name.trim(), email?.trim() || null, hashed], (err, result) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ id: result.insertId, message: "تم إضافة المسؤول" });
    });
});

app.put("/api/users/:id", auth, (req, res) => {
  const { name, email, password } = req.body;
  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    db.query("UPDATE users SET name=?, email=?, password=? WHERE id=?",
      [name, email || null, hashed, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: dbErr(err) });
        res.json({ message: "تم تعديل المسؤول" });
      });
  } else {
    db.query("UPDATE users SET name=?, email=? WHERE id=?",
      [name, email || null, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: dbErr(err) });
        res.json({ message: "تم تعديل المسؤول" });
      });
  }
});

app.delete("/api/users/:id", auth, (req, res) => {
  db.query("SELECT COUNT(*) AS cnt FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    if (rows[0].cnt <= 1) return res.status(400).json({ error: "لا يمكن حذف آخر مسؤول" });
    db.query("DELETE FROM users WHERE id=?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: dbErr(err2) });
      res.json({ message: "تم حذف المسؤول" });
    });
  });
});

// ─── MySQL error → Arabic message ────────────────────────────────────────────

function dbErr(err) {
  if (err.code === "ER_DUP_ENTRY")          return "هذا الرقم مستخدم مسبقاً، اختر رقماً مختلفاً";
  if (err.code === "ER_NO_REFERENCED_ROW_2") return "خطأ في ربط البيانات";
  if (err.code === "ER_ROW_IS_REFERENCED_2") return "لا يمكن الحذف، البيانات مرتبطة بسجلات أخرى";
  if (err.code === "ER_BAD_NULL_ERROR")      return "يرجى ملء جميع الحقول المطلوبة";
  if (err.code === "ER_DATA_TOO_LONG")       return "البيانات المدخلة طويلة جداً";
  return "حدث خطأ في قاعدة البيانات، حاول مجدداً";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EXPENSE_LABELS = {
  electricity: "كهرباء",
  fuel:        "بنزين",
  water:       "ماء",
  cow_feed:    "علف بقر",
  farm_rent:   "أجرة مزرعة",
  calf_feed:   "علف عجول",
  calf_straw:  "قش عجول",
  treatments:  "علاجات",
  other:       "مصاريف أخرى",
};

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysUntil(target) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const t = new Date(target);
  t.setHours(0, 0, 0, 0);
  return Math.round((t - now) / (1000 * 60 * 60 * 24));
}

// ─── Protect all routes below ────────────────────────────────────────────────
app.use("/api", auth);

// ─── Transaction logger helper ───────────────────────────────────────────────
function logTx(type, animal_id, animal_type, amount, date, description, user_name) {
  db.query(
    "INSERT INTO transactions_log (type, animal_id, animal_type, amount, date, description, user_name) VALUES (?,?,?,?,?,?,?)",
    [type, animal_id || null, animal_type || null, amount || null, date, description || null, user_name || null],
    () => {}
  );
}

// ─── Notifications ───────────────────────────────────────────────────────────

function buildNotifications(dismissedRows, cowRows) {
  const dismissedSet = new Set(dismissedRows.map((d) => `${d.cow_id}|${d.type}|${d.event_date}`));
  const notifications = [];
  cowRows.forEach((cow) => {
    const label = cow.notes ? `${cow.number} (${cow.notes})` : `${cow.number}`;
    if (cow.insemination_date) {
      const dryDate      = addMonths(cow.insemination_date, 7);
      const birthDate    = addMonths(cow.insemination_date, 9);
      const dryDays      = daysUntil(dryDate);
      const birthDays    = daysUntil(birthDate);
      const dryDateStr   = formatDate(dryDate);
      const birthDateStr = formatDate(birthDate);
      if (dryDays >= -7 && dryDays <= 30 && !dismissedSet.has(`${cow.id}|drying|${dryDateStr}`))
        notifications.push({ cow_id: cow.id, type: "drying",  cow_number: cow.number, date: dryDateStr,   days: dryDays,   message: `تنشيف البقرة رقم ${label}` });
      if (birthDays >= -7 && birthDays <= 30 && !dismissedSet.has(`${cow.id}|birth|${birthDateStr}`))
        notifications.push({ cow_id: cow.id, type: "birth",   cow_number: cow.number, date: birthDateStr, days: birthDays, message: `موعد ولادة البقرة رقم ${label}` });
    }
    if (cow.birth_date) {
      const reInsemDate    = addDays(cow.birth_date, 40);
      const reInsemDays    = daysUntil(reInsemDate);
      const reInsemDateStr = formatDate(reInsemDate);
      if (reInsemDays >= -7 && reInsemDays <= 30 && !dismissedSet.has(`${cow.id}|reinsemination|${reInsemDateStr}`))
        notifications.push({ cow_id: cow.id, type: "reinsemination", cow_number: cow.number, date: reInsemDateStr, days: reInsemDays, message: `إعادة تلقيح البقرة رقم ${label}` });
    }
  });
  notifications.sort((a, b) => a.days - b.days);
  return notifications;
}

function fetchNotifications(res, callback) {
  let dismissed, cows, pending = 2;
  const fail = (err) => res.status(500).json({ error: dbErr(err) });
  const done = (key, val) => {
    if (key === "dismissed") dismissed = val;
    if (key === "cows") cows = val;
    if (--pending === 0) callback(buildNotifications(dismissed, cows));
  };
  db.query("SELECT cow_id, type, event_date FROM dismissed_notifications", (err, rows) => {
    if (err) return fail(err);
    done("dismissed", rows);
  });
  db.query("SELECT id, number, notes, insemination_date, birth_date FROM cows WHERE is_sold=0 AND is_dead=0", (err, rows) => {
    if (err) return fail(err);
    done("cows", rows);
  });
}

app.get("/api/notifications", (req, res) => {
  fetchNotifications(res, (notifications) => res.json(notifications));
});

app.post("/api/notifications/dismiss", (req, res) => {
  const { cow_id, type, event_date } = req.body;
  db.query(
    "INSERT IGNORE INTO dismissed_notifications (cow_id, type, event_date) VALUES (?,?,?)",
    [cow_id, type, event_date],
    (err) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ message: "تم إخفاء الإشعار" });
    }
  );
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

app.get("/api/dashboard", (req, res) => {
  const results = {};
  let pending = 8;
  const done = (key, val) => { results[key] = val; if (--pending === 0) buildResponse(); };
  const fail = (err) => res.status(500).json({ error: dbErr(err) });

  db.query("SELECT COALESCE(SUM(amount),0) AS total FROM revenues", (err, r) => {
    if (err) return fail(err);
    done("revenues", parseFloat(r[0].total));
  });
  db.query("SELECT COALESCE(SUM(amount),0) AS total FROM expenses", (err, r) => {
    if (err) return fail(err);
    done("expenses", parseFloat(r[0].total));
  });
  db.query("SELECT COALESCE(SUM(amount),0) AS total FROM salaries", (err, r) => {
    if (err) return fail(err);
    done("salaries", parseFloat(r[0].total));
  });
  db.query("SELECT COALESCE(SUM(amount),0) AS total FROM losses", (err, r) => {
    if (err) return fail(err);
    done("losses", parseFloat(r[0].total));
  });
  db.query("SELECT COALESCE(SUM(purchase_price),0) AS total FROM cows WHERE is_sold=0 AND is_dead=0", (err, r) => {
    if (err) return fail(err);
    done("cow_assets", parseFloat(r[0].total));
  });
  db.query("SELECT COALESCE(SUM(purchase_price),0) AS total FROM calves WHERE is_sold=0 AND is_dead=0", (err, r) => {
    if (err) return fail(err);
    done("calf_assets", parseFloat(r[0].total));
  });
  db.query("SELECT id, number, notes, insemination_date, birth_date FROM cows WHERE is_sold=0 AND is_dead=0", (err, rows) => {
    if (err) return fail(err);
    done("cows", rows);
  });
  db.query("SELECT cow_id, type, event_date FROM dismissed_notifications", (err, rows) => {
    if (err) return fail(err);
    done("dismissed", rows);
  });

  function buildResponse() {
    const totalExpenses   = results.expenses + results.salaries;
    const assets          = results.cow_assets + results.calf_assets;
    const profit          = results.revenues - totalExpenses - results.losses;
    const notifications   = buildNotifications(results.dismissed, results.cows);
    res.json({ assets, revenues: results.revenues, expenses: totalExpenses, losses: results.losses, profit, notifications });
  }
});

// ─── Cows ─────────────────────────────────────────────────────────────────────

app.get("/api/cows", (req, res) => {
  db.query("SELECT * FROM cows ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/cows", (req, res) => {
  const { number, arrival_date, insemination_date, birth_date, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `INSERT INTO cows (number, arrival_date, insemination_date, birth_date, purchase_price, sale_price, is_sold, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [number, arrival_date || null, insemination_date || null, birth_date || null, purchase_price || 0, sale_price || null, is_sold ? 1 : 0, notes || null], (err, result) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    logTx("cow_purchase", result.insertId, "cow", purchase_price || 0, arrival_date || new Date().toISOString().split("T")[0], `شراء بقرة رقم ${number}`, req.user?.name);
    res.json({ id: result.insertId, message: "تم إضافة البقرة" });
  });
});

app.put("/api/cows/:id", (req, res) => {
  const { number, arrival_date, insemination_date, birth_date, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `UPDATE cows SET number=?, arrival_date=?, insemination_date=?, birth_date=?,
               purchase_price=?, sale_price=?, is_sold=?, notes=? WHERE id=?`;
  db.query(sql, [number, arrival_date || null, insemination_date || null, birth_date || null,
    purchase_price || 0, sale_price || null, is_sold ? 1 : 0, notes || null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تعديل البقرة" });
  });
});

app.post("/api/cows/:id/die", (req, res) => {
  const { date, amount } = req.body;
  if (!date) return res.status(400).json({ error: "يرجى إدخال تاريخ الوفاة" });

  db.query("SELECT number, purchase_price FROM cows WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "البقرة غير موجودة" });
    const { number, purchase_price } = rows[0];
    const lossAmount = amount !== undefined ? amount : (purchase_price || 0);
    db.query("UPDATE cows SET is_dead=1, death_date=? WHERE id=?", [date, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.query(
        "INSERT INTO losses (type, animal_id, animal_type, amount, date, notes) VALUES ('cow_death', ?, 'cow', ?, ?, ?)",
        [req.params.id, lossAmount, date, `وفاة بقرة رقم ${number}`],
        (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          logTx("cow_death", req.params.id, "cow", lossAmount, date, `وفاة بقرة رقم ${number}`, req.user?.name);
          res.json({ message: "تم تسجيل وفاة البقرة" });
        }
      );
    });
  });
});

app.delete("/api/cows/:id", (req, res) => {
  db.query("DELETE FROM cows WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف البقرة" });
  });
});

app.post("/api/cows/:id/sell", (req, res) => {
  const { sale_price, date } = req.body;
  if (!sale_price || !date) return res.status(400).json({ error: "يرجى إدخال السعر والتاريخ" });

  db.query("SELECT number FROM cows WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "البقرة غير موجودة" });
    const { number } = rows[0];
    db.query("UPDATE cows SET is_sold=1, sale_price=?, sale_date=? WHERE id=?", [sale_price, date, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.query(
        "INSERT INTO revenues (type, amount, date, notes) VALUES ('cow', ?, ?, ?)",
        [sale_price, date, `بيع بقرة رقم ${number}`],
        (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          logTx("cow_sale", req.params.id, "cow", sale_price, date, `بيع بقرة رقم ${number}`, req.user?.name);
          res.json({ message: "تم بيع البقرة وتسجيل الإيراد" });
        }
      );
    });
  });
});

// ─── Calves ───────────────────────────────────────────────────────────────────

app.get("/api/calves", (req, res) => {
  const sql = `SELECT ca.*, co.number AS mother_number
               FROM calves ca
               LEFT JOIN cows co ON ca.mother_cow_id = co.id
               ORDER BY ca.created_at DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/calves", (req, res) => {
  const { number, origin, arrival_date, birth_date, mother_cow_id, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `INSERT INTO calves (number, origin, arrival_date, birth_date, mother_cow_id, purchase_price, sale_price, is_sold, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [number || null, origin, arrival_date || null, birth_date || null,
    mother_cow_id || null, purchase_price || 0, sale_price || null, is_sold ? 1 : 0, notes || null], (err, result) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    const txType = origin === "born" ? "calf_born" : "calf_purchase";
    const txDate = birth_date || arrival_date || new Date().toISOString().split("T")[0];
    const txDesc = origin === "born" ? `ولادة عجل${number ? ` رقم ${number}` : ""}` : `شراء عجل${number ? ` رقم ${number}` : ""}`;
    logTx(txType, result.insertId, "calf", purchase_price || 0, txDate, txDesc, req.user?.name);
    res.json({ id: result.insertId, message: "تم إضافة العجل" });
  });
});

app.put("/api/calves/:id", (req, res) => {
  const { number, origin, arrival_date, birth_date, mother_cow_id, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `UPDATE calves SET number=?, origin=?, arrival_date=?, birth_date=?, mother_cow_id=?,
               purchase_price=?, sale_price=?, is_sold=?, notes=? WHERE id=?`;
  db.query(sql, [number || null, origin, arrival_date || null, birth_date || null,
    mother_cow_id || null, purchase_price || 0, sale_price || null, is_sold ? 1 : 0,
    notes || null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تعديل العجل" });
  });
});

app.post("/api/calves/:id/sell", (req, res) => {
  const { sale_price, date } = req.body;
  if (!sale_price || !date) return res.status(400).json({ error: "يرجى إدخال السعر والتاريخ" });

  db.query("SELECT number FROM calves WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "العجل غير موجود" });
    const { number } = rows[0];
    db.query("UPDATE calves SET is_sold=1, sale_price=?, sale_date=? WHERE id=?", [sale_price, date, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.query(
        "INSERT INTO revenues (type, amount, date, notes) VALUES ('calf', ?, ?, ?)",
        [sale_price, date, `بيع عجل رقم ${number || "غير محدد"}`],
        (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          logTx("calf_sale", req.params.id, "calf", sale_price, date, `بيع عجل رقم ${number || "غير محدد"}`, req.user?.name);
          res.json({ message: "تم بيع العجل وتسجيل الإيراد" });
        }
      );
    });
  });
});

app.post("/api/calves/:id/die", (req, res) => {
  const { date, amount } = req.body;
  if (!date) return res.status(400).json({ error: "يرجى إدخال تاريخ الوفاة" });

  db.query("SELECT number, purchase_price FROM calves WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "العجل غير موجود" });
    const { number, purchase_price } = rows[0];
    const lossAmount = amount !== undefined ? amount : (purchase_price || 0);
    db.query("UPDATE calves SET is_dead=1, death_date=? WHERE id=?", [date, req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      db.query(
        "INSERT INTO losses (type, animal_id, animal_type, amount, date, notes) VALUES ('calf_death', ?, 'calf', ?, ?, ?)",
        [req.params.id, lossAmount, date, `وفاة عجل رقم ${number || "غير محدد"}`],
        (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          logTx("calf_death", req.params.id, "calf", lossAmount, date, `وفاة عجل رقم ${number || "غير محدد"}`, req.user?.name);
          res.json({ message: "تم تسجيل وفاة العجل" });
        }
      );
    });
  });
});

app.delete("/api/calves/:id", (req, res) => {
  db.query("DELETE FROM calves WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف العجل" });
  });
});

// ─── Revenues ─────────────────────────────────────────────────────────────────

app.get("/api/revenues", (req, res) => {
  db.query("SELECT * FROM revenues ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/revenues", (req, res) => {
  const { type, amount, date, notes } = req.body;
  db.query("INSERT INTO revenues (type, amount, date, notes) VALUES (?,?,?,?)",
    [type, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      logTx(type === "milk" ? "milk_sale" : type, null, null, amount, date, notes || (type === "milk" ? "بيع حليب" : null), req.user?.name);
      res.json({ id: result.insertId, message: "تم إضافة الإيراد" });
    });
});

app.put("/api/revenues/:id", (req, res) => {
  const { type, amount, date, notes } = req.body;
  db.query("UPDATE revenues SET type=?, amount=?, date=?, notes=? WHERE id=?",
    [type, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ message: "تم تعديل الإيراد" });
    });
});

app.delete("/api/revenues/:id", (req, res) => {
  db.query("DELETE FROM revenues WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف الإيراد" });
  });
});

app.patch("/api/revenues/:id/hide", (req, res) => {
  db.query("UPDATE revenues SET is_hidden = NOT is_hidden WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تحديث حالة الإيراد" });
  });
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

app.get("/api/expenses", (req, res) => {
  db.query("SELECT * FROM expenses ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/expenses", (req, res) => {
  const { category, amount, date, notes } = req.body;
  db.query("INSERT INTO expenses (category, amount, date, notes) VALUES (?,?,?,?)",
    [category, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      logTx("expense", null, null, amount, date, notes || EXPENSE_LABELS[category] || category, req.user?.name);
      res.json({ id: result.insertId, message: "تم إضافة المصروف" });
    });
});

app.put("/api/expenses/:id", (req, res) => {
  const { category, amount, date, notes } = req.body;
  db.query("UPDATE expenses SET category=?, amount=?, date=?, notes=? WHERE id=?",
    [category, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ message: "تم تعديل المصروف" });
    });
});

app.delete("/api/expenses/:id", (req, res) => {
  db.query("DELETE FROM expenses WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف المصروف" });
  });
});

app.patch("/api/expenses/:id/hide", (req, res) => {
  db.query("UPDATE expenses SET is_hidden = NOT is_hidden WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تحديث حالة المصروف" });
  });
});

// ─── Salaries ─────────────────────────────────────────────────────────────────

app.get("/api/salaries", (req, res) => {
  db.query("SELECT * FROM salaries ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/salaries", (req, res) => {
  const { employee_name, amount, date, notes } = req.body;
  db.query("INSERT INTO salaries (employee_name, amount, date, notes) VALUES (?,?,?,?)",
    [employee_name, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      logTx("salary", null, null, amount, date, `راتب ${employee_name}`, req.user?.name);
      res.json({ id: result.insertId, message: "تم إضافة الراتب" });
    });
});

app.put("/api/salaries/:id", (req, res) => {
  const { employee_name, amount, date, notes } = req.body;
  db.query("UPDATE salaries SET employee_name=?, amount=?, date=?, notes=? WHERE id=?",
    [employee_name, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ message: "تم تعديل الراتب" });
    });
});

app.delete("/api/salaries/:id", (req, res) => {
  db.query("DELETE FROM salaries WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف الراتب" });
  });
});

app.patch("/api/salaries/:id/hide", (req, res) => {
  db.query("UPDATE salaries SET is_hidden = NOT is_hidden WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تحديث حالة الراتب" });
  });
});

// ─── Losses ───────────────────────────────────────────────────────────────────

app.get("/api/losses", (req, res) => {
  const sql = `
    SELECT 'loss' AS source, id, type, amount, date, notes FROM losses
    UNION ALL
    SELECT 'expense' AS source, id, category AS type, amount, date, notes
    FROM expenses WHERE category IN ('cow_death','calf_death')
    ORDER BY date DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/losses", (req, res) => {
  const { type, amount, date, notes } = req.body;
  db.query("INSERT INTO losses (type, amount, date, notes) VALUES (?,?,?,?)",
    [type, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ id: result.insertId, message: "تم إضافة الخسارة" });
    });
});

app.put("/api/losses/:id", (req, res) => {
  const { type, amount, date, notes } = req.body;
  db.query("UPDATE losses SET type=?, amount=?, date=?, notes=? WHERE id=?",
    [type, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ message: "تم تعديل الخسارة" });
    });
});

app.delete("/api/losses/:id", (req, res) => {
  db.query("DELETE FROM losses WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف الخسارة" });
  });
});

app.patch("/api/losses/:id/hide", (req, res) => {
  db.query("UPDATE losses SET is_hidden = NOT is_hidden WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تحديث حالة الخسارة" });
  });
});

// ─── Assets ───────────────────────────────────────────────────────────────────

app.get("/api/assets", (req, res) => {
  const results = {};
  let pending = 2;
  const done = (key, val) => { results[key] = val; if (--pending === 0) res.json(results); };
  const fail = (err) => res.status(500).json({ error: dbErr(err) });

  db.query("SELECT id, number, purchase_price, arrival_date, insemination_date, birth_date, notes, is_hidden_asset FROM cows WHERE is_sold=0 AND is_dead=0 ORDER BY created_at DESC", (err, rows) => {
    if (err) return fail(err);
    done("cows", rows);
  });
  db.query("SELECT id, number, origin, purchase_price, arrival_date, birth_date, notes, is_hidden_asset FROM calves WHERE is_sold=0 AND is_dead=0 ORDER BY created_at DESC", (err, rows) => {
    if (err) return fail(err);
    done("calves", rows);
  });
});

app.patch("/api/assets/cow/:id/hide", (req, res) => {
  db.query("UPDATE cows SET is_hidden_asset = NOT is_hidden_asset WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تحديث حالة البقرة" });
  });
});

app.patch("/api/assets/calf/:id/hide", (req, res) => {
  db.query("UPDATE calves SET is_hidden_asset = NOT is_hidden_asset WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم تحديث حالة العجل" });
  });
});

// ─── Transactions Log ─────────────────────────────────────────────────────────

app.get("/api/transactions", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  db.query("SELECT * FROM transactions_log ORDER BY created_at DESC LIMIT ?", [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

// ─── Capital ──────────────────────────────────────────────────────────────────

app.get("/api/capital", (req, res) => {
  db.query("SELECT * FROM capital ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json(rows);
  });
});

app.post("/api/capital", (req, res) => {
  const { amount, date, notes } = req.body;
  db.query("INSERT INTO capital (amount, date, notes) VALUES (?,?,?)",
    [amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ id: result.insertId, message: "تم إضافة رأس المال" });
    });
});

app.put("/api/capital/:id", (req, res) => {
  const { amount, date, notes } = req.body;
  db.query("UPDATE capital SET amount=?, date=?, notes=? WHERE id=?",
    [amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: dbErr(err) });
      res.json({ message: "تم تعديل رأس المال" });
    });
});

app.delete("/api/capital/:id", (req, res) => {
  db.query("DELETE FROM capital WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: dbErr(err) });
    res.json({ message: "تم حذف القيد" });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
