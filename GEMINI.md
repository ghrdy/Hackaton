# Annuaire Alumni - Project Context

## Architecture: Option B (Strapi)

### 1. Stack Technique
- **Frontend:** Next.js (TypeScript, Tailwind CSS) -> Located in `apps/web`
- **Backend / CMS:** Strapi (Headless CMS) -> Located in `apps/cms`
- **Database:** SQLite (Local Dev), PostgreSQL (Production/Railway)
- **Asset Storage:** Cloudflare R2
- **Scraping:** Bright Data via Python/Node scripts -> Located in `scripts/scraping`

### 2. Functional Requirements
- **Public Site:**
    - List of alumni (Grid/List view)
    - Filters: Promotion, Sector, City, Company
    - Search bar
    - Detailed profile view
    - Responsive Design
- **Back-office:**
    - Admin interface for Alumni management
    - CRUD operations for Alumni
    - Photo upload
    - Secure access
- **Data Source:**
    - LinkedIn Scraping (Bright Data)
    - Manual entry

### 3. Workflow
- **Development:** Monorepo structure.
- **Deployment:** Vercel (Frontend), Railway/VPS (Strapi).

### 4. Directives
- Adhere to "Option B" constraints from `Vision_Technique.pdf`.
- Prioritize "Simplicity, Performance, Controlled Costs".
