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
    if (err) return res.status(500).json({ error: err.message });
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
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/users", auth, (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !password) return res.status(400).json({ error: "الاسم وكلمة السر مطلوبان" });
  const hashed = bcrypt.hashSync(password, 10);
  db.query("INSERT INTO users (name, email, password) VALUES (?,?,?)",
    [name.trim(), email?.trim() || null, hashed], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: "تم إضافة المسؤول" });
    });
});

app.put("/api/users/:id", auth, (req, res) => {
  const { name, email, password } = req.body;
  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    db.query("UPDATE users SET name=?, email=?, password=? WHERE id=?",
      [name, email || null, hashed, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "تم تعديل المسؤول" });
      });
  } else {
    db.query("UPDATE users SET name=?, email=? WHERE id=?",
      [name, email || null, req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "تم تعديل المسؤول" });
      });
  }
});

app.delete("/api/users/:id", auth, (req, res) => {
  db.query("SELECT COUNT(*) AS cnt FROM users", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows[0].cnt <= 1) return res.status(400).json({ error: "لا يمكن حذف آخر مسؤول" });
    db.query("DELETE FROM users WHERE id=?", [req.params.id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ message: "تم حذف المسؤول" });
    });
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Notifications ───────────────────────────────────────────────────────────

app.post("/api/notifications/dismiss", (req, res) => {
  const { cow_id, type, event_date } = req.body;
  db.query(
    "INSERT IGNORE INTO dismissed_notifications (cow_id, type, event_date) VALUES (?,?,?)",
    [cow_id, type, event_date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "تم إخفاء الإشعار" });
    }
  );
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

app.get("/api/dashboard", (req, res) => {
  const queries = {
    capital:   "SELECT COALESCE(SUM(amount), 0) AS total FROM capital",
    revenues:  "SELECT COALESCE(SUM(amount), 0) AS total FROM revenues",
    expenses:  "SELECT COALESCE(SUM(amount), 0) AS total FROM expenses",
    salaries:  "SELECT COALESCE(SUM(amount), 0) AS total FROM salaries",
    cows:      "SELECT id, number, insemination_date, birth_date FROM cows WHERE is_sold = 0",
    dismissed: "SELECT cow_id, type, event_date FROM dismissed_notifications",
  };

  const results = {};
  let pending = Object.keys(queries).length;

  const done = (key, val) => {
    results[key] = val;
    if (--pending === 0) buildResponse();
  };

  const fail = (err) => res.status(500).json({ error: err.message });

  db.query(queries.capital, (err, r) => {
    if (err) return fail(err);
    done("capital", parseFloat(r[0].total));
  });
  db.query(queries.revenues, (err, r) => {
    if (err) return fail(err);
    done("revenues", parseFloat(r[0].total));
  });
  db.query(queries.expenses, (err, r) => {
    if (err) return fail(err);
    done("expenses", parseFloat(r[0].total));
  });
  db.query(queries.salaries, (err, r) => {
    if (err) return fail(err);
    done("salaries", parseFloat(r[0].total));
  });
  db.query(queries.cows, (err, rows) => {
    if (err) return fail(err);
    done("cows", rows);
  });
  db.query(queries.dismissed, (err, rows) => {
    if (err) return fail(err);
    done("dismissed", rows);
  });

  function buildResponse() {
    const totalExpenses = results.expenses + results.salaries;
    const profit = results.revenues - totalExpenses;

    const dismissedSet = new Set(
      results.dismissed.map((d) => `${d.cow_id}|${d.type}|${d.event_date}`)
    );

    const notifications = [];

    results.cows.forEach((cow) => {
      if (cow.insemination_date) {
        const dryDate = addMonths(cow.insemination_date, 7);
        const birthDate = addMonths(cow.insemination_date, 9);
        const dryDays = daysUntil(dryDate);
        const birthDays = daysUntil(birthDate);

        const dryDateStr = formatDate(dryDate);
        if (dryDays >= -7 && dryDays <= 30 && !dismissedSet.has(`${cow.id}|drying|${dryDateStr}`)) {
          notifications.push({
            cow_id: cow.id, type: "drying", cow_number: cow.number,
            date: dryDateStr, days: dryDays,
            message: `تنشيف البقرة رقم ${cow.number}`,
          });
        }
        const birthDateStr = formatDate(birthDate);
        if (birthDays >= -7 && birthDays <= 30 && !dismissedSet.has(`${cow.id}|birth|${birthDateStr}`)) {
          notifications.push({
            cow_id: cow.id, type: "birth", cow_number: cow.number,
            date: birthDateStr, days: birthDays,
            message: `موعد ولادة البقرة رقم ${cow.number}`,
          });
        }
      }

      if (cow.birth_date) {
        const reInsemDate = addDays(cow.birth_date, 40);
        const reInsemDays = daysUntil(reInsemDate);
        const reInsemDateStr = formatDate(reInsemDate);
        if (reInsemDays >= -7 && reInsemDays <= 30 && !dismissedSet.has(`${cow.id}|reinsemination|${reInsemDateStr}`)) {
          notifications.push({
            cow_id: cow.id, type: "reinsemination", cow_number: cow.number,
            date: reInsemDateStr, days: reInsemDays,
            message: `إعادة تلقيح البقرة رقم ${cow.number}`,
          });
        }
      }
    });

    notifications.sort((a, b) => a.days - b.days);

    res.json({
      capital: results.capital,
      revenues: results.revenues,
      expenses: totalExpenses,
      profit,
      notifications,
    });
  }
});

