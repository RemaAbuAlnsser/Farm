const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "3231rema",
  database: "farm",
  multipleStatements: true,
});

function run(sql, label) {
  return new Promise((resolve) => {
    db.query(sql, (err) => {
      if (err && err.code !== "ER_DUP_FIELDNAME" && err.code !== "ER_TABLE_EXISTS_ERROR") {
        console.error(`✗ ${label}:`, err.message);
      } else {
        console.log(`✓ ${label}`);
      }
      resolve();
    });
  });
}

async function migrate() {
  await run("ALTER TABLE cows ADD COLUMN sale_date DATE DEFAULT NULL", "cows.sale_date");
  await run("ALTER TABLE cows ADD COLUMN is_dead TINYINT(1) DEFAULT 0", "cows.is_dead");
  await run("ALTER TABLE cows ADD COLUMN death_date DATE DEFAULT NULL", "cows.death_date");

  await run("ALTER TABLE calves ADD COLUMN sale_date DATE DEFAULT NULL", "calves.sale_date");
  await run("ALTER TABLE calves ADD COLUMN is_dead TINYINT(1) DEFAULT 0", "calves.is_dead");
  await run("ALTER TABLE calves ADD COLUMN death_date DATE DEFAULT NULL", "calves.death_date");

  await run(`CREATE TABLE IF NOT EXISTS losses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('cow_death','calf_death','abortion','theft','other') NOT NULL DEFAULT 'other',
    animal_id INT DEFAULT NULL,
    animal_type ENUM('cow','calf') DEFAULT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, "losses table");

  await run("ALTER TABLE revenues  ADD COLUMN is_hidden TINYINT(1) DEFAULT 0", "revenues.is_hidden");
  await run("ALTER TABLE expenses  ADD COLUMN is_hidden TINYINT(1) DEFAULT 0", "expenses.is_hidden");
  await run("ALTER TABLE salaries  ADD COLUMN is_hidden TINYINT(1) DEFAULT 0", "salaries.is_hidden");
  await run("ALTER TABLE losses    ADD COLUMN is_hidden TINYINT(1) DEFAULT 0", "losses.is_hidden");
  await run("ALTER TABLE cows      ADD COLUMN is_hidden_asset TINYINT(1) DEFAULT 0", "cows.is_hidden_asset");
  await run("ALTER TABLE calves    ADD COLUMN is_hidden_asset TINYINT(1) DEFAULT 0", "calves.is_hidden_asset");

  await run(`CREATE TABLE IF NOT EXISTS transactions_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(30) NOT NULL,
    animal_id INT DEFAULT NULL,
    animal_type ENUM('cow','calf') DEFAULT NULL,
    amount DECIMAL(10,2) DEFAULT NULL,
    date DATE NOT NULL,
    description TEXT,
    user_name VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, "transactions_log table");

  await run("ALTER TABLE transactions_log ADD COLUMN user_name VARCHAR(100) DEFAULT NULL", "transactions_log.user_name");

  db.end();
  console.log("\nMigration complete!");
}

migrate();
