# CHCKNSPC-97 Railway Staging Implementation

## Goal

Create a staging environment from the `dev` branch and share working links with the team and teacher.

This task is about deployment links only. The `history` and `allergies` screens currently depend on backend routes that are not mounted yet, so those modules should be handled by the frontend/backend owners.

## Services

| Layer | Platform | Source directory | Branch | Required public link |
| --- | --- | --- | --- | --- |
| Frontend | Vercel | `frontend` | `dev` | Yes |
| Backend API | Railway | `backend` | `dev` | Yes |
| Database | Supabase | n/a | n/a | No |
| AI service | Railway | separate AI service/repo if available | `dev` | Usually no |

Note: the project plan says Railway, not Ruby on Rails.

## Railway Backend Setup

1. Create a Railway service from this GitHub repository.
2. Set the service root directory to `backend`.
3. Deploy from branch `dev`.
4. Use the start command from `backend/railway.json`: `npm start`.
5. Configure these environment variables:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<supabase-postgres-connection-string>
FRONTEND_URL=<vercel-staging-url>
```

Optional variables should only be added when the matching service is ready:

```env
AI_SERVICE_URL=<railway-internal-ai-url>
REDIS_URL=<railway-redis-url>
JWT_ACCESS_SECRET=<strong-secret>
JWT_REFRESH_SECRET=<strong-secret>
```

6. Verify:

```bash
curl https://<railway-backend-url>/health
```

Expected response:

```json
{ "status": "ok" }
```

## Vercel Frontend Setup

1. Create a Vercel project from this GitHub repository.
2. Set the root directory to `frontend`.
3. Deploy from branch `dev`.
4. Configure:

```env
VITE_API_URL=https://<railway-backend-url>/api/v1
VITE_APP_NAME=MedAssist AI
VITE_APP_VERSION=1.0.0-staging
```

5. Build command: `npm run build`.
6. Output directory: `dist`.
7. Verify the frontend opens and calls the backend without CORS errors.

## Known Pending Items

- `frontend/src/pages/MedicalHistory.jsx` calls `/history`, but backend currently does not mount a history route.
- `frontend/src/pages/Allergies.jsx` calls `/allergies`, but backend currently does not mount an allergies route.
- `frontend/src/pages/MedicalHistory.jsx` and `frontend/src/pages/Allergies.jsx` import `Modal`, but the common `Modal` component is not present in the current frontend component list.
- These are KHOA/HA implementation items and should not block sending the staging links for available deployed services.

## Message Template

```text
Em gui link staging MedAssist:

Frontend: <vercel-staging-url>
Backend health: <railway-backend-url>/health
Backend API base: <railway-backend-url>/api/v1

Ghi chu:
- Staging deploy tu branch dev.
- Backend chay tren Railway, frontend chay tren Vercel, database dung Supabase.
- Module history/allergies dang cho FE/BE hoan thien endpoint neu test phan do chua chay du.
```

## Acceptance Checklist

- [ ] Railway backend deployment succeeds.
- [ ] `GET /health` returns `{ "status": "ok" }`.
- [ ] Vercel frontend deployment succeeds.
- [ ] `VITE_API_URL` points to the Railway backend `/api/v1`.
- [ ] Backend `FRONTEND_URL` points to the Vercel frontend URL.
- [ ] Links are sent to the team and teacher.
