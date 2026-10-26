# ClientPulse AI

> Full-Stack Client Communication, Deterministic Follow-Up & Secure Client Portal Management Application

ClientPulse AI is a modern SaaS platform designed to streamline client interactions, track project deliverables, log multi-channel conversations, calculate deterministic response SLAs, synthesize AI follow-ups, and provide secure, unguessable project communication links for clients.

---

## Architecture & Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite | Clean, responsive dark-mode SaaS UI, custom CSS design system, modular employee layout & standalone mobile-friendly Client Portal |
| **Backend** | FastAPI + Uvicorn ASGI | High-performance asynchronous REST API with modular routers, CORS middleware, constant-time employee auth, and OpenAPI docs |
| **Database** | PostgreSQL / SQLite + SQLAlchemy 2.0 | Declarative ORM models, foreign-key cascading integrity, automatic SQLite fallback for rapid local dev |
| **AI Layer** | Backend-only Gemini AI REST Service | Context-aware conversation analysis & follow-up draft generation with Pydantic validation & offline fallback |
| **Security** | Unguessable URL-safe tokens & Link Revocation | 43+ character cryptographic tokens for project links; constant-time employee token verification |

---

## Core Entities & Relational Schema

```
┌─────────────────┐       1:N       ┌─────────────────────┐       1:N       ┌─────────────────────┐
│     Client      ├─────────────────┤       Project       ├─────────────────┤  ProjectShareLink   │
│─────────────────│                 │─────────────────────│                 │─────────────────────│
│ id (PK)         │                 │ id (PK)             │                 │ id (PK)             │
│ name, email     │                 │ client_id (FK)      │                 │ project_id (FK)     │
│ company, phone  │                 │ title, description  │                 │ token (unique, idx) │
│ status          │                 │ status, budget      │                 │ is_active (bool)    │
│ is_archived     │                 │ deadline            │                 │ revoked_at          │
│ notes (private) │                 └──────────┬──────────┘                 │ last_accessed_at    │
└────────┬────────┘                            │                            └─────────────────────┘
         │                                     │ 0..1
         │ 1:N                             1:N │
         │         ┌─────────────────────┐     │
         └─────────┤    Conversation     ├─────┘
                   │─────────────────────│
                   │ id (PK)             │
                   │ client_id (FK)      │
                   │ project_id (FK)     │
                   │ subject, channel    │
                   │ status              │
                   └──────────┬──────────┘
                              │ 1:N
                   ┌──────────┴──────────┐
                   │       Message       │
                   │─────────────────────│
                   │ id (PK)             │
                   │ conversation_id(FK) │
                   │ sender_type         │
                   │ sender_name         │
                   │ content, sent_at    │
                   └─────────────────────┘
```

---

## Windows Setup Commands (PowerShell)

### Prerequisites
- **Node.js**: v18+ (tested on v24)
- **Python**: v3.10+ (tested on v3.12)
- **PostgreSQL**: Optional (automatic SQLite fallback if PostgreSQL password is not configured locally)

---

### 1. Backend Setup

Open a PowerShell terminal and run:

