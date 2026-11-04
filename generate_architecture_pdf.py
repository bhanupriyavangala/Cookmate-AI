import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to dynamically compute and print total page count."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "ClientPulse AI — Architecture & Complete Module Reference Specification")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 558, 742)

        # Footer (all pages)
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL — ClientPulse AI Engineering Architecture Specification")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)

        self.restoreState()


def build_pdf(filename="ClientPulse_AI_Architecture_and_Module_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=60,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    primary_color = colors.HexColor("#1e1b4b")   # Deep Indigo
    accent_color = colors.HexColor("#4f46e5")    # Indigo Accent
    dark_slate = colors.HexColor("#0f172a")      # Text Dark
    body_slate = colors.HexColor("#334155")      # Text Muted
    card_bg = colors.HexColor("#f8fafc")         # Light Card Background
    border_color = colors.HexColor("#e2e8f0")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=accent_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=accent_color,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=dark_slate,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0f172a")
    )

    meta_style = ParagraphStyle(
        'Meta_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#64748b")
    )

    story = []

    # Title Block
    story.append(Paragraph("ClientPulse AI", title_style))
    story.append(Paragraph("Complete System Architecture, Module Workflow, and Technical Specification", subtitle_style))
    story.append(Paragraph("<b>Version:</b> 1.0.0 Production &nbsp;|&nbsp; <b>Author:</b> DeepMind Advanced Agentic Engineering Team &nbsp;|&nbsp; <b>Date:</b> November 2026", meta_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceBefore=8, spaceAfter=14))

    # Executive Summary
    story.append(Paragraph("1. Executive Summary & Purpose", h1_style))
    exec_summary = (
        "<b>ClientPulse AI</b> is a mission-critical, enterprise client communication and follow-up management SaaS platform. "
        "In modern professional service environments (consulting, legal, engineering, agency, software development), "
        "client project deliverables frequently stall because teams lose track of pending requests, deliverables owed by clients, "
        "or urgent blocker inquiries. ClientPulse AI bridges this operational gap by continuously tracking waiting periods, analyzing conversation "
        "intent using Google Gemini AI, calculating deterministic SLA urgency, and enabling employees to review, approve, "
        "and dispatch follow-ups seamlessly across email and self-serve client portals."
    )
    story.append(Paragraph(exec_summary, body_style))

    # Architecture Overview
    story.append(Spacer(1, 4))
    story.append(Paragraph("2. High-Level System Architecture", h1_style))
    story.append(Paragraph(
        "ClientPulse AI utilizes a decoupled modern 3-tier architecture: a reactive Single-Page Application (SPA) frontend, "
        "a high-concurrency asynchronous FastAPI REST backend, and a deterministic relational persistence layer with automated fallback.",
        body_style
    ))

    arch_diagram_text = """
+---------------------------------------------------------------------------------------------------------+
|                                    CLIENTPULSE AI SYSTEM ARCHITECTURE                                   |
+---------------------------------------------------------------------------------------------------------+
|                                                                                                         |
|  [ FRONTEND TIER (Vite + React 18 + TypeScript) ]                     [ PUBLIC CLIENT PORTAL ]          |
|  - Employee Dashboard with real-time SLA metrics                     - Standalone mobile-friendly UI    |
|  - Client, Contact & Project Management Views                        - Zero-login token-based access    |
|  - Two-Way Messaging Thread & AI Follow-Up Modal                     - Two-way project messaging        |
|  - JWT Bearer Authentication Session Storage                         - Internal notes/budgets hidden    |
|                                                                                                         |
|                                         |  HTTPS REST / JSON                                            |
|                                         v                                                               |
|  [ BACKEND API LAYER (FastAPI + Python 3.12 + Uvicorn) ]                                                |
|  +--------------------+---------------------+--------------------+--------------------+                 |
|  | /api/v1/auth       | /api/v1/clients     | /api/v1/projects   | /api/v1/portal     |                 |
|  | - JWT session sign | - CRUD validation   | - Project linking  | - Token validation |                 |
|  | - Password verify  | - Deduplication     | - Token rotation   | - Safe responses   |                 |
|  +--------------------+---------------------+--------------------+--------------------+                 |
|  | /api/v1/followups  | /api/v1/ai          | /api/v1/emails     | /api/v1/contacts   |                 |
|  | - Deterministic SLA| - Gemini Assistant  | - Provider factory | - Channels & phone |                 |
|  | - Snooze/Escalate  | - Tone drafting     | - Inbound webhooks | - Consent & opt-out|                 |
|  +--------------------+---------------------+--------------------+--------------------+                 |
|                                                                                                         |
|  [ BACKGROUND WORKER ENGINE ]                  [ AI TELEMETRY & NLP SERVICE ]                           |
|  - Periodic 60s async evaluation loop          - Google Gemini 1.5 Flash REST API                       |
|  - Fractional day calculation math             - Context synthesis & fallback logic                     |
|                                                                                                         |
|                                         |  SQLAlchemy 2.0 ORM                                           |
|                                         v                                                               |
|  [ PERSISTENCE & STORAGE TIER ]                                                                         |
|  - PostgreSQL (Production Database) <---> SQLite (Autonomous Dev Fallback clientpulse_dev.db)           |
|  - Tables: clients, projects, project_links, conversations, messages, followups, contacts, emails       |
+---------------------------------------------------------------------------------------------------------+
"""
    story.append(Table([[Paragraph(f"<pre>{arch_diagram_text}</pre>", code_style)]],
                       colWidths=[504],
                       style=TableStyle([
                           ('BACKGROUND', (0,0), (-1,-1), card_bg),
                           ('BOX', (0,0), (-1,-1), 1, border_color),
                           ('PADDING', (0,0), (-1,-1), 6),
                       ])))

    story.append(PageBreak())

    # Detailed Module Breakdown
    story.append(Paragraph("3. Detailed Module-by-Module Breakdown", h1_style))
    story.append(Paragraph(
        "Each module in ClientPulse AI was engineered for a specific operational necessity, with concrete data contracts, "
        "security boundaries, and user workflows.", body_style
    ))

    modules = [
        ("Module 1: Employee Authentication & Authorization (/api/v1/auth)",
         "<b>Why it is used:</b> Enterprise systems cannot expose proprietary project metadata, internal deliverables, "
         "client contact databases, or financial budgets to unauthenticated parties or client portal viewers.<br/>"
         "<b>How it works:</b> Employees authenticate using their credentials via <code>POST /api/v1/auth/login</code>. "
         "The backend verifies the password hash, signs a cryptographic JWT access token with an expiration timestamp and employee role, "
         "and issues it to the frontend. The frontend stores this token in secure session storage and injects it as an HTTP "
         "<code>Authorization: Bearer &lt;token&gt;</code> header on all subsequent internal endpoints.<br/>"
         "<b>Key Files:</b> <code>backend/app/api/auth.py</code>, <code>backend/app/core/auth.py</code>, <code>frontend/src/components/auth/EmployeeLoginModal.tsx</code>"),

        ("Module 2: Client & Contact Management (/api/v1/clients & /api/v1/contacts)",
         "<b>Why it is used:</b> Provides a single source of truth for company accounts and multi-stakeholder contacts. "
         "Prevents duplicate company accounts and manages channel preferences (Email, WhatsApp, Phone, Portal).<br/>"
         "<b>How it works:</b> Validates uniqueness of corporate email addresses, enforces international telephone standards, "
         "tracks consent status (<code>opted_in</code>, <code>pending</code>, <code>opted_out</code>) for GDPR/CAN-SPAM compliance, "
         "and associates primary and secondary organizational contacts.<br/>"
         "<b>Key Files:</b> <code>backend/app/models/client.py</code>, <code>backend/app/models/contact.py</code>, <code>frontend/src/views/ClientsView.tsx</code>, <code>frontend/src/views/ContactsView.tsx</code>"),

        ("Module 3: Project Management & Tokenized Portal Links (/api/v1/projects)",
         "<b>Why it is used:</b> Projects house deliverable milestones, budgets, and deadlines. Clients must be able to view and "
         "participate in their projects without creating friction-heavy employee login accounts.<br/>"
         "<b>How it works:</b> Generates cryptographically unguessable URL-safe tokens (e.g. 43-character entropy) linked to each project. "
         "Generating a new link automatically revokes any previous link. Employees can explicitly revoke client links at any time to terminate external access immediately.<br/>"
         "<b>Key Files:</b> <code>backend/app/models/project.py</code>, <code>backend/app/models/project_link.py</code>, <code>frontend/src/components/common/ProjectShareLinkModal.tsx</code>"),

        ("Module 4: Public Client Communication Portal (/api/v1/portal)",
         "<b>Why it is used:</b> Gives clients a responsive, clean, branded view of their active project and previous discussions "
         "on desktop or mobile with zero authentication overhead.<br/>"
         "<b>How it works:</b> Validates the unguessable URL token. If active, serves the project title, description, and message thread. "
         "<b>Privacy Filter:</b> Budgets, internal employee notes, and internal risk scores are strictly excluded from the portal schema. "
         "Clients can submit messages which are stored with <code>sender_type='client'</code> and instantly trigger follow-up SLA recalculations.<br/>"
         "<b>Key Files:</b> <code>backend/app/api/portal.py</code>, <code>backend/app/schemas/portal.py</code>, <code>frontend/src/views/ClientPortalView.tsx</code>"),

        ("Module 5: Deterministic Follow-Up & SLA Engine (app.services.followup_engine)",
         "<b>Why it is used:</b> Human employees forget to check threads when waiting for client approvals. Without an automated SLA tracker, "
         "projects suffer delivery delays and client churn.<br/>"
         "<b>How it works:</b> Calculates waiting time in fractional days between the last relevant message timestamp and <code>now_utc</code>. "
         "Enforces deterministic state transitions:<br/>"
         "&nbsp;&nbsp;&bull; <b>Pending (&lt; 2.0 days):</b> On track. Priority: Low.<br/>"
         "&nbsp;&nbsp;&bull; <b>Due (&gt;= 2.0 days):</b> Recommended follow-up needed. Priority: Medium.<br/>"
         "&nbsp;&nbsp;&bull; <b>Overdue (&gt;= 5.0 days):</b> Client blocker. Priority: High.<br/>"
         "&nbsp;&nbsp;&bull; <b>Escalated (&gt;= 7.0 days):</b> Executive escalation. Priority: Urgent.<br/>"
         "&nbsp;&nbsp;&bull; <b>Snoozed:</b> Temporarily suppressed until a specified date.<br/>"
         "&nbsp;&nbsp;&bull; <b>Completed:</b> Deliverables received and thread resolved.<br/>"
         "<b>Critical Rule:</b> Sending a reminder restarts the waiting period to 0.0 days but does <b>not</b> mark the item completed until client reply is established.<br/>"
         "<b>Key Files:</b> <code>backend/app/services/followup_engine.py</code>, <code>backend/app/models/followup.py</code>"),

        ("Module 6: Google Gemini AI Conversation Analysis & Draft Generator (/api/v1/ai)",
         "<b>Why it is used:</b> Enables employees to comprehend complex multi-turn threads in seconds and draft empathetic, professional, "
         "and highly context-aware reminder messages without manual copywriting.<br/>"
         "<b>How it works:</b> Extracts the complete chronological message history and feeds it to the Gemini 1.5 Flash API with structured JSON output instructions. "
         "Extracts: (1) Pending action, (2) Expected responder, (3) Requested deliverables, (4) Expected response date, (5) True completion status, (6) Project risk impact.<br/>"
         "<b>Safety & Fallback:</b> If no internet or API key is available, an intelligent local rule-based fallback executes automatically without crashing.<br/>"
         "<b>Key Files:</b> <code>backend/app/services/gemini_service.py</code>, <code>backend/app/api/ai.py</code>, <code>frontend/src/components/common/GenerateFollowUpModal.tsx</code>"),

        ("Module 7: Email Service Abstraction & Inbound Webhooks (/api/v1/emails)",
         "<b>Why it is used:</b> Many clients communicate via native email clients rather than portals. The system must support outbound sending "
         "and inbound reply ingestion without coupling to a single email vendor.<br/>"
         "<b>How it works:</b> Features a Provider Abstraction Factory supporting <code>Mock</code> (safe development), <code>SMTP</code>, "
         "<code>Resend</code>, and <code>SendGrid</code>. Inbound replies hit authenticated webhooks (<code>POST /api/v1/emails/webhook/inbound</code>) "
         "which match client email addresses and automatically append incoming responses to conversation threads.<br/>"
         "<b>Key Files:</b> <code>backend/app/services/email/factory.py</code>, <code>backend/app/api/emails.py</code>, <code>frontend/src/components/email/EmailOutboxTab.tsx</code>")
    ]

    for title, desc in modules:
        story.append(Paragraph(title, h2_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # Complete End-to-End Workflow & Business Rules
    story.append(Paragraph("4. Complete End-to-End Operational Workflow", h1_style))
    story.append(Paragraph(
        "The following 14-step sequence illustrates the lifecycle of a client engagement in ClientPulse AI, from onboarding to deliverable confirmation:",
        body_style
    ))

    workflow_steps = [
        ("Step 1: Employee Authentication", "Employee logs into ClientPulse AI with JWT credentials. All client data access is authenticated."),
        ("Step 2: Client Account Creation", "Employee creates client record (Name, Company, Email, Phone). Duplicate emails are blocked."),
        ("Step 3: Project Specification", "Employee sets up project with deliverables, deadline, and financial budget."),
        ("Step 4: Unique Portal Link Generated", "System generates a high-entropy share URL. Internal notes and budgets are kept confidential."),
        ("Step 5: Client Interaction", "Client opens portal on mobile/desktop without an account and posts a kickoff question."),
        ("Step 6: Employee Request Sent", "Employee replies requesting required architecture diagrams and sign-off by Friday."),
        ("Step 7: AI Detects Pending Action", "AI identifies that the client owes deliverables and estimates a 48-hour response window."),
        ("Step 8: Waiting Time Tracking", "Waiting time elapses (e.g. 2.5 days). Follow-up status transitions from 'Pending' to 'Due'."),
        ("Step 9: Employee Alerted on Dashboard", "Dashboard highlights the conversation as a follow-up required item."),
        ("Step 10: AI Follow-Up Generation", "Employee clicks 'Generate Follow-Up'. AI synthesizes a professional draft tailored to the context."),
        ("Step 11: Employee Review & Approval", "Employee reviews, edits, and approves draft. Reminder is logged into thread history."),
        ("Step 12: Waiting Window Restarts", "Waiting time resets to 0.0 days. System remains in pending status awaiting client feedback."),
        ("Step 13: Client Delivers Assets", "Client uploads or messages the requested approval and deliverables into the portal."),
        ("Step 14: Action Resolution", "AI detects completion words ('approved', 'attached'). Employee marks follow-up officially completed.")
    ]

    table_data = [[Paragraph("<b>Phase</b>", body_style), Paragraph("<b>Workflow Description</b>", body_style)]]
    for step_num, step_desc in workflow_steps:
        table_data.append([
            Paragraph(f"<b>{step_num}</b>", body_style),
            Paragraph(step_desc, body_style)
        ])

    wf_table = Table(table_data, colWidths=[150, 354])
    wf_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e0e7ff")),
        ('TEXTCOLOR', (0,0), (-1,0), primary_color),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('PADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, card_bg]),
    ]))
    story.append(wf_table)

    story.append(Spacer(1, 10))
    story.append(Paragraph("5. Database Schema & Relational Model", h1_style))
    db_summary = """
[clients]       id, name, email (unique), company, phone, status, is_archived, notes, timestamps
    |-- 1:N --> [projects]       id, client_id, title, description, status, budget, deadline, timestamps
    |               |-- 1:N --> [project_links]  id, project_id, token (unique), is_active, revoked_at
    |               |-- 1:N --> [conversations]  id, client_id, project_id, subject, channel, status
    |                               |-- 1:N --> [messages]   id, conversation_id, sender_type, content, sent_at
    |                               |-- 1:1 --> [followups]  id, conversation_id, status, priority, days_waiting
    |-- 1:N --> [contacts]       id, client_id, project_id, name, email, phone, preferred_channel, consent
    |-- 1:N --> [email_messages] id, client_id, contact_id, direction, status, idempotency_key, body
"""
    story.append(Table([[Paragraph(f"<pre>{db_summary}</pre>", code_style)]],
                       colWidths=[504],
                       style=TableStyle([
                           ('BACKGROUND', (0,0), (-1,-1), card_bg),
                           ('BOX', (0,0), (-1,-1), 1, border_color),
                           ('PADDING', (0,0), (-1,-1), 6),
                       ])))

    story.append(Spacer(1, 10))
    story.append(Paragraph("6. Production Startup & Operations Guide", h1_style))
    startup_instructions = (
        "<b>Backend Server (Port 8000):</b><br/>"
        "<code>.\\backend\\.venv\\Scripts\\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload</code><br/><br/>"
        "<b>Frontend Development Server (Port 5173):</b><br/>"
        "<code>npm --prefix frontend run dev</code><br/><br/>"
        "<b>Automated Test Suite:</b><br/>"
        "<code>.\\backend\\.venv\\Scripts\\python.exe backend/test_e2e_workflow.py</code><br/><br/>"
        "<b>Demo Employee Sign-in:</b> <code>employee@clientpulse.ai</code> / <code>ClientPulse2026!</code>"
    )
    story.append(Paragraph(startup_instructions, body_style))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {os.path.abspath(filename)}")

if __name__ == "__main__":
    build_pdf()

