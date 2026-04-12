# GEMINI.md - SDV Chauffeur Dashboard

## Project Overview
The **SDV Chauffeur Dashboard** is a logistics performance analysis platform designed for SDV. It provides real-time visualization of driver performance (AMARA, BRAHIMA, SORO) for the year 2025, using CSV-based data ingestion and AI-powered invoice analysis.

- **Frontend:** React 19, Vite 8, TailwindCSS 4, Recharts (for KPIs and charts).
- **Backend:** Node.js + Express (serving an OCR/Vision API via OpenAI).
- **AI Integration:** Uses OpenAI's multimodal models to extract and verify data from invoices (JPG, PNG, PDF).
- **Data Source:** Driver records are stored in `data/SDV_1.csv`, `SDV_2.csv`, and `SDV_3.csv`.

## Building and Running

### Prerequisites
- **Node.js:** Version 22 or higher.
- **Environment:** An `.env` file with `OPENAI_API_KEY` is required for the Vision module.

### Commands
- **Install Dependencies:** `npm install`
- **Development (Both Front & API):** `npm run dev:all`
- **Frontend Only:** `npm run dev`
- **API/Backend Only:** `npm run dev:api`
- **Production Build:** `npm run build`
- **Legacy Prototype:** `streamlit run app.py` (requires Python & `pip install -r requirements.txt`)

## Development Conventions

### Business Logic & Data Mapping
- **Driver Mapping:**
  - `SDV_1.csv` -> **AMARA TRUCK 76**
  - `SDV_2.csv` -> **BRAHIMA TRUCK 45**
  - `SDV_3.csv` -> **SORO TRUCK 52**
- **Multi-Year Support:** The system supports both **2025** (CSV data) and **2026** (imported data).
- **Persistence:** All manually imported data and AI-validated tickets are stored in the browser's local storage and persist across sessions.
- **Date Normalization:** French date formats are parsed and normalized to `YYYY-MM-DD`.

### Architecture & Files
- **`src/lib/dashboard.js`:** The core engine for CSV parsing, filtering, and metric aggregation. Use this for any changes to data processing logic.
- **`src/utils/`:** Contains specialized logic for exports (Excel/PDF) and complex dashboard computations (`computeDashboard.ts`).
- **`server/index.js`:** The Express entry point. It handles file uploads via `multer` and interfaces with OpenAI.
- **TailwindCSS 4:** Uses the new `@tailwindcss/vite` plugin. Styles are primarily in `src/index.css`.

### Coding Standards
- **File Extensions:** The project uses a mix of `.jsx` and `.tsx`. New components should prefer `.tsx` for type safety.
- **Currency:** Financial values are in **CFA**. Use `formatCurrency` from `dashboard.js` for consistent formatting.
- **OCR Validation:** The backend automatically verifies that `quantite * prix_unitaire` matches the `montant_total_lu`.

## Key Files
- `package.json`: Project scripts and dependencies.
- `app.py`: Legacy Streamlit prototype.
- `src/App.jsx`: Main frontend entry point and state management.
- `server/index.js`: Backend Vision API implementation.
- `src/lib/dashboard.js`: Business logic and CSV engine.