```powershell
# Navigate to backend directory
cd c:\Users\LENOVO\Desktop\ClientPluse-AI\backend

# Create Python virtual environment (if not already created)
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Upgrade pip and install dependencies
pip install -r requirements.txt

# Copy environment variables template
Copy-Item .env.example .env

# Start FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend will be active at:
- **API Root**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Frontend Setup

Open a second PowerShell terminal and run:

```powershell
# Navigate to frontend directory
cd c:\Users\LENOVO\Desktop\ClientPluse-AI\frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Frontend will be active at:
- **Employee SaaS App**: [http://localhost:5173/](http://localhost:5173/)
- **Client Communication Portal**: `http://localhost:5173/portal/<token>`

---

### 3. Automated Test Verification

Run all test suites in PowerShell to verify backend security, SLA engine, AI services, and client communication workflows:

```powershell
cd c:\Users\LENOVO\Desktop\ClientPluse-AI\backend

# 1. Complete Employee-to-Client-to-Employee Workflow & Auth Tests (7 tests)
.\.venv\Scripts\python.exe test_client_portal_workflow.py

# 2. Gemini AI Analysis & Follow-up Generation (Mocked & Fallback) (5 tests)
.\.venv\Scripts\python.exe test_ai_service.py

# 3. Deterministic Waiting-Time & SLA Calculations (4 tests)
.\.venv\Scripts\python.exe test_followup.py

# 4. Contact Management Module Tests (CRUD, Validation, Filters) (6 tests)
.\.venv\Scripts\python.exe test_contacts.py

# 5. Core Relational CRUD & Validation Tests (5 tests)
.\.venv\Scripts\python.exe test_crud.py

# 6. Database Integration & Seeding Verification
.\.venv\Scripts\python.exe test_integration.py
```

To verify the frontend TypeScript and production bundle:

```powershell
cd c:\Users\LENOVO\Desktop\ClientPluse-AI\frontend
npm run build
```

---

## Production Deployment Instructions (Windows)

### 1. Backend Production Service
Run Uvicorn with multiple workers behind an ASGI server or Windows Service:

```powershell
cd c:\Users\LENOVO\Desktop\ClientPluse-AI\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### 2. Frontend Production Static Build
Build the optimized static bundle:

```powershell
cd c:\Users\LENOVO\Desktop\ClientPluse-AI\frontend
npm run build
```

The resulting static files in `frontend/dist/` can be served via Nginx, Caddy, or IIS with SPA fallback routing:
- **Route Rule**: Any request matching `/portal/*` or `/*` should serve `/index.html`.

---

## API Endpoints Reference

### Public Client Portal Endpoints (Token-Authenticated, No Employee Account Needed)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/portal/{token}` | Public project milestones & conversation feed (internal notes, budget, and AI analysis strictly shielded) |
| `POST` | `/api/v1/portal/{token}/messages` | Submit client message to project thread and re-evaluate pending actions in SLA engine |

### Project Share Link Management (Employee Only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/projects/{id}/share-link` | Retrieve active communication link for project |
| `POST` | `/api/v1/projects/{id}/share-link` | Generate or rotate unguessable client communication link |
| `POST` | `/api/v1/projects/{id}/share-link/revoke` | Revoke communication link and terminate client access |

### Employee Authentication & Authorization
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/auth/verify` | Verify employee key supplied via `X-Employee-Key` or `Authorization: Bearer <key>` |

### Gemini AI Service (Employee Only)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ai/conversations/{id}/analyze` | Analyzes thread: pending action, responsible party, priority, and next action |
| `POST` | `/api/v1/ai/conversations/{id}/generate-followup` | Drafts tailored follow-up message with tone selection & guidance |
| `POST` | `/api/v1/ai/conversations/{id}/send-generated` | Records reviewed employee follow-up and marks follow-up completed |

### Employee Dashboard & Deterministic Follow-Ups (Employee Only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/followups` | List work queue with live waiting time calculation |
| `GET` | `/api/v1/followups/dashboard` | Aggregated employee KPIs (pending responses, due, overdue, escalated) |
| `POST` | `/api/v1/followups/{id}/snooze` | Snooze follow-up alerts for N days |
| `POST` | `/api/v1/followups/{id}/complete` | Mark follow-up as resolved / completed |
| `POST` | `/api/v1/followups/{id}/escalate` | Escalate follow-up with reason |

### Contacts Directory (Employee Only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/contacts` | List contacts with search (`name`, `company`, `email`, `phone`, `whatsapp`), `preferred_channel`, `consent_status`, and `client_id` filters |
| `POST` | `/api/v1/contacts` | Create a new stakeholder contact linked to client and/or project |
| `GET` | `/api/v1/contacts/{id}` | Retrieve contact profile details with linked client & project |
| `PUT` | `/api/v1/contacts/{id}` | Update contact phone, WhatsApp, channel preference, consent, and notes |
| `DELETE` | `/api/v1/contacts/{id}` | Delete a contact |

### Clients & Projects (Employee Only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/clients` | List clients (filters: `status`, `is_archived`, `search`) |
| `POST` | `/api/v1/clients` | Create a new client |
| `GET` | `/api/v1/clients/{id}` | Retrieve client details (including internal notes) |
| `PUT` | `/api/v1/clients/{id}` | Update client fields |
| `PATCH` | `/api/v1/clients/{id}/archive` | Archive client |
| `PATCH` | `/api/v1/clients/{id}/unarchive` | Restore archived client |
| `DELETE` | `/api/v1/clients/{id}` | Cascade delete client |
| `GET` | `/api/v1/projects` | List projects (filters: `client_id`, `status`, `search`) |
| `POST` | `/api/v1/projects` | Create project linked to client |
| `GET` | `/api/v1/projects/{id}` | Retrieve project details |
| `PUT` | `/api/v1/projects/{id}` | Update project fields |
| `DELETE` | `/api/v1/projects/{id}` | Delete project |

### Conversations & Messages (Employee Only)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/conversations` | List conversation threads |
| `POST` | `/api/v1/conversations` | Start new conversation thread |
| `GET` | `/api/v1/conversations/{id}` | Retrieve conversation with ordered messages |
| `POST` | `/api/v1/conversations/{id}/messages` | Store message with sender and timestamp |

---

## Manual Verification Steps for Contacts Module

1. **Navigate to Contacts**:
   - Open [http://localhost:5173/](http://localhost:5173/) in your browser.
   - Click **Contacts** in the left sidebar navigation.
2. **Review Metrics & Existing Contacts**:
   - Verify KPI cards: *Total Contacts*, *Consent Opted-In*, *WhatsApp Configured*, *Primary Stakeholders*.
   - View demo contacts populated for existing clients (Elena Vance, Liam Patel, Marcus Sterling, Sophia Reyes, Chloe Davenport).
3. **Add a Contact**:
   - Click **+ New Contact**.
   - Select an existing client (e.g. *Nexus Retail Group*). Notice the company automatically populates.
   - Enter name: `Jordan Casey`, email: `jordan.casey@nexusretail.com`, phone: `+1 (555) 901-2345`.
   - Click **Copy Phone** next to WhatsApp number to auto-populate the WhatsApp field.
   - Select Preferred Channel: *WhatsApp*, Consent Status: *Opted In*.
   - Check *Designate as Primary Point of Contact*.
   - Click **Create Contact** and verify the new contact card appears in the list with `PRIMARY` badge.
4. **Test Search & Filtering**:
   - Type `Liam` in the search bar. Verify only Liam Patel appears.
   - Filter by Preferred Channel: `WhatsApp`. Verify only WhatsApp-preferred contacts display.
   - Filter by Consent Status: `Opted In` or select a specific client.
5. **View Profile Details**:
   - Click **View Profile** on any contact card.
   - In the slide-over modal, test clicking the copy icon next to email, phone, or WhatsApp to verify clipboard copying.
6. **Edit Contact**:
   - Click **Edit Profile** or the pencil icon.
   - Modify the WhatsApp number or consent status (e.g., set to *Pending Confirmation*).
   - Save and verify the consent badge updates to yellow *Consent Pending*.
7. **Delete Contact**:
   - Click the red trash icon on a contact card. Confirm the prompt to delete.
   - Verify the contact is removed and the total count updates accordingly.

