# Misti Viewer

A delightful, LA soft-vibe viewer dashboard built to read and interact with the `misti-alive` simulator repository.

## Features

- **Diary**: Browse daily diary files as an interactive timeline of hourly chunks.
- **Money**: View daily expense logs with expandable markdown cards.
- **Plan**: Render the current `PLAN.md` with a clean reading layout.
- **Inbox**: Check incoming items in `INBOX.md`.

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and set `SIM_ROOT` to the absolute path of your simulator repository:

   ```env
   SIM_ROOT=C:\Users\iamro\Code\misti-alive
   ```

3. **Run the App (Development)**

   ```bash
   npm run dev
   ```

   The application will be available at [http://localhost:3000](http://localhost:3000).

4. **Build and Serve (Production)**
   First, create an optimized production build:

   ```bash
   npm run build
   ```

   Then, start the production server:

   ```bash
   npm run start
   ```

   **Configuring the Port:**
   By default, the app runs on port 3000. You can configure the port by passing it at runtime:
   - **Windows (PowerShell):** `$env:PORT=8080; npm run start`
     _(for dev: `$env:PORT=8080; npm run dev`)_
   - **Mac/Linux:** `PORT=8080 npm run start`

   Or pass the port argument directly to the script:

   ```bash
   npm run start -- -p 8080
   ```

## Tech Stack

- Next.js (App Router)
- React
- Vanilla CSS (Custom tokens, glassmorphism, responsive)
- Lucide React (Icons)
- Marked (Markdown parsing)
- date-fns (Date formatting)

## API Endpoints

The Next.js backend provides minimal endpoints to serve files from `SIM_ROOT`:

- `GET /api/diary/dates` - Returns list of available diary dates
- `GET /api/diary/:date` - Returns detailed chunks for a specific date
- `GET /api/money/dates` - Returns list of available money dates
- `GET /api/money/:date` - Returns markdown text for a specific date
- `GET /api/plan` - Returns `PLAN.md` text and last modified stat
- `GET /api/inbox` - Returns `INBOX.md` text and last modified stat
