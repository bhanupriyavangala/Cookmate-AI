from app.schemas.client import ClientBase, ClientCreate, ClientUpdate, ClientRead
from app.schemas.project import ProjectBase, ProjectCreate, ProjectUpdate, ProjectRead
from app.schemas.message import MessageBase, MessageCreate, MessageRead
from app.schemas.conversation import (
    ConversationBase,
    ConversationCreate,
    ConversationUpdate,
    ConversationRead,
    ConversationDetail,
)
from app.schemas.followup import (
    FollowUpRead,
    FollowUpSnoozeInput,
    FollowUpEscalateInput,
    EmployeeDashboardStats,
)
from app.schemas.ai import (
    ConversationAnalysisResponse,
    FollowUpGenerationRequest,
    GeneratedFollowUpResponse,
    SendGeneratedMessageRequest,
)
from app.schemas.project_link import ProjectShareLinkRead, RevokeShareLinkResponse
from app.schemas.portal import (
    PortalProjectResponse,
    PortalMessageCreate,
    PortalMessageItem,
    PortalConversationItem,
)
from app.schemas.contact import (
    ContactBase,
    ContactCreate,
    ContactUpdate,
    ContactRead,
)
from app.schemas.email import (
    EmailSendRequest,
    EmailRead,
    EmailDraftRequest,
    EmailDraftResponse,
    EmailWebhookPayload,
)

__all__ = [
    "ClientBase",
    "ClientCreate",
    "ClientUpdate",
    "ClientRead",
    "ProjectBase",
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectRead",
    "MessageBase",
    "MessageCreate",
    "MessageRead",
    "ConversationBase",
    "ConversationCreate",
    "ConversationUpdate",
    "ConversationRead",
    "ConversationDetail",
    "FollowUpRead",
    "FollowUpSnoozeInput",
    "FollowUpEscalateInput",
    "EmployeeDashboardStats",
    "ConversationAnalysisResponse",
    "FollowUpGenerationRequest",
    "GeneratedFollowUpResponse",
    "SendGeneratedMessageRequest",
    "ProjectShareLinkRead",
    "RevokeShareLinkResponse",
    "PortalProjectResponse",
    "PortalMessageCreate",
    "PortalMessageItem",
    "PortalConversationItem",
    "ContactBase",
    "ContactCreate",
    "ContactUpdate",
    "ContactRead",
    "EmailSendRequest",
    "EmailRead",
    "EmailDraftRequest",
    "EmailDraftResponse",
    "EmailWebhookPayload",
]
