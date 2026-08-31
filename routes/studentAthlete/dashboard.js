const express = require('express');
const router = express.Router();
const con = require('../../connect'); 

// Dashboard home
router.get('/', (req, res) => {
  res.render('studentAthlete/dashboard', { title: 'Student Athlete Dashboard' });
});

// Multi-team athletes
router.get('/multiTeam', (req, res) => {
  const sql = `
    SELECT s.StudentID, s.Name, GROUP_CONCAT(st.TeamName) AS Teams, COUNT(st.TeamName) AS NumTeams
    FROM StudentAthlete s, StudentTeam st
    WHERE s.StudentID = st.StudentID
    GROUP BY s.StudentID
    HAVING COUNT(st.TeamName) > 1;
  `;
  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('studentAthlete/listResults', { title: 'Multi-team Athletes', results });
  });
});

// Expired forms (NO JOIN)
router.get('/expiredForms', (req, res) => {
  const sql = `
    SELECT 
      pf.StudentID,
      (SELECT s.Name 
       FROM StudentAthlete s 
       WHERE s.StudentID = pf.StudentID) AS Name,
      pf.FormType,
      DATE_FORMAT(pf.ValidTo, '%m-%d-%Y') AS ValidTo
    FROM ParticipationForm pf
    WHERE pf.ValidTo < CURDATE();
  `;

  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('studentAthlete/listResults', { title: 'Expired Forms', results });
  });
});

// Missing Forms (NO JOIN — uses NOT EXISTS)
router.get('/missingForms', (req, res) => {
  const sql = `
    SELECT 
      s.StudentID,
      s.Name,
      f.FormType AS MissingFormType
    FROM StudentAthlete s,
         (SELECT 'Medical' AS FormType
          UNION ALL SELECT 'Consent'
          UNION ALL SELECT 'Insurance'
          UNION ALL SELECT 'Physical'
          UNION ALL SELECT 'Travel') f
    WHERE NOT EXISTS (
      SELECT 1 
      FROM ParticipationForm pf 
      WHERE pf.StudentID = s.StudentID
        AND pf.FormType = f.FormType
    )
    ORDER BY s.StudentID, f.FormType;
  `;

  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('studentAthlete/listResults', { title: 'Missing Forms', results });
  });
});

// Injured athletes
router.get('/injured', (req, res) => {
  const sql = `
    SELECT StudentID, Name, Status
    FROM StudentAthlete
    WHERE Status = 'Injured';
  `;
  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('studentAthlete/listResults', { title: 'Injured Athletes', results });
  });
});

module.exports = router;
