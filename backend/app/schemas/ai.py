from typing import Optional, Literal
from datetime import datetime
from pydantic import BaseModel, Field


class ConversationAnalysisResponse(BaseModel):
    conversation_id: int
    pending_action: str = Field(..., min_length=1, description="Identified action item pending resolution")
    who_needs_to_respond: Literal["team", "client", "none"] = Field(..., description="Party responsible for replying")
    response_required: bool = Field(..., description="Whether this conversation requires an active response")
    client_action_completed: bool = Field(False, description="Whether the client has fulfilled the requested deliverable/action")
    expected_response_date: Optional[str] = Field(None, description="Expected date by which response is needed")
    client_was_asked_to_provide: Optional[str] = Field(None, description="Specific deliverable or info requested from the client")
    priority: Literal["low", "medium", "high", "urgent"] = Field(..., description="AI estimated urgency level")
    possible_project_impact: str = Field(..., min_length=1, description="Potential effect on project deliverables/timeline")
    recommended_next_action: str = Field(..., min_length=1, description="Specific recommended response or task")
    ai_source: str = Field("gemini", description="Origin of analysis: 'gemini' or 'local_fallback'")
    analysis_timestamp: datetime = Field(default_factory=datetime.utcnow)


class FollowUpGenerationRequest(BaseModel):
    tone: Optional[Literal["professional", "concise", "friendly", "urgent"]] = "professional"
    instructions: Optional[str] = Field(None, max_length=500, description="Optional extra guidance for draft phrasing")


class GeneratedFollowUpResponse(BaseModel):
    conversation_id: int
    subject: str = Field(..., min_length=1, description="Subject line for the follow-up message")
    message: str = Field(..., min_length=1, description="Draft message text ready for review and edit")
    tone: str = "professional"
    ai_source: str = "gemini"
    confidence_score: Optional[float] = 0.95


class SendGeneratedMessageRequest(BaseModel):
    content: str = Field(..., min_length=1, description="Final reviewed and edited message content")
    sender_name: Optional[str] = Field("ClientPulse Support", max_length=100)
