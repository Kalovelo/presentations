const express = require("express");
const cors = require("cors");
const { pool, initSchema } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use("/api/users", require("./routes/users"));
app.use("/api/groups", require("./routes/groups"));
app.use("/api/groups", require("./routes/expenses"));

app.post("/api/seed", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM expense_splits");
    await client.query("DELETE FROM expenses");
    await client.query("DELETE FROM group_members");
    await client.query("DELETE FROM groups");
    await client.query("DELETE FROM users");

    const users = [
      { name: "Alice", email: "alice@example.com" },
      { name: "Bob", email: "bob@example.com" },
      { name: "Charlie", email: "charlie@example.com" },
      { name: "Diana", email: "diana@example.com" },
      { name: "Eve", email: "eve@example.com" },
    ];
    const userIds = [];
    for (const u of users) {
      const r = await client.query(
        "INSERT INTO users (name, email, balance) VALUES ($1, $2, 1000) RETURNING id",
        [u.name, u.email],
      );
      userIds.push(r.rows[0].id);
    }

    const g1 = await client.query(
      "INSERT INTO groups (name) VALUES ($1) RETURNING id",
      ["Trip to Paris"],
    );
    const g2 = await client.query(
      "INSERT INTO groups (name) VALUES ($1) RETURNING id",
      ["Shared Apartment"],
    );
    const group1Id = g1.rows[0].id;
    const group2Id = g2.rows[0].id;

    // Group 1: first 3 users
    for (let i = 0; i < 3; i++) {
      await client.query(
        "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
        [group1Id, userIds[i]],
      );
    }
    // Group 2: all users
    for (const uid of userIds) {
      await client.query(
        "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
        [group2Id, uid],
      );
    }

    const expenses = [
      { groupId: group1Id, paidBy: userIds[0], amount: 150, desc: "Hotel", members: userIds.slice(0, 3) },
      { groupId: group1Id, paidBy: userIds[1], amount: 90, desc: "Dinner", members: userIds.slice(0, 3) },
      { groupId: group1Id, paidBy: userIds[2], amount: 60, desc: "Museum tickets", members: userIds.slice(0, 3) },
      { groupId: group2Id, paidBy: userIds[0], amount: 1200, desc: "Rent", members: userIds },
      { groupId: group2Id, paidBy: userIds[3], amount: 200, desc: "Groceries", members: userIds },
      { groupId: group2Id, paidBy: userIds[4], amount: 80, desc: "Utilities", members: userIds },
    ];

    for (const exp of expenses) {
      const r = await client.query(
        "INSERT INTO expenses (group_id, paid_by, amount, description) VALUES ($1, $2, $3, $4) RETURNING id",
        [exp.groupId, exp.paidBy, exp.amount, exp.desc],
      );
      const splitAmount = exp.amount / exp.members.length;
      for (const memberId of exp.members) {
        await client.query(
          "INSERT INTO expense_splits (expense_id, user_id, amount) VALUES ($1, $2, $3)",
          [r.rows[0].id, memberId, splitAmount],
        );
      }
    }

    await client.query("COMMIT");
    res.json({ message: "Database seeded successfully", users: userIds.length, groups: 2, expenses: expenses.length });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

async function start() {
  await initSchema();
  app.listen(PORT, () => {
    console.log(`Splitdumb app listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
