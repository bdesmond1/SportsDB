const express = require('express');
const app = express();
const path = require('path');

app.use(express.urlencoded({ extended: true }));

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const studentAthleteCRUD = require('./routes/studentAthlete/studentAthleteRoutes'); // CRUD
const studentAthleteDashboard = require('./routes/studentAthlete/dashboard'); // Dashboard
const recUsersRoutes = require('./routes/recUsers/recuserRoutes'); // CRUD & reports
const recUsersDashboard = require('./routes/recUsers/dashboard'); // Dashboard
const staffRoutes = require('./routes/staff/staffRoutes'); // Staff CRUD
const staffDashboardRoutes = require('./routes/staff/dashboard'); // Staff Dashboard
const sportsAreaRoutes = require('./routes/sportsArea/sportsAreaRoutes');
const sportsAreaDashboardRoutes = require('./routes/sportsArea/dashboard');
const sessionRoutes = require('./routes/sessions/sessionRoutes');
const sessionDashboardRoutes = require('./routes/sessions/dashboard');
const formsRoutes = require('./routes/forms/formsRoutes');
const teamsRoutes = require('./routes/teams/teamRoutes');
const teamsDashboardRoutes = require('./routes/teams/dashboard');

// Mount routes
app.use('/studentAthlete', studentAthleteCRUD);             // CRUD routes
app.use('/studentAthlete/dashboard', studentAthleteDashboard); // Dashboard

app.use('/recusers/dashboard', recUsersDashboard); // mount dashboard first
app.use('/recusers', recUsersRoutes);             // then CRUD

app.use('/staff', staffRoutes);                              // Staff CRUD
app.use('/staff/dashboard', staffDashboardRoutes);   

app.use('/sportsArea/dashboard', sportsAreaDashboardRoutes);
app.use('/sportsArea', sportsAreaRoutes);

app.use('/sessions/dashboard', sessionDashboardRoutes);
app.use('/sessions', sessionRoutes);

app.use('/forms', formsRoutes);

app.use('/teams/dashboard', teamsDashboardRoutes);
app.use('/teams', teamsRoutes);

// Home
app.get('/', (req, res) => {
  res.render('home', { title: 'Home' });
});

// Server
app.listen(3000, () => {
  console.log('✅ Server running at http://localhost:3000');
});
