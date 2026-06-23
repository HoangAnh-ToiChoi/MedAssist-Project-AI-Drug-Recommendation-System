from pydantic import BaseModel, Field
from typing import List, Optional

class Message(BaseModel):
    role: str = Field(..., description="Role of the message author: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="The content of the message")

class ChatRequest(BaseModel):
    messages: List[Message] = Field(..., description="The chat history messages to be sent to the LLM")
    temperature: Optional[float] = Field(0.7, description="Sampling temperature for LLM generation")

class ChatResponse(BaseModel):
    success: bool = Field(..., description="Flag indicating if the call succeeded")
    content: str = Field(..., description="The message response from the AI chatbot")
    provider: str = Field(..., description="The name of the API provider that successfully responded ('gemini', 'groq', 'zhipu', or 'none')")
    error: Optional[str] = Field(None, description="Detailed error message if the call failed")


class GroundedChatTurn(BaseModel):
    role: str = Field(..., description="Conversation role: 'user' or 'assistant'")
    content: str = Field(..., description="Turn content")


class GroundedDisease(BaseModel):
    code: str = Field(..., description="Stable disease code from backend")
    display_name: str = Field(..., description="Human-readable disease name")
    icd10_code: Optional[str] = Field(None, description="Optional ICD-10 code")
    score: float = Field(..., description="Grounded backend disease score")


class GroundedRecommendation(BaseModel):
    name: str = Field(..., description="Recommended drug name from grounded backend output")
    generic_name: Optional[str] = Field(None, description="Optional generic name")
    confidence: float = Field(..., description="Grounded backend confidence score")
    reason: str = Field(..., description="Grounded backend reason for inclusion")
    dosage: Optional[str] = Field(None, description="Optional dosage text already approved by backend")
    contraindications: Optional[str] = Field(None, description="Optional contraindication text from backend")


class GroundingRules(BaseModel):
    provider_must_not_add_new_drugs: bool = Field(
        True,
        description="Provider must not introduce drugs outside the grounded payload",
    )
    provider_must_not_add_new_diseases: bool = Field(
        True,
        description="Provider must not introduce diseases outside the grounded payload",
    )
    provider_must_keep_medical_disclaimer: bool = Field(
        True,
        description="Provider must preserve disclaimer and safety tone",
    )


class QualityCheck(BaseModel):
    status: str = Field(..., description="Heuristic quality result: pass, warn, or fail")
    score: float = Field(..., description="Heuristic grounded quality score between 0 and 1")
    grounded_entity_count: int = Field(..., description="How many grounded entities were reflected in the response")
    grounded_entity_total: int = Field(..., description="How many grounded entities were available for reflection")
    disclaimer_present: bool = Field(..., description="Whether the response preserved a medical disclaimer")
    danger_alert_considered: bool = Field(..., description="Whether the response reflected the current danger alert when present")
    notes: List[str] = Field(default_factory=list, description="Heuristic notes explaining warnings or failures")


class RecommendationExplainRequest(BaseModel):
    specialty: str = Field(..., description="Grounded specialty code")
    matched_symptoms: List[str] = Field(..., description="Grounded matched symptom codes or labels")
    danger_alert: Optional[str] = Field(None, description="Optional backend danger alert text")
    top_diseases: List[GroundedDisease] = Field(
        default_factory=list,
        description="Top grounded disease candidates from backend",
    )
    recommendations: List[GroundedRecommendation] = Field(
        default_factory=list,
        description="Grounded drug recommendations from backend",
    )
    grounding_rules: GroundingRules = Field(
        default_factory=GroundingRules,
        description="Prompt grounding constraints passed through from backend",
    )


class RecommendationExplainResponse(BaseModel):
    success: bool = Field(..., description="Flag indicating if a provider produced a structured explanation")
    provider: str = Field(..., description="The provider used ('gemini', 'groq', 'zhipu', or 'none')")
    summary: str = Field(..., description="Short grounded summary for the recommendation set")
    explanation: str = Field(..., description="Grounded natural-language explanation")
    safety_note: str = Field(..., description="Grounded safety note or disclaimer")
    error: Optional[str] = Field(None, description="Detailed provider or fallback error message")
    quality: Optional[QualityCheck] = Field(None, description="Heuristic grounded quality assessment for this response")


class GroundedChatRequest(BaseModel):
    question: str = Field(..., description="End-user question about the grounded recommendation result")
    specialty: str = Field(..., description="Grounded specialty code")
    matched_symptoms: List[str] = Field(default_factory=list, description="Grounded matched symptoms")
    danger_alert: Optional[str] = Field(None, description="Optional danger alert emitted by backend")
    top_diseases: List[GroundedDisease] = Field(default_factory=list, description="Grounded disease candidates")
    recommendations: List[GroundedRecommendation] = Field(
        default_factory=list,
        description="Grounded recommendation list approved by backend",
    )
    history: List[str] = Field(default_factory=list, description="Relevant grounded chronic conditions")
    allergies: List[str] = Field(default_factory=list, description="Relevant grounded allergy names or ingredients")
    conversation: List[GroundedChatTurn] = Field(
        default_factory=list,
        description="Optional recent conversation turns for a multi-turn chat experience",
    )
    grounding_rules: GroundingRules = Field(
        default_factory=GroundingRules,
        description="Prompt grounding constraints passed through from backend",
    )


class GroundedChatResponse(BaseModel):
    success: bool = Field(..., description="Flag indicating if a provider produced a grounded chat answer")
    provider: str = Field(..., description="The provider used ('gemini', 'groq', 'zhipu', or 'none')")
    answer: str = Field(..., description="Grounded natural-language answer for the user")
    safety_note: str = Field(..., description="Safety note or disclaimer")
    error: Optional[str] = Field(None, description="Detailed provider or fallback error message")
    quality: Optional[QualityCheck] = Field(None, description="Heuristic grounded quality assessment for this response")
