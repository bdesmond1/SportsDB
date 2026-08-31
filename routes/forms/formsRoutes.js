const express = require('express');
const router = express.Router();
const db = require('../../connect');
const { upload } = require('../../utils/upload'); // import Multer config

// ===============================================
// LIST ALL FORMS
// ===============================================
router.get('/', (req, res) => {
  const q = req.query.q || '';
  let sql = `
    SELECT f.*, a.Name AS StudentName
    FROM ParticipationForm f
    LEFT JOIN StudentAthlete a ON f.StudentID = a.StudentID
  `;
  const params = [];

  if (q) {
    sql += ` WHERE a.Name LIKE ? OR f.FormType LIKE ?`;
    params.push(`%${q}%`, `%${q}%`);
  }

  sql += ` ORDER BY f.ValidTo DESC`;

  db.query(sql, params, (err, forms) => {
    if (err) return res.status(500).send('Database error');
    res.render('forms/list', { forms, q, student: null });
  });
});

// ===============================================
// ADD FORM PAGES
// ===============================================
router.get('/add', (req, res) => {
  db.query('SELECT StudentID, Name FROM StudentAthlete ORDER BY Name', (err, students) => {
    if (err) return res.status(500).send('Database error');
    res.render('forms/add', { student: null, students });
  });
});

router.get('/add/:sid', (req, res) => {
  const sid = req.params.sid;

  db.query('SELECT StudentID, Name FROM StudentAthlete WHERE StudentID = ?', [sid], (err, result) => {
    if (err) return res.status(500).send('Database error');

    const student = result[0] || null;

    db.query('SELECT StudentID, Name FROM StudentAthlete ORDER BY Name', (err, students) => {
      if (err) return res.status(500).send('Database error');
      res.render('forms/add', { student, students });
    });
  });
});

// ===============================================
// STATUS CALCULATOR
// ===============================================
function computeStatus(ValidFrom, ValidTo) {
  const today = new Date().toISOString().slice(0, 10);

  if (new Date(ValidFrom) > new Date(today)) return 'Pending';
  if (new Date(ValidTo) < new Date(today)) return 'Expired';

  const daysLeft = (new Date(ValidTo) - new Date(today)) / (1000 * 60 * 60 * 24);
  if (daysLeft <= 7) return 'Expiring';

  return 'Approved';
}

// ===============================================
// ADD FORM POST
// ===============================================
router.post('/add', upload.single('FormFile'), (req, res) => {
  const { StudentID, FormType, ValidFrom, ValidTo } = req.body;
  if (!StudentID) return res.status(400).send("StudentID missing from form submission.");

  const status = computeStatus(ValidFrom, ValidTo);
  const filePath = req.file ? `/uploads/forms/${req.file.filename}` : null;

  db.query(
    `INSERT INTO ParticipationForm (StudentID, FormType, ValidFrom, ValidTo, Status, FilePath)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [StudentID, FormType, ValidFrom, ValidTo, status, filePath],
    (err) => {
      if (err) return res.status(500).send('Database error');
      res.redirect(`/forms`);
    }
  );
});

router.post('/add/:sid', upload.single('FormFile'), (req, res) => {
  const StudentID = req.params.sid;
  const { FormType, ValidFrom, ValidTo } = req.body;

  const status = computeStatus(ValidFrom, ValidTo);
  const filePath = req.file ? `/uploads/forms/${req.file.filename}` : null;

  db.query(
    `INSERT INTO ParticipationForm (StudentID, FormType, ValidFrom, ValidTo, Status, FilePath)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [StudentID, FormType, ValidFrom, ValidTo, status, filePath],
    (err) => {
      if (err) return res.status(500).send('Database error');
      res.redirect(`/forms`);
    }
  );
});

// ===============================================
// EDIT FORM PAGES
// ===============================================
router.get('/edit/:id', (req, res) => {
  const id = req.params.id;

  db.query(
    `SELECT f.*, a.Name AS StudentName
     FROM ParticipationForm f
     JOIN StudentAthlete a ON f.StudentID = a.StudentID
     WHERE FormID = ?`,
    [id],
    (err, rows) => {
      if (err) return res.status(500).send('Database error');
      if (!rows.length) return res.status(404).send('Form not found');

      const form = rows[0];

      // Convert MySQL dates to JS Date objects
      form.ValidFrom = form.ValidFrom ? new Date(form.ValidFrom) : null;
      form.ValidTo = form.ValidTo ? new Date(form.ValidTo) : null;

      db.query('SELECT StudentID, Name FROM StudentAthlete ORDER BY Name', (err, students) => {
        if (err) return res.status(500).send('Database error');
        res.render('forms/edit', { form, students });
      });
    }
  );
});


router.post('/edit/:id', upload.single('FormFile'), (req, res) => {
  const id = req.params.id;
  const { StudentID, FormType, ValidFrom, ValidTo } = req.body;

  const status = computeStatus(ValidFrom, ValidTo);
  const filePath = req.file ? `/uploads/forms/${req.file.filename}` : null;

  let sql = `
    UPDATE ParticipationForm 
    SET StudentID=?, FormType=?, ValidFrom=?, ValidTo=?, Status=?
  `;
  const params = [StudentID, FormType, ValidFrom, ValidTo, status];

  if (filePath) {
    sql += `, FilePath=?`;
    params.push(filePath);
  }

  sql += ` WHERE FormID=?`;
  params.push(id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).send('Database error');
    res.redirect(`/forms`);
  });
});

// ===============================================
// DELETE FORM
// ===============================================
router.post('/delete/:id', (req, res) => {
  const id = req.params.id;

  db.query('SELECT * FROM ParticipationForm WHERE FormID = ?', [id], (err, rows) => {
    if (err) return res.status(500).send('Database error');
    if (!rows.length) return res.status(404).send('Form not found');

    const studentID = rows[0].StudentID;

    db.query('DELETE FROM ParticipationForm WHERE FormID = ?', [id], (err) => {
      if (err) return res.status(500).send('Database error');
      res.redirect(`/forms`);
    });
  });
});

module.exports = router;
