const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.post("/:id/expenses", async (req, res) => {
  const groupId = req.params.id;
  const { paid_by, amount, description } = req.body;

  if (!paid_by || !amount) {
    return res.status(400).json({ error: "paid_by and amount are required" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const members = await client.query(
      "SELECT user_id FROM group_members WHERE group_id = $1",
      [groupId],
    );
    if (members.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Group has no members" });
    }

    const splitAmount = amount / members.rows.length;

    const expResult = await client.query(
      "INSERT INTO expenses (group_id, paid_by, amount, description) VALUES ($1, $2, $3, $4) RETURNING id",
      [groupId, paid_by, amount, description || ""],
    );
    const expenseId = expResult.rows[0].id;

    for (const member of members.rows) {
      await client.query(
        "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)",
        [expenseId, member.user_id, splitAmount],
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      id: expenseId,
      group_id: Number(groupId),
      paid_by,
      amount,
      description: description || "",
      split_amount: splitAmount,
      split_among: members.rows.length,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.get("/:id/expenses", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON e.paid_by = u.id
       WHERE e.group_id = $1
       ORDER BY e.created_at DESC`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/balances", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id AS user_id,
        u.name,
        COALESCE(paid.total_paid, 0) AS total_paid,
        COALESCE(owed.total_owed, 0) AS total_owed,
        COALESCE(paid.total_paid, 0) - COALESCE(owed.total_owed, 0) AS balance
      FROM group_members gm
      JOIN users u ON gm.user_id = u.id
      LEFT JOIN (
        SELECT paid_by AS user_id, SUM(amount) AS total_paid
        FROM expenses
        WHERE group_id = $1
        GROUP BY paid_by
      ) paid ON u.id = paid.user_id
      LEFT JOIN (
        SELECT es.user_id, SUM(es.amount) AS total_owed
        FROM expense_splits es
        JOIN expenses e ON es.expense_id = e.id
        WHERE e.group_id = $2
        GROUP BY es.user_id
      ) owed ON u.id = owed.user_id
      WHERE gm.group_id = $3`,
      [req.params.id, req.params.id, req.params.id],
    );

    const balances = result.rows.map((r) => ({
      ...r,
      total_paid: parseFloat(r.total_paid),
      total_owed: parseFloat(r.total_owed),
      balance: parseFloat(r.balance),
    }));

    const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b }));
    const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b }));
    const settlements = [];

    for (const debtor of debtors) {
      let remaining = Math.abs(debtor.balance);
      for (const creditor of creditors) {
        if (remaining <= 0 || creditor.balance <= 0) break;
        const payment = Math.min(remaining, creditor.balance);
        settlements.push({
          from: debtor.name,
          from_id: debtor.user_id,
          to: creditor.name,
          to_id: creditor.user_id,
          amount: Math.round(payment * 100) / 100,
        });
        remaining -= payment;
        creditor.balance -= payment;
      }
    }

    res.json({ balances, settlements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
