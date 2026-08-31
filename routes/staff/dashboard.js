const express = require('express');
const router = express.Router();
const con = require('../../connect'); // your existing connect  

// Dashboard home
router.get('/', (req, res) => {
  res.render('staff/dashboard', { title: 'Staff Dashboard' });
});

// Staff assigned to multiple teams
router.get('/multiTeam', (req, res) => {
  const sql = `
    SELECT s.Name AS StaffName, 'Coach' AS Type, GROUP_CONCAT(ct.TeamName) AS Teams, COUNT(ct.TeamName) AS NumTeams
    FROM Staff s, Coach_Team ct
    WHERE s.StaffID = ct.CoachID
    GROUP BY s.StaffID
    HAVING COUNT(ct.TeamName) > 1

    UNION

    SELECT s.Name AS StaffName, 'Trainer' AS Type, GROUP_CONCAT(tt.TeamName) AS Teams, COUNT(tt.TeamName) AS NumTeams
    FROM Staff s, Trainer_Team tt
    WHERE s.StaffID = tt.TrainerID
    GROUP BY s.StaffID
    HAVING COUNT(tt.TeamName) > 1
  `;
  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('staff/listResults', { title: 'Staff Assigned to Multiple Teams', results });
  });
});

// Coaches supervising more than 3 sessions
router.get('/3sessions', (req, res) => {
  const sql = `
    SELECT 
      s.Name AS Coach,
      COUNT(DISTINCT ss.SessionID) AS NumSessions
    FROM Staff s
    JOIN Coach_Team ct ON s.StaffID = ct.CoachID
    JOIN Session ss ON ss.TeamName = ct.TeamName
    WHERE s.Type = 'Coach'
    GROUP BY s.StaffID, s.Name
    HAVING COUNT(DISTINCT ss.SessionID) > 3
    ORDER BY NumSessions DESC
  `;

  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('staff/listResults', { 
      title: 'Coaches Supervising More Than 3 Sessions', 
      results 
    });
  });
});

// Total count of athletes each staff is assigned to
router.get('/totalAthletes', (req, res) => {
  const sql = `
    SELECT s.Name AS StaffName, 'Coach' AS Type, COUNT(DISTINCT st.StudentID) AS NumAthletes
    FROM Staff s, Coach_Team ct, StudentTeam st
    WHERE s.StaffID = ct.CoachID
      AND ct.TeamName = st.TeamName
    GROUP BY s.StaffID

    UNION

    SELECT s.Name AS StaffName, 'Trainer' AS Type, COUNT(DISTINCT st.StudentID) AS NumAthletes
    FROM Staff s, Trainer_Team tt, StudentTeam st
    WHERE s.StaffID = tt.TrainerID
      AND tt.TeamName = st.TeamName
    GROUP BY s.StaffID
  `;
  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('staff/listResults', { title: 'Total Athletes per Staff', results });
  });
});

router.get('/sessionsToday', (req, res) => {
  const sql = `
    SELECT DISTINCT
      s.Name AS Coach,
      ss.SessionID,
      ss.TeamName,
      ss.Date,
      DATE_FORMAT(ss.StartTime, '%l:%i %p') AS StartTime,
      DATE_FORMAT(ss.EndTime, '%l:%i %p') AS EndTime
    FROM Staff s
    JOIN Coach_Team ct ON s.StaffID = ct.CoachID
    JOIN Session ss ON ss.TeamName = ct.TeamName
    WHERE s.Type = 'Coach'
      AND ss.Date = CURDATE()
    ORDER BY s.Name, StartTime
  `;

  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('staff/listResults', { title: "Coach Sessions Today", results });
  });
});


module.exports = router;
