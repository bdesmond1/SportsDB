const express = require('express');
const router = express.Router();
const con = require('../../connect'); // original connect


// ---------------------------
// LIST STUDENT ATHLETES
// ---------------------------
router.get('/', (req, res) => {
  const sql = `
    SELECT sa.StudentID, sa.Name, sa.DOB, sa.Status, sa.MedicalHistory,
           GROUP_CONCAT(st.TeamName SEPARATOR ',') AS Teams
    FROM StudentAthlete sa
    LEFT JOIN StudentTeam st ON sa.StudentID = st.StudentID
    GROUP BY sa.StudentID, sa.Name, sa.DOB, sa.Status, sa.MedicalHistory
    ORDER BY sa.StudentID
  `;

  con.query(sql, (err, results) => {
    if (err) throw err;
    res.render('studentAthlete/list', { title: 'Student Athletes', studentAthletes: results });
  });
});


// ---------------------------
// ADD STUDENT ATHLETE - GET
// ---------------------------
router.get('/add', (req, res) => {
  con.query('SELECT TeamName FROM Team', (err, teams) => {
    if (err) throw err;
    const teamOptions = teams.map(t => `<option value="${t.TeamName}">${t.TeamName}</option>`).join('');
    res.render('studentAthlete/add', { title: 'Add Student Athlete', teamOptions });
  });
});


// ADD STUDENT ATHLETE - POST
router.post('/add', (req, res) => {
  const { Name, DOB, Status, MedicalHistory, Teams } = req.body;

  con.query(
    'INSERT INTO StudentAthlete (Name, DOB, Status, MedicalHistory) VALUES (?, ?, ?, ?)',
    [Name, DOB, Status, MedicalHistory],
    (err, result) => {
      if (err) throw err;

      const studentID = result.insertId;

      if (Teams && Teams.length) {
        const values = Teams.map(team => [studentID, team]);
        con.query(
          'INSERT INTO StudentTeam (StudentID, TeamName) VALUES ?',
          [values],
          (err) => {
            if (err) throw err;
            res.redirect('/studentAthlete');
          }
        );
      } else {
        res.redirect('/studentAthlete');
      }
    }
  );
});


// ---------------------------
// EDIT STUDENT ATHLETE - GET
// ---------------------------
router.get('/edit/:id', (req, res) => {
  const id = req.params.id;

  con.query('SELECT TeamName FROM Team', (err, teams) => {
    if (err) throw err;

    con.query('SELECT * FROM StudentAthlete WHERE StudentID=?', [id], (err, results) => {
      if (err) throw err;
      if (results.length === 0) return res.redirect('/studentAthlete');

      const athlete = results[0];

      con.query('SELECT TeamName FROM StudentTeam WHERE StudentID=?', [id], (err, athleteTeams) => {
        if (err) throw err;

        athlete.Teams = athleteTeams.map(t => t.TeamName);

        const teamOptions = teams
          .map(t => `<option value="${t.TeamName}">${t.TeamName}</option>`)
          .join('\n');

        res.render('studentAthlete/edit', {
          title: 'Edit Student Athlete',
          athlete,
          teamOptions
        });
      });
    });
  });
});


// EDIT STUDENT ATHLETE - POST
router.post('/edit/:id', (req, res) => {
  const id = req.params.id;
  const { Name, DOB, Status, MedicalHistory, Teams } = req.body;

  con.query(
    'UPDATE StudentAthlete SET Name=?, DOB=?, Status=?, MedicalHistory=? WHERE StudentID=?',
    [Name, DOB, Status, MedicalHistory, id],
    (err) => {
      if (err) throw err;

      con.query(
        'SELECT TeamName FROM StudentTeam WHERE StudentID=?',
        [id],
        (err, currentTeams) => {
          if (err) throw err;

          const currentTeamNames = currentTeams.map(t => t.TeamName);
          const newTeams = Array.isArray(Teams) ? Teams : Teams ? [Teams] : [];

          const teamsToAdd = newTeams.filter(t => !currentTeamNames.includes(t));
          const teamsToRemove = currentTeamNames.filter(t => !newTeams.includes(t));

          if (teamsToAdd.length > 0) {
            const values = teamsToAdd.map(team => [id, team]);
            con.query('INSERT INTO StudentTeam (StudentID, TeamName) VALUES ?', [values], (err) => {
              if (err) throw err;
            });
          }

          if (teamsToRemove.length > 0) {
            con.query(
              'DELETE FROM StudentTeam WHERE StudentID=? AND TeamName IN (?)',
              [id, teamsToRemove],
              (err) => {
                if (err) throw err;
              }
            );
          }

          res.redirect('/studentAthlete');
        }
      );
    }
  );
});


// ---------------------------
// DELETE STUDENT ATHLETE
// ---------------------------

// GET delete (optional)
router.get('/delete/:id', (req, res) => {
  const id = req.params.id;
  con.query('DELETE FROM StudentAthlete WHERE StudentID=?', [id], (err) => {
    if (err) throw err;
    res.redirect('/studentAthlete');
  });
});

// POST delete (this fixes your error)
router.post('/delete/:id', (req, res) => {
  const id = req.params.id;
  con.query('DELETE FROM StudentAthlete WHERE StudentID=?', [id], (err) => {
    if (err) throw err;
    res.redirect('/studentAthlete');
  });
});


module.exports = router;
