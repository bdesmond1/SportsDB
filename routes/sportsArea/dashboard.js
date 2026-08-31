const express = require('express');
const router = express.Router();
const db = require('../../connect');

// Sports Areas Dashboard
router.get('/', (req, res) => {
    res.render('sportsArea/dashboard', { title: 'Sports Areas Dashboard' });
});

// 1. Participants per session
router.get('/participants', (req, res) => {
    const sql = `
        SELECT 
            SA.AreaName,
            S.SessionID,
            S.Date,
            S.StartTime,
            S.EndTime,
            COUNT(SS.StudentID) AS NumParticipants
        FROM SportsArea SA
        LEFT JOIN Session S ON SA.AreaName = S.AreaName
        LEFT JOIN SessionStudent SS ON S.SessionID = SS.SessionID
        GROUP BY SA.AreaName, S.SessionID, S.Date, S.StartTime, S.EndTime
        ORDER BY SA.AreaName, S.Date, S.StartTime;
    `;
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('sportsArea/listResults', { title: 'Participants per Session', results });
    });
});

// 2. Average participants per area
router.get('/avgParticipants', (req, res) => {
    const sql = `
        SELECT 
            SA.AreaName,
            ROUND(AVG(Sub.NumParticipants), 1) AS AvgParticipants
        FROM SportsArea SA
        LEFT JOIN Session S ON SA.AreaName = S.AreaName
        LEFT JOIN SessionStudent SS ON S.SessionID = SS.SessionID
        LEFT JOIN (
            SELECT 
                S.SessionID,
                COUNT(SS.StudentID) AS NumParticipants
            FROM Session S
            LEFT JOIN SessionStudent SS ON S.SessionID = SS.SessionID
            GROUP BY S.SessionID
        ) AS Sub ON Sub.SessionID = S.SessionID
        GROUP BY SA.AreaName
        ORDER BY AvgParticipants DESC;
    `;
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('sportsArea/listResults', { title: 'Average Participants per Sports Area', results });
    });
});

// 3. Areas with more than 5 sessions
router.get('/moreThan5Sessions', (req, res) => {
    const sql = `
        SELECT 
            SA.AreaName,
            COUNT(DISTINCT S.SessionID) AS NumSessions,
            ROUND(AVG(Sub.NumParticipants), 1) AS AvgParticipants
        FROM SportsArea SA
        JOIN Session S ON SA.AreaName = S.AreaName
        LEFT JOIN SessionStudent SS ON S.SessionID = SS.SessionID
        LEFT JOIN (
            SELECT 
                S.SessionID,
                COUNT(SS.StudentID) AS NumParticipants
            FROM Session S
            LEFT JOIN SessionStudent SS ON S.SessionID = SS.SessionID
            GROUP BY S.SessionID
        ) AS Sub ON Sub.SessionID = S.SessionID
        GROUP BY SA.AreaName
        HAVING COUNT(DISTINCT S.SessionID) > 5
        ORDER BY AvgParticipants DESC;
    `;
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('sportsArea/listResults', { title: 'Areas with More Than 5 Sessions', results });
    });
});

// 4. Sessions with maximum attendance
router.get('/maxAttendance', (req, res) => {
    const sql = `
        SELECT 
            SA.AreaName,
            S.SessionID,
            S.Date,
            S.StartTime,
            S.EndTime,
            COUNT(SS.StudentID) AS NumParticipants
        FROM SportsArea SA
        LEFT JOIN Session S ON SA.AreaName = S.AreaName
        LEFT JOIN SessionStudent SS ON S.SessionID = SS.SessionID
        GROUP BY SA.AreaName, S.SessionID, S.Date, S.StartTime, S.EndTime
        HAVING NumParticipants = (
            SELECT MAX(CountSub.NumParticipants)
            FROM (
                SELECT COUNT(StudentID) AS NumParticipants
                FROM SessionStudent
                GROUP BY SessionID
            ) AS CountSub
        )
        ORDER BY SA.AreaName, S.Date, S.StartTime;
    `;
    db.query(sql, (err, results) => {
        if (err) throw err;
        res.render('sportsArea/listResults', { title: 'Sessions with Maximum Attendance', results });
    });
});

module.exports = router;
