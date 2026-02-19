# Annuaire Alumni

## Project Structure
- **apps/web**: Next.js frontend (TypeScript, Tailwind)
- **apps/cms**: Strapi backend (Headless CMS)
- **scripts/scraping**: Scraping scripts location

## Getting Started

### 1. Backend (CMS)
Start the Strapi server (Admin Panel):
```bash
cd apps/cms
npm run develop
```
- **Admin URL:** http://localhost:1337/admin
- **API URL:** http://localhost:1337/api

### 2. Frontend (Web)
Start the Next.js development server:
```bash
cd apps/web
npm run dev
```
- **Site URL:** http://localhost:3000

## Architecture
See `GEMINI.md` and `docs/` for detailed architectural decisions (Option B).
