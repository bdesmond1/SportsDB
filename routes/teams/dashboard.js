const express = require('express');
const router = express.Router();
const con = require('../../connect');

// Dashboard home
router.get('/', (req, res) => {
  res.render('teams/dashboard', { title: 'Team Dashboard' });
});

// ====================
// 1) Teammates page
// ====================
router.get('/teammates', (req, res) => {
  const selectedName = req.query.athleteName || null;

  // Fetch all athletes for dropdown
  con.query('SELECT Name FROM StudentAthlete ORDER BY Name', (err, athletes) => {
    if (err) return res.status(500).send(err);

    if (!selectedName) {
      return res.render('teams/listResults', { 
        title: 'Find Teammates',
        athletes,
        selectedAthlete: null,
        results: [],       // teammates table
        activeTeams: [],   // active teams table
        teamsBySeason: []  // grouped teams table
      });
    }

    const query = `
      SELECT SA.Name AS TeammateName, ST.TeamName, SA.DOB
      FROM StudentAthlete SA
      JOIN StudentTeam ST ON SA.StudentID = ST.StudentID
      WHERE ST.TeamName = (
          SELECT ST2.TeamName
          FROM StudentAthlete SA2
          JOIN StudentTeam ST2 ON SA2.StudentID = ST2.StudentID
          WHERE SA2.Name = ?
      )
      AND SA.Name != ?
      ORDER BY SA.Name;
    `;

    con.query(query, [selectedName, selectedName], (err, results) => {
      if (err) return res.status(500).send(err);

      res.render('teams/listResults', {
        title: `Teammates of ${selectedName}`,
        athletes,
        selectedAthlete: selectedName,
        results,       // teammates
        activeTeams: [],
        teamsBySeason: []
      });
    });
  });
});

// ====================
// 2) Active Sports page
// ====================
router.get('/active-sports', (req, res) => {
  const sql = `
    SELECT T.TeamName, T.Sport, S.Name AS CoachName, T.SeasonStart, T.SeasonEnd
    FROM Team T
    LEFT JOIN Staff S ON T.StaffID = S.StaffID
    WHERE T.SeasonStart <= CURDATE() AND T.SeasonEnd >= CURDATE()
    ORDER BY T.Sport, T.TeamName
  `;

  con.query(sql, (err, activeTeams) => {
    if (err) return res.status(500).send(err);

    // Compute season for each team
    activeTeams.forEach(team => {
      const month = new Date(team.SeasonStart).getMonth() + 1;
      if ([12,1,2].includes(month)) team.Season = 'Winter';
      else if ([3,4,5].includes(month)) team.Season = 'Spring';
      else team.Season = 'Fall';
    });

    res.render('teams/listResults', {
      title: 'Active Teams',
      athletes: [],
      selectedAthlete: null,
      results: activeTeams,
      activeTeams,
      teamsBySeason: []
    });
  });
});

// ====================
// 3) Teams by Season page
// ====================
router.get('/seasonsports', (req, res) => {
  const teamsBySeasonQuery = `
    SELECT 
      CASE 
        WHEN MONTH(SeasonStart) IN (12,1,2) THEN 'Winter'
        WHEN MONTH(SeasonStart) IN (3,4,5) THEN 'Spring'
        ELSE 'Fall'
      END AS Season,
      GROUP_CONCAT(DISTINCT Sport ORDER BY Sport) AS Sports
    FROM Team
    GROUP BY Season
    ORDER BY FIELD(Season,'Winter','Spring','Fall');
  `;

  con.query(teamsBySeasonQuery, (err, teamsBySeason) => {
    if (err) return res.status(500).send(err);

    res.render('teams/listResults', {
      title: 'Teams by Season',
      athletes: [],
      selectedAthlete: null,
      results: [],
      activeTeams: [],
      teamsBySeason
    });
  });
});

module.exports = router;
