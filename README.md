# Android-Based Student Clearance System with O'Level Verification

Multi-departmental clearance automation for Taraba State University (Dept. of Computer Science) with automated O'Level credential verification (WAEC / NECO / NABTEB).

## Architecture

Three-tier client-server architecture:

```
Client Layer   Android app (Kotlin)  +  Admin web dashboard (React/Bootstrap)
App Layer      Node.js (Express) REST API  +  Swagger docs
Data Layer     MySQL (production)  /  SQLite (local dev fallback)
```

## Repository Layout

```
├── android/          Android Studio project (Kotlin) — student app
├── backend/          Express REST API (JWT auth, RBAC)
├── database/         MySQL schema + seed (authoritative production DB)
└── docs/             Technical blueprint
```

## Sprint 1 — Delivered

- [x] Android Studio project structure + git repository
- [x] MySQL schema & seed data (deploy under `database/`)
- [x] User Authentication API (JWT-based register/login), RBAC roles
      (STUDENT / OFFICER / ADMIN), Swagger at `/api-docs`

Environment note: MySQL server is not required for local development — the
backend automatically uses a file-based SQLite DB (`DB_DRIVER=sqlite`). Set
`DB_DRIVER=mysql` to use the production MySQL schema.

## Backend Setup

Prerequisites: Node.js >= 18

```bash
cd backend
npm install

# optional: point at a real MySQL (production)
#   copy .env.example -> .env, set DB_DRIVER=mysql and credentials
#   then load database/schema.sql + database/seed.sql into MySQL

npm start
```

The API then runs at http://localhost:5000 — live Swagger docs at
http://localhost:5000/api-docs

### Seed account credentials

| Account            | Login                                   | Password         |
| ------------------ | --------------------------------------- | ---------------- |
| Admin              | `admin@tsuniversity.edu.ng`             | `Password123!`   |
| Library Officer    | `library.officer@tsuniversity.edu.ng`   | `Password123!`   |
| Bursary Officer    | `bursary.officer@tsuniversity.edu.ng`   | `Password123!`   |
| Student Affairs Of.| `affairs.officer@tsuniversity.edu.ng`   | `Password123!`   |
| Registry Officer   | `registry.officer@tsuniversity.edu.ng`  | `Password123!`   |

> The MySQL `seed.sql` ships pre-hashed bcrypt values. SQLite dev DBs start
> blank and seed only the 5 departments; create a student account via the API.

## API Endpoints

| Method | Endpoint               | Auth        | Purpose                          |
| ------ | ---------------------- | ----------- | -------------------------------- |
| GET    | `/api/health`          | public      | Server health + active DB driver |
| GET    | `/api/departments`     | public      | Clearance departments (ordered)  |
| POST   | `/api/auth/register`   | public      | Student onboarding               |
| POST   | `/api/auth/login`      | public      | Login by email OR matric number  |
| GET    | `/api/auth/me`         | Bearer JWT  | Current user profile             |

## Testing with Postman

1. Import the collection from the Swagger UI (or build requests manually).
2. **Health** — `GET /api/health` → `{"status":"ok","driver":"sqlite"}`.
3. **Departments** — `GET /api/departments` → array of 5 units.
4. **Register** — `POST /api/auth/register`:
   ```json
   {
     "matricNo": "2023/12345",
     "fullName": "Aliyu Musa",
     "email": "ali.musa@tsuniversity.edu.ng",
     "departmentId": 1,
     "password": "StrongPass123",
     "level": "400"
   }
   ```
   → `201` with `{ "token": "<jwt>", "user": {...} }`
5. **Login** — `POST /api/auth/login`:
   ```json
   { "identifier": "2023/12345", "password": "StrongPass123" }
   ```
   → `200` with a fresh JWT.
6. **Me** — `GET /api/auth/me` with header `Authorization: Bearer <token>`
   → current user. Omit the header → `401`; wrong-role access → `403`.

## Android App

Open the `android/` folder in Android Studio (Ladybug or newer). Gradle 8.7
wrapper + AGP 8.5.2 will be provisioned on first sync.

- Base URL: `http://10.0.2.2:5000/` (Android emulator loopback to your host).
  For a physical device, change `BASE_URL` in
  `android/app/src/main/java/com/tsunu/clearance/network/ApiClient.kt` to your
  LAN/API address (and use `adb reverse tcp:5000 tcp:5000` as an easy option).
- Screens: LoginActivity, RegisterActivity (department spinner from the API),
  MainActivity (Sprint 3 placeholder for the status tracker).

## Next Sprints (from blueprint)

- **Sprint 2** — O'Level verification UI + verification engine + mock gateway
- **Sprint 3** — Clearance workflow, admin dashboard, document uploads
- **Sprint 4** — Push notifications (FCM) + QR clearance certificate
- **Sprint 5** — E2E testing, TAM usability evaluation, documentation