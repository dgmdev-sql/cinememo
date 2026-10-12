# Cinememo — Movie Watchlist Application

A modern, responsive, and minimalist web application for curating, tracking, and rating your favorite movies. Powered by **Node.js**, **Express**, and the **OMDb API**, Cinememo lets you search real movie metadata, customize your watchlist, and organize films with personal reviews, ratings, and viewing statuses.

![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)
![License](https://img.shields.io/badge/License-ISC-blue.svg)

---

## Features

- **Full CRUD Functionality:**
  - **Create:** Add new films to your watchlist with title, genre, release year, and poster artwork.
  - **Read:** Browse your collection in a responsive card grid with quick actions.
  - **Update:** Edit movie entries on a dedicated editing page with personal notes, ratings, and platform tags.
  - **Delete:** Remove movies with confirmation dialogs.
  - **Quick Toggles:** One-click favorite starring and instant watch status updates (`Want to Watch`, `Watching`, `Watched`).

- **Live OMDb API Integration:**
  - Real-time movie search proxy via server-side endpoints to protect your API key.
  - Interactive title autocomplete dropdown with debounced search.
  - Automatic poster fetching with high-resolution thumbnail upgrades.
  - Auto-fills release year and genre automatically upon selection.

- **Sorting & Filtering:**
  - Filter your collection by genre and watch status.
  - Sort by Title (A-Z, Z-A) or Release Year (Newest, Oldest).

- **Cinematic UI & Experience:**
  - Minimalist, dark-mode-first aesthetic with light/dark/system theme switching.
  - Interactive Movie Details modal for viewing summaries and plot synopses.
  - Accessible, keyboard-navigable custom select dropdowns.

- **Data Persistence & Robust Validation:**
  - Lightweight file-based JSON persistence (`db.js`) that survives server restarts.
  - Auto-seeds starter movies from `movies.example.json` on first run.
  - Server-side and client-side input validation for required fields.

---

## Tech Stack

- **Backend:** Node.js, Express.js
- **Frontend:** HTML5 (semantic layout), Vanilla CSS3 (custom CSS variables & responsive design), Vanilla JavaScript (ES6+ async/await)
- **External API:** [OMDb API](https://www.omdbapi.com/)
- **Configuration:** `dotenv` for secure environment variable management

---

## Getting Started

Follow these steps to set up and run Cinememo on your local machine.

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (version 18+ or 20+ recommended). Check your version:

```bash
node -v
npm -v
```

### 2. Clone the Repository

```bash
git clone https://github.com/dgmdev-sql/cinememo.git
cd cinememo
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory by copying the sample file:

```bash
cp .env.example .env
```

Open `.env` and set your [OMDb API key](https://www.omdbapi.com/apikey.aspx):

```env
OMDB_API_KEY=your_omdb_api_key_here
PORT=3000
```

> **Note:** A free OMDb API key can be obtained instantly at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx). Keep this key inside `.env` — never commit your `.env` file to source control.

### 5. Start the Server

```bash
npm start
```

For development mode:

```bash
npm run dev
```

Open your browser and navigate to:

```
http://localhost:3000
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/movies` | Fetch all saved movies from the watchlist |
| `GET` | `/api/movies/:id` | Fetch a single movie record by ID |
| `POST` | `/api/movies` | Create a new movie entry |
| `PUT` | `/api/movies/:id` | Update an existing movie's details |
| `PATCH` | `/api/movies/:id` | Update individual fields (e.g. `favorite`, `status`) |
| `DELETE` | `/api/movies/:id` | Delete a movie record by ID |
| `GET` | `/api/lookup?s=:query` | Search OMDb API for movie titles (server proxy) |
| `GET` | `/api/detail?i=:imdbId` | Fetch detailed movie info from OMDb by IMDb ID |

---

## Project Structure

```text
cinememo/
├── .env.example          # Environment variables template
├── .gitignore            # Git exclusion rules (ignores secrets & local data)
├── db.js                 # JSON file persistence module (auto-seeding)
├── movies.example.json   # Sample starter movies
├── package.json          # Project metadata & npm dependencies
├── server.js             # Express application and API routes
├── public/               # Client-side static assets
│   ├── index.html        # Main watchlist dashboard
│   ├── edit.html         # Movie edit & review form
│   ├── style.css         # Design system & responsive styles
│   ├── script.js         # Main dashboard interaction logic
│   └── edit.js           # Edit page logic
└── README.md             # Project documentation
```

---

## Security & Privacy Practices

- **Hidden Credentials:** Real API keys are loaded via `process.env.OMDB_API_KEY` through `dotenv`. The `.env` file is ignored by Git to avoid leaking secrets.
- **Server-Side Proxy:** The OMDb API is fetched from the Node.js backend (`/api/lookup` and `/api/detail`) rather than directly from the browser, preventing API key exposure in network inspect tools.
- **Clean Repository:** Academic submission templates, grading rubrics, personal system paths, and temporary backup files are explicitly excluded via `.gitignore`.

---

## Author

**Dominic Marasigan**  
GitHub: [@dgmdev-sql](https://github.com/dgmdev-sql)

---

## License

This project is licensed under the [ISC License](LICENSE).
