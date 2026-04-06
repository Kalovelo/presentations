const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.post("/", async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email, balance",
      [name, email],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Top up wallet — simple, always works
router.post("/:id/topup", async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "amount must be positive" });
  }
  try {
    const result = await pool.query(
      "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING id, name, balance",
      [amount, req.params.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Pay from wallet — INTENTIONALLY non-atomic (race condition demo)
// Reads balance, does async work, then writes — lost update under concurrency
router.post("/:id/pay", async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "amount must be positive" });
  }
  try {
    // Step 1: Read current balance
    const user = await pool.query(
      "SELECT id, name, balance FROM users WHERE id = $1",
      [req.params.id],
    );
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentBalance = parseFloat(user.rows[0].balance);
    if (currentBalance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Step 2: Simulate async work (e.g. payment gateway call)
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Step 3: Write new balance based on stale read — RACE CONDITION
    const newBalance = currentBalance - amount;
    const result = await pool.query(
      "UPDATE users SET balance = $1 WHERE id = $2 RETURNING id, name, balance",
      [newBalance, req.params.id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
