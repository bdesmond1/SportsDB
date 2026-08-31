const express = require('express');
const router = express.Router();
const db = require('../../connect');

// GET all RecUsers (READ)
router.get('/', (req, res) => {
    db.query('SELECT * FROM RecUser ORDER BY Name', (err, results) => {
        if (err) return res.status(500).send(err);
        res.render('recUsers/list', { title: 'Recreational Users', recusers: results });
    });
});

// GET add form (CREATE - part 1)
router.get('/add', (req, res) => {
    res.render('recUsers/add', { title: 'Add New Rec User' });
});

// POST new RecUser (CREATE - part 2)
router.post('/add', (req, res) => {
    const { name, status } = req.body;

    db.query(
        'INSERT INTO RecUser (Name, Status) VALUES (?, ?)',
        [name, status],
        (err) => {
            if (err) return res.status(500).send(err);
            res.redirect('/recusers'); // redirect to the list
        }
    );
});

// GET edit form (UPDATE - part 1)
router.get('/edit/:id', (req, res) => {
    const userId = req.params.id;
    db.query('SELECT * FROM RecUser WHERE UserID = ?', [userId], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send('User not found');
        res.render('recUsers/edit', { title: 'Edit Rec User', user: results[0] });
    });
});

// POST update RecUser (UPDATE - part 2)
router.post('/edit/:id', (req, res) => {
    const userId = req.params.id;
    const { name, status } = req.body;
    db.query('UPDATE RecUser SET Name = ?, Status = ? WHERE UserID = ?', [name, status, userId], (err) => {
        if (err) return res.status(500).send(err);
        res.redirect('/recusers');
    });
});

// POST delete RecUser (DELETE)
router.post('/delete/:id', (req, res) => {
    const userId = req.params.id;

    db.query('DELETE FROM SessionRecUser WHERE UserID = ?', [userId], (err) => {
        if (err) return res.status(500).send(err);

        db.query('DELETE FROM RecUser WHERE UserID = ?', [userId], (err) => {
            if (err) return res.status(500).send(err);
            res.redirect('/recusers');
        });
    });
});

module.exports = router;
