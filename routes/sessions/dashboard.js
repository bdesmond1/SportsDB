const express = require('express');
const router = express.Router();
const db = require('../../connect');

// GET /sessions/dashboard
router.get('/', (req, res) => {
  res.render('sessions/dashboard', { title: 'Sessions Dashboard' });
});

// GET /sessions/dashboard/byArea
router.get('/byArea', (req, res) => {
  db.query('SELECT AreaName FROM SportsArea ORDER BY AreaName', (err, areas) => {
    if (err) return res.status(500).send('Database error');
    res.render('sessions/listResults', { title: 'Sessions by Area', areas, results: null });
  });
});

// POST /sessions/dashboard/byArea
router.post('/byArea', (req, res) => {
  const selected = req.body.areaName;

  db.query('SELECT AreaName FROM SportsArea ORDER BY AreaName', (err, areas) => {
    if (err) return res.status(500).send('Database error');

    db.query(
      'SELECT SessionID, Date, StartTime, EndTime, Type, SessionMode, TeamName, AreaName FROM Session WHERE AreaName = ? ORDER BY Date, StartTime',
      [selected],
      (err, sessions) => {
        if (err) return res.status(500).send('Database error');

        res.render('sessions/listResults', { title: `Sessions in ${selected}`, areas, results: sessions });
      }
    );
  });
});
module.exports = router;