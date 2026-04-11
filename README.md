# SDV Chauffeur Dashboard

Dashboard React + Vite + TailwindCSS pour analyser les fichiers `SDV_1.csv`, `SDV_2.csv` et `SDV_3.csv`.

## Stack

- React 19
- Vite 8
- TailwindCSS 4
- Recharts
- Node.js + Express (API OCR/Vision)
- OpenAI API (analyse multimodale image/PDF)

## Regles metier

- `SDV_1.csv` -> `SDV 1` -> `AMARA`
- `SDV_2.csv` -> `SDV 2` -> `BRAHIMA`
- `SDV_3.csv` -> `SDV 3` -> `SORO`
- Annee unique: `2025`
- Parsing manuel des dates FR avec normalisation vers `YYYY-MM-DD`
- Filtrage dynamique par chauffeur, mois, annee, destination et plage de dates
- Navigation globale `dashboard | chauffeur`
- Exports des donnees filtrees en Excel et PDF

## Chargement des donnees

- Les CSV sources restent dans `data/`
- L'application les importe en brut avec `?raw`
- Le module `src/lib/dashboard.js` expose:
  - `parseDateFR()`
  - `loadSDVFiles()`
  - `filterData()`
  - les helpers de formatage et d'agregation KPI
- Les utilitaires `src/utils/` gerent:
  - `computeDashboard.ts`
  - `getMonthlyComparison.ts`
  - `exportExcel.ts`
  - `exportPDF.ts`

## Lancer le projet

1. Installer Node.js 22 ou plus recent
2. Installer les dependances:

```bash
npm install
```

3. Configurer les variables d'environnement backend:

```bash
cp .env.example .env
```

Puis renseigner `OPENAI_API_KEY` dans `.env`.

4. Lancer le front + l'API en meme temps:

```bash
npm run dev:all
```

5. Si besoin, lancer separement:

```bash
# Front
npm run dev

# API Vision (autre terminal)
npm run dev:api
```

6. Generer le build front:

```bash
npm run build
```

## Module Facture IA (Vision)

- Endpoint backend: `POST /api/analyze-invoice`
- Upload supporte: `JPG`, `PNG`, `PDF`
- Extraction retournee:
  - `compagnie`
  - `reference`
  - `quantite`
  - `prix_unitaire`
  - `montant_total_lu`
  - `calcul_verification`
  - `statut_calcul`
- Regle metier appliquee:
  - `calcul_verification = quantite * prix_unitaire`
  - `statut_calcul = "Correct"` ou `"Erreur de calcul sur la facture"`

## Deploiement serveur (resume)

- Build front: `npm run build`
- Servir `dist/` avec Nginx/Apache/Node static
- Deployer aussi l'API Express (`server/index.js`) sur le meme domaine ou sous-domaine
- Si front et API sont sur des domaines differents:
  - adapter CORS dans `server/index.js`
  - adapter le proxy/fetch front
- Variables necessaires en production:
  - `OPENAI_API_KEY`
  - `OPENAI_VISION_MODEL` (optionnel)
  - `PORT` (optionnel)

## Structure utile

- `src/App.jsx`: orchestration de l'etat et du dashboard
- `src/components/`: cartes KPI, filtres, statuts, tableau
- `src/components/Dashboard.tsx`: vue globale + cartes chauffeur cliquables
- `src/components/Charts.tsx`: BarChart, LineChart, PieChart et comparaison mensuelle
- `src/lib/dashboard.js`: parsing CSV, mapping SDV/chauffeur, filtres, metrics
- `src/utils/`: calculs dashboard, comparaison mensuelle, exports
- `data/SDV_1.csv`, `data/SDV_2.csv`, `data/SDV_3.csv`: sources chauffeur

## Fichiers historiques

Le prototype Streamlit precedent est conserve en reference:

- `app.py`
- `requirements.txt`
