const express = require('express');
const router = express.Router();
const con = require('../../connect'); // your existing connect

router.get('/', (req, res) => {
  const sql = `
    SELECT s.StaffID, s.Name, s.Type, s.Email, s.PhoneNum,
           COALESCE(c.CoachTeams, '') AS CoachTeams,
           COALESCE(t.TrainerTeams, '') AS TrainerTeams
    FROM Staff s
    LEFT JOIN (
      SELECT ct.CoachID, GROUP_CONCAT(DISTINCT ct.TeamName) AS CoachTeams
      FROM Coach_Team ct
      GROUP BY ct.CoachID
    ) c ON s.StaffID = c.CoachID
    LEFT JOIN (
      SELECT tt.TrainerID, GROUP_CONCAT(DISTINCT tt.TeamName) AS TrainerTeams
      FROM Trainer_Team tt
      GROUP BY tt.TrainerID
    ) t ON s.StaffID = t.TrainerID
    ORDER BY s.Name
  `;

  con.query(sql, (err, results) => {
    if (err) throw err;

    results.forEach(s => {
      const coachTeams = s.CoachTeams ? s.CoachTeams.split(',') : [];
      const trainerTeams = s.TrainerTeams ? s.TrainerTeams.split(',') : [];
      s.Teams = [...new Set([...coachTeams, ...trainerTeams])]; // remove duplicates
    });

    res.render('staff/list', { title: 'Staff', staff: results });
  });
});


// ADD STAFF - GET
router.get('/add', (req, res) => {
    con.query('SELECT TeamName FROM Coach_Team UNION SELECT TeamName FROM Trainer_Team', (err, teams) => {
        if (err) throw err;
        res.render('staff/add', {
            title: 'Add Staff',
            allTeams: teams
        });
    });
});

// ADD STAFF - POST
router.post('/add', (req, res) => {
    const { Name, Type, Email, PhoneNum, Teams } = req.body;
    con.query(
        'INSERT INTO Staff (Name, Type, Email, PhoneNum) VALUES (?, ?, ?, ?)',
        [Name, Type, Email, PhoneNum],
        (err, result) => {
            if (err) throw err;
            const staffID = result.insertId;

            if (Teams && Teams.length) {
                Teams.forEach(team => {
                    if (Type === 'Coach') {
                        con.query('INSERT IGNORE INTO Coach_Team (CoachID, TeamName) VALUES (?, ?)', [staffID, team], err => {
                            if (err) throw err;
                        });
                    } else if (Type === 'Trainer') {
                        con.query('INSERT IGNORE INTO Trainer_Team (TrainerID, TeamName) VALUES (?, ?)', [staffID, team], err => {
                            if (err) throw err;
                        });
                    }
                });
            }

            res.redirect('/staff');
        }
    );
});

// EDIT STAFF - GET
router.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    con.query('SELECT * FROM Staff WHERE StaffID = ?', [id], (err, results) => {
        if (err) throw err;
        if (!results.length) return res.redirect('/staff');

        const staff = results[0];

        // Fetch all teams for dropdown
        con.query('SELECT TeamName FROM Coach_Team UNION SELECT TeamName FROM Trainer_Team', (err, allTeams) => {
            if (err) throw err;

            // Fetch current teams of this staff
            con.query(
                'SELECT TeamName FROM Coach_Team WHERE CoachID=? UNION SELECT TeamName FROM Trainer_Team WHERE TrainerID=?',
                [id, id],
                (err, staffTeams) => {
                    if (err) throw err;

                    res.render('staff/edit', {
                        title: 'Edit Staff',
                        staff,
                        allTeams,
                        staffTeams: staffTeams.map(t => t.TeamName)
                    });
                }
            );
        });
    });
});

// EDIT STAFF - POST
router.post('/edit/:id', (req, res) => {
    const id = req.params.id;
    const { Name, Type, Email, PhoneNum, Teams } = req.body;

    con.query(
        'UPDATE Staff SET Name=?, Type=?, Email=?, PhoneNum=? WHERE StaffID=?',
        [Name, Type, Email, PhoneNum, id],
        (err) => {
            if (err) throw err;

            // Delete existing team links
            con.query('DELETE FROM Coach_Team WHERE CoachID=?', [id], err => {
                if (err) throw err;
                con.query('DELETE FROM Trainer_Team WHERE TrainerID=?', [id], err => {
                    if (err) throw err;

                    // Add new teams
                    if (Teams && Teams.length) {
                        Teams.forEach(team => {
                            if (Type === 'Coach') {
                                con.query('INSERT IGNORE INTO Coach_Team (CoachID, TeamName) VALUES (?, ?)', [id, team], err => {
                                    if (err) throw err;
                                });
                            } else if (Type === 'Trainer') {
                                con.query('INSERT IGNORE INTO Trainer_Team (TrainerID, TeamName) VALUES (?, ?)', [id, team], err => {
                                    if (err) throw err;
                                });
                            }
                        });
                    }

                    res.redirect('/staff');
                });
            });
        }
    );
});

// DELETE STAFF
router.post('/delete/:id', (req, res) => {
    const id = req.params.id;
    con.query('DELETE FROM Staff WHERE StaffID=?', [id], err => {
        if (err) throw err;
        con.query('DELETE FROM Coach_Team WHERE CoachID=?', [id], err => {
            if (err) throw err;
            con.query('DELETE FROM Trainer_Team WHERE TrainerID=?', [id], err => {
                if (err) throw err;
                res.redirect('/staff');
            });
        });
    });
});

module.exports = router;
