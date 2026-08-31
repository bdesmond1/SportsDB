const express = require('express');
const router = express.Router();
const db = require('../../connect'); // MySQL connection (callback style)

// ----------------------------
// Helper Functions
// ----------------------------
function getCoaches(callback) {
    db.query(
        "SELECT StaffID, Name FROM Staff WHERE Type = 'Coach' ORDER BY Name",
        (err, results) => callback(err, results)
    );
}

function getTrainers(callback) {
    db.query(
        "SELECT StaffID, Name FROM Staff WHERE Type = 'Trainer' ORDER BY Name",
        (err, results) => callback(err, results)
    );
}

// ----------------------------
// LIST TEAMS
// ----------------------------
router.get('/', (req, res) => {
    const sql = `
        SELECT T.TeamName, T.Sport, T.Gender, T.SeasonStart, T.SeasonEnd,
               S.Name AS CoachName
        FROM Team T
        LEFT JOIN Staff S ON T.StaffID = S.StaffID
        ORDER BY T.TeamName
    `;
    db.query(sql, (err, teams) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error fetching teams");
        }
        res.render('teams/list', { title: 'Manage Teams', teams });
    });
});

// ----------------------------
// ADD TEAM
// ----------------------------
router.get('/add', (req, res) => {
    getCoaches((err, coaches) => {
        if (err) return res.status(500).send("Error loading add form");
        res.render('teams/add', { title: 'Add New Team', coaches });
    });
});

router.post('/add', (req, res) => {
    const { teamName, sport, gender, seasonStart, seasonEnd, coachId } = req.body;
    const sql = `
        INSERT INTO Team (TeamName, Sport, Gender, SeasonStart, SeasonEnd, StaffID)
        VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.query(sql, [teamName, sport, gender, seasonStart || null, seasonEnd || null, coachId || null], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error adding team");
        }
        res.redirect('/teams');
    });
});

// ----------------------------
// EDIT TEAM
// ----------------------------
router.get('/edit/:teamName', (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);
    getCoaches((err, coaches) => {
        if (err) return res.status(500).send("Error loading coaches");
        db.query('SELECT * FROM Team WHERE TeamName = ?', [teamName], (err, results) => {
            if (err) return res.status(500).send("Error fetching team details");
            if (!results.length) return res.status(404).send('Team not found');
            res.render('teams/edit', { title: 'Edit Team', team: results[0], coaches });
        });
    });
});

router.post('/edit/:teamName', (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);
    const { sport, gender, seasonStart, seasonEnd, coachId } = req.body;
    const sql = `
        UPDATE Team
        SET Sport = ?, Gender = ?, SeasonStart = ?, SeasonEnd = ?, StaffID = ?
        WHERE TeamName = ?
    `;
    db.query(sql, [sport, gender, seasonStart || null, seasonEnd || null, coachId || null, teamName], (err) => {
        if (err) return res.status(500).send("Error updating team");
        res.redirect('/teams');
    });
});

// ----------------------------
// DELETE TEAM
// ----------------------------
router.post('/delete/:teamName', (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);
    const queries = [
        ['DELETE FROM StudentTeam WHERE TeamName = ?', [teamName]],
        ['DELETE FROM Coach_Team WHERE TeamName = ?', [teamName]],
        ['DELETE FROM Trainer_Team WHERE TeamName = ?', [teamName]],
        ['DELETE FROM Team WHERE TeamName = ?', [teamName]],
    ];

    const executeQuery = (i = 0) => {
        if (i >= queries.length) return res.redirect('/teams');
        db.query(queries[i][0], queries[i][1], (err) => {
            if (err) return res.status(500).send(`Error executing query: ${queries[i][0]}`);
            executeQuery(i + 1);
        });
    };
    executeQuery();
});

// ----------------------------
// VIEW TEAM ROSTER
// ----------------------------
router.get('/roster/:teamName', (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);

    db.query('SELECT * FROM Team WHERE TeamName = ?', [teamName], (err, teamResults) => {
        if (err) return res.status(500).send('Error fetching team details');
        if (!teamResults.length) return res.status(404).send('Team not found');
        const team = teamResults[0];

        // Get assigned athletes
        db.query(`
            SELECT SA.StudentID, SA.Name, SA.DOB, SA.Status
            FROM StudentAthlete SA
            JOIN StudentTeam ST ON SA.StudentID = ST.StudentID
            WHERE ST.TeamName = ?
            ORDER BY SA.Name
        `, [teamName], (err, roster) => {
            if (err) return res.status(500).send('Error fetching roster');

            // Get all athletes
            db.query('SELECT StudentID, Name, Status FROM StudentAthlete ORDER BY Name', (err, athletes) => {
                if (err) return res.status(500).send('Error fetching athletes');

                res.render('teams/roster', {
                    title: `Roster for ${team.TeamName}`,
                    team,
                    roster,
                    athletes,
                    alertMessage: req.query.alert || null
                });
            });
        });
    });
});

// ----------------------------
// ADD ATHLETE TO ROSTER
// ----------------------------
router.post('/roster/add/:teamName', (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);
    const { studentId } = req.body;

    const sql = 'INSERT INTO StudentTeam (StudentID, TeamName) VALUES (?, ?)';
    db.query(sql, [studentId, teamName], (err) => {
        if (err) {
            console.error(err);

            // Duplicate entry
            const alertMsg = err.code === 'ER_DUP_ENTRY' ? 'Athlete is already on this roster!' : 'Error adding athlete';

            return res.redirect(`/teams/roster/${encodeURIComponent(teamName)}?alert=${encodeURIComponent(alertMsg)}`);
        }
        res.redirect(`/teams/roster/${encodeURIComponent(teamName)}`);
    });
});

// ----------------------------
// REMOVE ATHLETE FROM ROSTER
// ----------------------------
router.post('/roster/remove/:teamName', (req, res) => {
    const teamName = decodeURIComponent(req.params.teamName);
    const { studentId } = req.body;

    const sql = 'DELETE FROM StudentTeam WHERE StudentID = ? AND TeamName = ?';
    db.query(sql, [studentId, teamName], (err) => {
        if (err) return res.status(500).send("Error removing athlete from roster");
        res.redirect(`/teams/roster/${encodeURIComponent(teamName)}`);
    });
});

module.exports = router;

