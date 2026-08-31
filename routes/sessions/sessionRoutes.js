const express = require('express');
const router = express.Router();
const con = require('../../connect'); // MySQL connection

// ---------------------------
// Helper: format time as 12-hour
// ---------------------------
function formatTime12h(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minutes.padStart(2, '0')} ${ampm}`;
}

// ---------------------------
// Check area availability for team sessions
// ---------------------------
function checkAreaAvailability(date, startTime, endTime, areaName, sessionId, callback) {
    const sql = `
        SELECT 1 FROM Session
        WHERE AreaName = ?
          AND Date = ?
          AND SessionMode = 'team'
          AND NOT (CAST(EndTime AS TIME) <= CAST(? AS TIME) OR CAST(StartTime AS TIME) >= CAST(? AS TIME))
          ${sessionId ? 'AND SessionID != ?' : ''}
    `;
    const params = sessionId ? [areaName, date, startTime, endTime, sessionId] : [areaName, date, startTime, endTime];
    con.query(sql, params, (err, rows) => {
        if (err) return callback(err);
        callback(null, rows.length === 0); // true if available
    });
}

// ---------------------------
// LIST SESSIONS
// ---------------------------
router.get('/', (req, res) => {
    con.query('SELECT * FROM Session ORDER BY Date, StartTime', (err, sessions) => {
        if (err) throw err;
        if (!sessions.length) {
            return res.render('sessions/list', { title: 'Sessions', sessions: [], formatTime12h });
        }

        let processed = 0;
        sessions.forEach(s => {
            const query = s.SessionMode === 'team'
                ? 'SELECT StudentID FROM SessionStudent WHERE SessionID=?'
                : 'SELECT UserID FROM SessionRecUser WHERE SessionID=?';

            con.query(query, [s.SessionID], (err, participants) => {
                if (err) throw err;
                s.Participants = participants.map(p => s.SessionMode === 'team' ? p.StudentID : p.UserID).join(', ');
                processed++;
                if (processed === sessions.length) {
                    res.render('sessions/list', { title: 'Sessions', sessions, formatTime12h });
                }
            });
        });
    });
});

// ---------------------------
// GET ADD SESSION
// ---------------------------
router.get('/add', (req, res) => {
    con.query('SELECT TeamName FROM Team ORDER BY TeamName', (err, teams) => {
        if (err) throw err;
        con.query('SELECT UserID FROM RecUser WHERE Status="Active" ORDER BY UserID', (err, recUsers) => {
            if (err) throw err;
            con.query('SELECT AreaName, OpenTime, CloseTime, RecStartTime, RecEndTime FROM SportsArea ORDER BY AreaName', (err, areas) => {
                if (err) throw err;
                res.render('sessions/add', { title: 'Add Session', teams, recUsers, areas, message: null, formData: {} });
            });
        });
    });
});

// ---------------------------
// POST ADD SESSION
// ---------------------------
router.post('/add', (req, res) => {
    const { SessionMode, Date, StartTime, EndTime, Type, TeamName, RecUsers, AreaName } = req.body;
    const formData = { SessionMode, Date, StartTime, EndTime, Type, TeamName, RecUsers, AreaName };

    if (StartTime >= EndTime) return renderAddWithMessage('Start time must be before end time.');

    con.query('SELECT OpenTime, CloseTime, RecStartTime, RecEndTime FROM SportsArea WHERE AreaName=?', [AreaName], (err, rows) => {
        if (err) throw err;
        if (!rows.length) return renderAddWithMessage('Selected sports area not found.');

        const area = rows[0];
        let minTime, maxTime;

        if (SessionMode === 'team') {
            minTime = area.OpenTime.toString().slice(0,5);
            maxTime = area.CloseTime.toString().slice(0,5);

            if (StartTime < minTime || EndTime > maxTime) {
                return renderAddWithMessage(`Team sessions must be between ${formatTime12h(minTime)} and ${formatTime12h(maxTime)}.`);
            }

            checkAreaAvailability(Date, StartTime, EndTime, AreaName, null, (err, available) => {
                if (err) throw err;
                if (!available) return renderAddWithMessage('Sports area already booked for this team session!');
                insertSession();
            });
        } else { // rec
            minTime = area.RecStartTime.toString().slice(0,5);
            maxTime = area.RecEndTime.toString().slice(0,5);

            if (StartTime < minTime || EndTime > maxTime) {
                return renderAddWithMessage(`Recreational sessions must be between ${formatTime12h(minTime)} and ${formatTime12h(maxTime)}.`);
            }

            const overlapQuery = `
                SELECT 1 FROM Session
                WHERE AreaName = ?
                  AND SessionMode = 'team'
                  AND Type IN ('Practice', 'Competition')
                  AND Date = ?
                  AND NOT (EndTime <= ? OR StartTime >= ?)
            `;
            con.query(overlapQuery, [AreaName, Date, StartTime, EndTime], (err, overlapRows) => {
                if (err) throw err;
                if (overlapRows.length) return renderAddWithMessage('Cannot schedule rec session: a team session is happening in this area during this time.');
                insertSession();
            });
        }
    });

    function insertSession() {
        con.query(
            'INSERT INTO Session (Date, StartTime, EndTime, Type, SessionMode, TeamName, AreaName) VALUES (?,?,?,?,?,?,?)',
            [Date, StartTime, EndTime, Type, SessionMode, SessionMode==='team'?TeamName:null, AreaName],
            (err, result) => {
                if (err) throw err;
                const sessionId = result.insertId;

                if (SessionMode === 'rec' && RecUsers) {
                    const users = Array.isArray(RecUsers) ? RecUsers : [RecUsers];
                    users.forEach(u => {
                        // Add user to this session
                        con.query(
                            'INSERT INTO SessionRecUser (SessionID, UserID) SELECT ?, UserID FROM RecUser WHERE UserID=? AND Status="Active"',
                            [sessionId, u]
                        );

                        // Add user to overlapping rec sessions automatically
                        const overlapSessionsQuery = `
                            SELECT SessionID FROM Session
                            WHERE SessionMode='rec'
                              AND Date=?
                              AND AreaName=?
                              AND NOT (EndTime <= ? OR StartTime >= ?)
                        `;
                        con.query(overlapSessionsQuery, [Date, AreaName, StartTime, EndTime], (err, overlapping) => {
                            if (err) throw err;
                            if (overlapping.length) {
                                const values = overlapping.map(row => [row.SessionID, u]);
                                con.query('INSERT IGNORE INTO SessionRecUser (SessionID, UserID) VALUES ?', [values]);
                            }
                        });
                    });
                    return res.redirect('/sessions');
                } else if (SessionMode === 'team' && TeamName) {
                    const studentQuery = `
                        SELECT SA.StudentID
                        FROM StudentAthlete SA
                        JOIN StudentTeam ST ON SA.StudentID = ST.StudentID
                        WHERE ST.TeamName=? AND SA.Status='Active'
                    `;
                    con.query(studentQuery, [TeamName], (err, students) => {
                        if (err) throw err;
                        if (students.length) {
                            const values = students.map(s => [sessionId, s.StudentID]);
                            con.query('INSERT INTO SessionStudent (SessionID, StudentID) VALUES ?', [values], (err) => {
                                if (err) throw err;
                                return res.redirect('/sessions');
                            });
                        } else return res.redirect('/sessions');
                    });
                } else return res.redirect('/sessions');
            }
        );
    }

    function renderAddWithMessage(msg) {
        con.query('SELECT TeamName FROM Team ORDER BY TeamName', (err, teams) => {
            if (err) throw err;
            con.query('SELECT UserID FROM RecUser WHERE Status="Active" ORDER BY UserID', (err, recUsers) => {
                if (err) throw err;
                con.query('SELECT AreaName, OpenTime, CloseTime, RecStartTime, RecEndTime FROM SportsArea ORDER BY AreaName', (err, areas) => {
                    if (err) throw err;
                    res.render('sessions/add', { title: 'Add Session', teams, recUsers, areas, message: msg, formData });
                });
            });
        });
    }
});

// ---------------------------
// GET EDIT SESSION
// ---------------------------
router.get('/edit/:id', (req, res) => {
    const id = req.params.id;
    con.query('SELECT * FROM Session WHERE SessionID=?', [id], (err, sessions) => {
        if (err) throw err;
        if (!sessions.length) return res.redirect('/sessions');
        const session = sessions[0];

        con.query('SELECT TeamName FROM Team ORDER BY TeamName', (err, teams) => {
            if (err) throw err;
            con.query('SELECT UserID FROM RecUser WHERE Status="Active" ORDER BY UserID', (err, recUsers) => {
                if (err) throw err;
                con.query('SELECT AreaName, OpenTime, CloseTime, RecStartTime, RecEndTime FROM SportsArea ORDER BY AreaName', (err, areas) => {
                    if (err) throw err;
                    const query = session.SessionMode==='team'
                        ? 'SELECT StudentID FROM SessionStudent WHERE SessionID=?'
                        : 'SELECT UserID FROM SessionRecUser WHERE SessionID=?';
                    con.query(query, [id], (err, participants) => {
                        if (err) throw err;
                        const selectedParticipants = participants.map(p => session.SessionMode==='team'?p.StudentID:p.UserID);
                        res.render('sessions/edit', { title: 'Edit Session', session, teams, recUsers, areas, selectedParticipants, message: null });
                    });
                });
            });
        });
    });
});

// ---------------------------
// POST EDIT SESSION
// ---------------------------
router.post('/edit/:id', (req, res) => {
    const id = req.params.id;
    const { SessionMode, Date, StartTime, EndTime, Type, TeamName, RecUsers, AreaName } = req.body;

    if (StartTime >= EndTime) return renderEditWithMessage(id, 'Start time must be before end time.');

    con.query('SELECT OpenTime, CloseTime, RecStartTime, RecEndTime FROM SportsArea WHERE AreaName=?', [AreaName], (err, rows) => {
        if (err) throw err;
        if (!rows.length) return renderEditWithMessage(id, 'Selected sports area not found.');

        const area = rows[0];
        let minTime, maxTime;

        if (SessionMode === 'team') {
            minTime = area.OpenTime.toString().slice(0,5);
            maxTime = area.CloseTime.toString().slice(0,5);

            if (StartTime < minTime || EndTime > maxTime) {
                return renderEditWithMessage(id, `Team sessions must be between ${formatTime12h(minTime)} and ${formatTime12h(maxTime)}.`);
            }

            checkAreaAvailability(Date, StartTime, EndTime, AreaName, id, (err, available) => {
                if (err) throw err;
                if (!available) return renderEditWithMessage(id, 'Sports area already booked for this team session!');
                updateSession();
            });
        } else { // rec
            minTime = area.RecStartTime.toString().slice(0,5);
            maxTime = area.RecEndTime.toString().slice(0,5);

            if (StartTime < minTime || EndTime > maxTime) {
                return renderEditWithMessage(id, `Recreational sessions must be between ${formatTime12h(minTime)} and ${formatTime12h(maxTime)}.`);
            }

            const overlapQuery = `
                SELECT 1 FROM Session
                WHERE AreaName = ?
                  AND SessionMode = 'team'
                  AND Type IN ('Practice', 'Competition')
                  AND Date = ?
                  AND NOT (EndTime <= ? OR StartTime >= ?)
            `;
            con.query(overlapQuery, [AreaName, Date, StartTime, EndTime], (err, overlapRows) => {
                if (err) throw err;
                if (overlapRows.length) return renderEditWithMessage('Cannot schedule rec session: a team session is happening in this area during this time.');
                updateSession();
            });
        }
    });

    function updateSession() {
        con.query(
            'UPDATE Session SET Date=?, StartTime=?, EndTime=?, Type=?, SessionMode=?, TeamName=?, AreaName=? WHERE SessionID=?',
            [Date, StartTime, EndTime, Type, SessionMode, SessionMode==='team'?TeamName:null, AreaName, id],
            (err) => {
                if (err) throw err;

                // Clear previous participants
                con.query('DELETE FROM SessionStudent WHERE SessionID=?', [id], (err) => {
                    if (err) throw err;
                    con.query('DELETE FROM SessionRecUser WHERE SessionID=?', [id], (err) => {
                        if (err) throw err;

                        if (SessionMode === 'team' && TeamName) {
                            const studentQuery = `
                                SELECT SA.StudentID
                                FROM StudentAthlete SA
                                JOIN StudentTeam ST ON SA.StudentID = ST.StudentID
                                WHERE ST.TeamName=? AND SA.Status='Active'
                            `;
                            con.query(studentQuery, [TeamName], (err, students) => {
                                if (err) throw err;
                                if (students.length) {
                                    const values = students.map(s => [id, s.StudentID]);
                                    con.query('INSERT INTO SessionStudent (SessionID, StudentID) VALUES ?', [values], (err) => {
                                        if (err) throw err;
                                        return res.redirect('/sessions');
                                    });
                                } else return res.redirect('/sessions');
                            });
                        } else if (SessionMode === 'rec' && RecUsers) {
                            const users = Array.isArray(RecUsers)?RecUsers:[RecUsers];
                            users.forEach(u => {
                                // Add user to this session
                                con.query(
                                    'INSERT INTO SessionRecUser (SessionID, UserID) SELECT ?, UserID FROM RecUser WHERE UserID=? AND Status="Active"',
                                    [id, u]
                                );

                                // Add user to overlapping rec sessions automatically
                                const overlapSessionsQuery = `
                                    SELECT SessionID FROM Session
                                    WHERE SessionMode='rec'
                                      AND Date=?
                                      AND AreaName=?
                                      AND NOT (EndTime <= ? OR StartTime >= ?)
                                      AND SessionID != ?
                                `;
                                con.query(overlapSessionsQuery, [Date, AreaName, StartTime, EndTime, id], (err, overlapping) => {
                                    if (err) throw err;
                                    if (overlapping.length) {
                                        const values = overlapping.map(row => [row.SessionID, u]);
                                        con.query('INSERT IGNORE INTO SessionRecUser (SessionID, UserID) VALUES ?', [values]);
                                    }
                                });
                            });
                            return res.redirect('/sessions');
                        } else return res.redirect('/sessions');
                    });
                });
            }
        );
    }

    function renderEditWithMessage(sessionId, msg) {
        con.query('SELECT * FROM Session WHERE SessionID=?', [sessionId], (err, sessions) => {
            if (err) throw err;
            if (!sessions.length) return res.redirect('/sessions');
            const session = sessions[0];

            con.query('SELECT TeamName FROM Team ORDER BY TeamName', (err, teams) => {
                if (err) throw err;
                con.query('SELECT UserID FROM RecUser WHERE Status="Active" ORDER BY UserID', (err, recUsers) => {
                    if (err) throw err;
                    con.query('SELECT AreaName, OpenTime, CloseTime, RecStartTime, RecEndTime FROM SportsArea ORDER BY AreaName', (err, areas) => {
                        if (err) throw err;
                        const query = session.SessionMode==='team'
                            ? 'SELECT StudentID FROM SessionStudent WHERE SessionID=?'
                            : 'SELECT UserID FROM SessionRecUser WHERE SessionID=?';
                        con.query(query, [sessionId], (err, participants) => {
                            if (err) throw err;
                            const selectedParticipants = participants.map(p => session.SessionMode==='team'?p.StudentID:p.UserID);
                            res.render('sessions/edit', { title: 'Edit Session', session, teams, recUsers, areas, selectedParticipants, message: msg });
                        });
                    });
                });
            });
        });
    }
});

// ---------------------------
// DELETE SESSION
// ---------------------------
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;
    con.query('DELETE FROM Session WHERE SessionID=?', [id], (err) => {
        if (err) throw err;
        res.redirect('/sessions');
    });
});

module.exports = router;
