const express = require("express");
const router = express.Router();
const { pool } = require("../db");

router.post("/", async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }
  try {
    const result = await pool.query(
      "INSERT INTO groups (name) VALUES ($1) RETURNING id, name",
      [name],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM groups");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/members", async (req, res) => {
  const groupId = req.params.id;
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: "user_id is required" });
  }
  try {
    const group = await pool.query("SELECT * FROM groups WHERE id = $1", [groupId]);
    if (group.rows.length === 0) {
      return res.status(404).json({ error: "Group not found" });
    }
    const user = await pool.query("SELECT * FROM users WHERE id = $1", [user_id]);
    if (user.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    await pool.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)",
      [groupId, user_id],
    );
    res.status(201).json({ group_id: Number(groupId), user_id });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "User is already a member of this group" });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id/members", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.* FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [req.params.id],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
