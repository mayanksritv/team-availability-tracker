# Team Availability Tracker

A responsive, real-time dashboard for managing synthetic team availability.

### Deployed app
https://team-availability-tracker-nk0g.onrender.com/

## Features

- MongoDB-backed team member storage
- Status management: **Available**, **Busy**, **Away**
- REST API for reading and updating member state
- Socket.IO live synchronization between browser clients
- Search by name, role, or timezone
- Status and role filters
- Editable member details
- Dashboard counts for all three availability states
- Responsive desktop/tablet/mobile UI
- Render-friendly server binding and health endpoint

## Project structure

```text
team-availability-tracker/
├── models/
│   └── Member.js
├── public/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── seed-data.json
├── seed.js
└── server.js
```

## 1. Run locally

### Requirements

- Node.js 18+
- MongoDB Atlas account (recommended) or another MongoDB deployment

### Install

```bash
npm install
```

### Configure environment

Create a file named `.env`:

```env
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/team_availability?retryWrites=true&w=majority
PORT=3000
```

### Start

```bash
npm start
```

Open:

```text
http://localhost:3000
```

The server automatically seeds the 40 synthetic members when the database collection is empty.

To reset and re-seed manually:

```bash
npm run seed
```

## 2. REST API

### Get members

```http
GET /api/members
```

Optional query parameters:

```text
?status=Available
?role=Engineering
?search=Member 3
```

### Get statistics

```http
GET /api/stats
```

### Update status

```http
PATCH /api/members/:id/status
Content-Type: application/json

{
  "status": "Busy"
}
```

### Edit member details

```http
PATCH /api/members/:id
Content-Type: application/json

{
  "name": "Team Member 3",
  "role": "Engineering",
  "timezone": "Asia/Kolkata"
}
```

### Health check

```http
GET /api/health
```

## 3. Live synchronization

Socket.IO emits:

```text
members:initial
member:updated
```

Whenever one browser changes a member, the backend updates MongoDB first and broadcasts the updated record. Any connected dashboard receives the change without a page refresh.

## 4. Deploy on Render

1. Push this project to GitHub.
2. On Render, create a **Web Service** from the GitHub repository.
3. Build command:

```text
npm install
```

4. Start command:

```text
npm start
```

5. Add environment variable:

```text
MONGODB_URI = your MongoDB Atlas connection string
```

Render provides the `PORT` variable automatically, so the app uses it when present.

After deployment, open the Render URL and test:

```text
<YOUR_RENDER_URL>/api/health
```

Expected response:

```json
{
  "ok": true,
  "service": "team-availability-tracker"
}
```

Then test the dashboard in two browser tabs. Change one member's status in Tab A and verify that Tab B updates live.

## 5. MongoDB Atlas note

The application only needs access from your deployed server. For a quick student deployment, many people temporarily allow `0.0.0.0/0` in MongoDB Atlas, but this exposes the cluster to connections from any IP and is not ideal for a production system. Use a restricted network configuration where your hosting setup allows it, and never commit the `.env` file.

## 6. Submission proof

### GitHub repository

Add the repository URL here:

```text
GITHUB_REPO_URL: <paste-your-github-repository-url>
```

### Deployed app

Add the Render URL here:

```text
LIVE_APP_URL: <paste-your-render-url>
```

### Suggested submission checks

- [ ] GitHub repository opens successfully
- [ ] Render app opens successfully
- [ ] All 40 synthetic members appear
- [ ] Available / Busy / Away buttons update state
- [ ] MongoDB retains changes after refresh
- [ ] Search and filters work
- [ ] Edit member works
- [ ] Two browser tabs synchronize status changes live
- [ ] `.env` is not committed to GitHub
