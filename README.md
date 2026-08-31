# Sports DB
# SportsDB

SportsDB is a web-based sports management system for organizing student-athletes, teams, staff, facilities, sessions, forms, and scheduling information in one centralized application.

## Features

* Manage student-athlete records
* Create and organize sports teams
* Manage staff information
* Track sports areas and facilities
* Schedule sessions and available time slots
* Upload and manage forms
* Display recommended users
* View, add, edit, and list database records
* Role-specific dashboards
* Server-rendered pages using EJS

## Technologies

* Node.js
* Express.js
* EJS
* JavaScript
* HTML and CSS
* npm
* Database integration
* Git and GitHub

## Project Structure

```text
SportsDB/
├── public/
│   ├── uploads/
│   ├── form.js
│   └── style.css
├── routes/
│   ├── forms/
│   ├── recUsers/
│   ├── sessions/
│   ├── sportsArea/
│   ├── staff/
│   ├── studentAthlete/
│   └── teams/
├── utils/
│   ├── timeSlots.js
│   └── upload.js
├── views/
│   ├── forms/
│   ├── partials/
│   ├── recUsers/
│   ├── sessions/
│   ├── sportsArea/
│   ├── staff/
│   ├── studentAthlete/
│   ├── teams/
│   └── home.ejs
├── app.js
├── connect.js
├── package.json
└── package-lock.json
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/bdesmond1/SportsDB.git
cd SportsDB
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory and add the environment variables required by `connect.js`.

Example:

```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
PORT=3000
```

The exact variable names must match those used inside `connect.js`.

### 4. Start the application

If a start command is defined in `package.json`, run:

```bash
npm start
```

Otherwise, run:

```bash
node app.js
```

Open the following address in your browser:

```text
http://localhost:3000
```

## Main Application Areas

| Area              | Purpose                                       |
| ----------------- | --------------------------------------------- |
| Student Athletes  | Add, view, and update student-athlete records |
| Teams             | Organize teams and team rosters               |
| Staff             | Manage coaches and other staff members        |
| Sports Areas      | Track sports facilities and locations         |
| Sessions          | Manage scheduled activities and sessions      |
| Forms             | Upload and manage forms                       |
| Recommended Users | Display relevant user recommendations         |
| Time Slots        | Support scheduling and availability           |

## Security

Sensitive information should be stored in a local `.env` file and should never be committed to GitHub.

Make sure `.gitignore` contains:

```gitignore
node_modules/
.env
public/uploads/
.DS_Store
```

If uploaded files are intended to remain part of the project, remove `public/uploads/` from the list.

## Future Improvements

* Add secure user authentication
* Introduce role-based permissions
* Improve form validation and error handling
* Add searching, sorting, and filtering
* Add automated tests
* Improve mobile responsiveness
* Deploy the application to a cloud platform

## Author

**Bailey Desmond**

[GitHub Profile](https://github.com/bdesmond1)