// ─── Cows ─────────────────────────────────────────────────────────────────────

app.get("/api/cows", (req, res) => {
  db.query("SELECT * FROM cows ORDER BY created_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/cows", (req, res) => {
  const { number, arrival_date, insemination_date, birth_date, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `INSERT INTO cows (number, arrival_date, insemination_date, birth_date, purchase_price, sale_price, is_sold, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [number, arrival_date || null, insemination_date || null, birth_date || null, purchase_price || 0, sale_price || null, is_sold ? 1 : 0, notes || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: result.insertId, message: "تم إضافة البقرة" });
  });
});

app.put("/api/cows/:id", (req, res) => {
  const { number, arrival_date, insemination_date, birth_date, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `UPDATE cows SET number=?, arrival_date=?, insemination_date=?, birth_date=?,
               purchase_price=?, sale_price=?, is_sold=?, notes=? WHERE id=?`;
  db.query(sql, [number, arrival_date || null, insemination_date || null, birth_date || null,
    purchase_price || 0, sale_price || null, is_sold ? 1 : 0, notes || null, req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم تعديل البقرة" });
  });
});

app.post("/api/cows/:id/die", (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: "يرجى إدخال تاريخ الوفاة" });

  db.query("SELECT number, purchase_price FROM cows WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "البقرة غير موجودة" });
    const { number, purchase_price } = rows[0];
    db.query(
      "INSERT INTO expenses (category, amount, date, notes) VALUES ('cow_death', ?, ?, ?)",
      [purchase_price || 0, date, `وفاة بقرة رقم ${number}`],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.query("DELETE FROM cows WHERE id=?", [req.params.id], (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: "تم تسجيل وفاة البقرة وإضافتها للخسائر" });
        });
      }
    );
  });
});

app.delete("/api/cows/:id", (req, res) => {
  db.query("DELETE FROM cows WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم حذف البقرة" });
  });
});

app.post("/api/cows/:id/sell", (req, res) => {
  const { sale_price, date } = req.body;
  if (!sale_price || !date) return res.status(400).json({ error: "يرجى إدخال السعر والتاريخ" });

  db.query(
    "INSERT INTO revenues (type, amount, date, notes) VALUES ('cow', ?, ?, 'بيع بقرة')",
    [sale_price, date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query("DELETE FROM cows WHERE id=?", [req.params.id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: "تم بيع البقرة وإضافة الإيراد" });
      });
    }
  );
});

// ─── Calves ───────────────────────────────────────────────────────────────────

app.get("/api/calves", (req, res) => {
  const sql = `SELECT ca.*, co.number AS mother_number
               FROM calves ca
               LEFT JOIN cows co ON ca.mother_cow_id = co.id
               ORDER BY ca.created_at DESC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/calves", (req, res) => {
  const { number, origin, arrival_date, birth_date, mother_cow_id, purchase_price, sale_price, is_sold, notes } = req.body;
  const sql = `INSERT INTO calves (number, origin, arrival_date, birth_date, mother_cow_id, purchase_price, sale_price, is_sold, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [number || null, origin, arrival_date || null, birth_date || null,
    mother_cow_id || null, purchase_price || 0, sale_price || null, is_sold ? 1 : 0, notes || null], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
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
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم تعديل العجل" });
  });
});

app.post("/api/calves/:id/sell", (req, res) => {
  const { sale_price, date } = req.body;
  if (!sale_price || !date) return res.status(400).json({ error: "يرجى إدخال السعر والتاريخ" });

  db.query(
    "INSERT INTO revenues (type, amount, date, notes) VALUES ('calf', ?, ?, 'بيع عجل')",
    [sale_price, date],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      db.query("DELETE FROM calves WHERE id=?", [req.params.id], (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ message: "تم بيع العجل وإضافة الإيراد" });
      });
    }
  );
});

app.post("/api/calves/:id/die", (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ error: "يرجى إدخال تاريخ الوفاة" });

  db.query("SELECT number, purchase_price FROM calves WHERE id=?", [req.params.id], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ error: "العجل غير موجود" });
    const { number, purchase_price } = rows[0];
    db.query(
      "INSERT INTO expenses (category, amount, date, notes) VALUES ('calf_death', ?, ?, ?)",
      [purchase_price || 0, date, `وفاة عجل رقم ${number || "غير محدد"}`],
      (err2) => {
        if (err2) return res.status(500).json({ error: err2.message });
        db.query("DELETE FROM calves WHERE id=?", [req.params.id], (err3) => {
          if (err3) return res.status(500).json({ error: err3.message });
          res.json({ message: "تم تسجيل وفاة العجل وإضافتها للخسائر" });
        });
      }
    );
  });
});

app.delete("/api/calves/:id", (req, res) => {
  db.query("DELETE FROM calves WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم حذف العجل" });
  });
});

// ─── Revenues ─────────────────────────────────────────────────────────────────

app.get("/api/revenues", (req, res) => {
  db.query("SELECT * FROM revenues ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/revenues", (req, res) => {
  const { type, amount, date, notes } = req.body;
  db.query("INSERT INTO revenues (type, amount, date, notes) VALUES (?,?,?,?)",
    [type, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: "تم إضافة الإيراد" });
    });
});

app.put("/api/revenues/:id", (req, res) => {
  const { type, amount, date, notes } = req.body;
  db.query("UPDATE revenues SET type=?, amount=?, date=?, notes=? WHERE id=?",
    [type, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "تم تعديل الإيراد" });
    });
});

app.delete("/api/revenues/:id", (req, res) => {
  db.query("DELETE FROM revenues WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم حذف الإيراد" });
  });
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

app.get("/api/expenses", (req, res) => {
  db.query("SELECT * FROM expenses ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/expenses", (req, res) => {
  const { category, amount, date, notes } = req.body;
  db.query("INSERT INTO expenses (category, amount, date, notes) VALUES (?,?,?,?)",
    [category, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: "تم إضافة المصروف" });
    });
});

app.put("/api/expenses/:id", (req, res) => {
  const { category, amount, date, notes } = req.body;
  db.query("UPDATE expenses SET category=?, amount=?, date=?, notes=? WHERE id=?",
    [category, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "تم تعديل المصروف" });
    });
});

app.delete("/api/expenses/:id", (req, res) => {
  db.query("DELETE FROM expenses WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم حذف المصروف" });
  });
});

// ─── Salaries ─────────────────────────────────────────────────────────────────

app.get("/api/salaries", (req, res) => {
  db.query("SELECT * FROM salaries ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/salaries", (req, res) => {
  const { employee_name, amount, date, notes } = req.body;
  db.query("INSERT INTO salaries (employee_name, amount, date, notes) VALUES (?,?,?,?)",
    [employee_name, amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: "تم إضافة الراتب" });
    });
});

app.put("/api/salaries/:id", (req, res) => {
  const { employee_name, amount, date, notes } = req.body;
  db.query("UPDATE salaries SET employee_name=?, amount=?, date=?, notes=? WHERE id=?",
    [employee_name, amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "تم تعديل الراتب" });
    });
});

app.delete("/api/salaries/:id", (req, res) => {
  db.query("DELETE FROM salaries WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم حذف الراتب" });
  });
});

// ─── Capital ──────────────────────────────────────────────────────────────────

app.get("/api/capital", (req, res) => {
  db.query("SELECT * FROM capital ORDER BY date DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/capital", (req, res) => {
  const { amount, date, notes } = req.body;
  db.query("INSERT INTO capital (amount, date, notes) VALUES (?,?,?)",
    [amount, date, notes || null], (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: result.insertId, message: "تم إضافة رأس المال" });
    });
});

app.put("/api/capital/:id", (req, res) => {
  const { amount, date, notes } = req.body;
  db.query("UPDATE capital SET amount=?, date=?, notes=? WHERE id=?",
    [amount, date, notes || null, req.params.id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "تم تعديل رأس المال" });
    });
});

app.delete("/api/capital/:id", (req, res) => {
  db.query("DELETE FROM capital WHERE id=?", [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "تم حذف القيد" });
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
