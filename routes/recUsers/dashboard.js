// dashboard.js
const express = require('express');
const router = express.Router();
const db = require('../../connect'); // MySQL connection

// GET dashboard home
router.get('/', (req, res) => {
    res.render('recusers/dashboard', { title: 'Rec Users Dashboard' });
});

// GET attendance page
router.get('/attendance', (req, res) => {
    const selectedSessionId = req.query.session_id;

    const sessionSql = `
        SELECT SessionID, CONCAT(Date, ' - ', Type) AS SessionDetails
        FROM Session
        WHERE SessionMode = 'rec'
        ORDER BY Date DESC
    `;
    db.query(sessionSql, (err, sessions) => {
        if (err) return res.status(500).send(err);

        let results = [];
        let details = null;

        if (selectedSessionId) {
            const attendanceQuery = `
                SELECT RU.Name, S.Date, S.StartTime, S.EndTime, S.Type
                FROM RecUser RU
                JOIN SessionRecUser SRU ON RU.UserID = SRU.UserID
                JOIN Session S ON SRU.SessionID = S.SessionID
                WHERE SRU.SessionID = ?
                ORDER BY RU.Name
            `;
            db.query(attendanceQuery, [selectedSessionId], (err, attendanceResults) => {
                if (err) return res.status(500).send(err);
                results = attendanceResults;
                if (results.length > 0) {
                    details = {
                        Date: results[0].Date,
                        StartTime: results[0].StartTime,
                        EndTime: results[0].EndTime,
                        Type: results[0].Type
                    };
                }
                res.render('recUsers/listResults', {
                    title: 'Rec User Attendance',
                    results,
                    sessions,
                    selectedSessionId,
                    details
                });
            });
        } else {
            res.render('recUsers/listResults', {
                title: 'Rec User Attendance',
                results,
                sessions,
                selectedSessionId: null,
                details
            });
        }
    });
});

module.exports = router;
