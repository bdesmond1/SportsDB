const express = require("express");
const router = express.Router();
const db = require("../../connect");
const timeSlots = require("../../utils/timeSlots"); // make sure path is correct

/* VIEW ALL */
router.get("/", (req, res) => {
  db.query("SELECT * FROM SportsArea", (err, areas) => {
    if (err) throw err;
    res.render("sportsArea/list", { areas });
  });
});

/* ADD FORM */
router.get("/add", (req, res) => {
  res.render("sportsArea/add", { timeSlots });
});

/* ADD */
router.post("/add", (req, res) => {
  const { AreaName, Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime } = req.body;

  if (CloseTime <= OpenTime) return res.send("Close time must be after Open time");
  if (RecEndTime <= RecStartTime) return res.send("Rec End time must be after Rec Start time");

  const sql = `
    INSERT INTO SportsArea
    (AreaName, Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [AreaName, Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime], err => {
    if (err) throw err;
    res.redirect("/sportsArea");
  });
});

/* EDIT FORM */
router.get("/edit/:name", (req, res) => {
  db.query("SELECT * FROM SportsArea WHERE AreaName = ?", [req.params.name], (err, rows) => {
    if (err) throw err;
    if (!rows[0]) return res.send("Sports area not found");
    res.render("sportsArea/edit", { area: rows[0], timeSlots });
  });
});

/* EDIT POST */
router.post("/edit/:name", (req, res) => {
  const { Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime } = req.body;

  if (CloseTime <= OpenTime) return res.send("Close time must be after Open time");
  if (RecEndTime <= RecStartTime) return res.send("Rec End time must be after Rec Start time");

  const sql = `
    UPDATE SportsArea
    SET Type=?, Location=?, Capacity=?, OpenTime=?, CloseTime=?, RecStartTime=?, RecEndTime=?
    WHERE AreaName=?
  `;
  db.query(sql, [Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime, req.params.name], err => {
    if (err) throw err;
    res.redirect("/sportsArea");
  });
});

module.exports = router;


/* EDIT */
router.post("/edit/:name", (req, res) => {
  const { Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime } = req.body;

  if (CloseTime <= OpenTime) return res.send("Close time must be after Open time");
  if (RecEndTime <= RecStartTime) return res.send("Rec End time must be after Rec Start time");

  const sql = `
    UPDATE SportsArea
    SET Type=?, Location=?, Capacity=?, OpenTime=?, CloseTime=?, RecStartTime=?, RecEndTime=?
    WHERE AreaName=?
  `;
  db.query(sql, [Type, Location, Capacity, OpenTime, CloseTime, RecStartTime, RecEndTime, req.params.name], err => {
    if (err) throw err;
    res.redirect("/sportsArea");
  });
});

/* DELETE */
router.post("/delete/:name", (req, res) => {
  db.query("DELETE FROM SportsArea WHERE AreaName=?", [req.params.name], err => {
    if (err) throw err;
    res.redirect("/sportsArea");
  });
});

module.exports = router;

/* DELETE SPORTS AREA */
router.post("/delete/:name", (req, res) => {
  const areaName = req.params.name;

  db.query(
    "DELETE FROM SportsArea WHERE AreaName = ?",
    [areaName],
    err => {
      if (err) throw err;
      res.redirect("/sportsArea");
    }
  );
});


module.exports = router;
