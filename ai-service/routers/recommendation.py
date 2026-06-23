from fastapi import APIRouter

from models.schemas import RecommendationExplainRequest, RecommendationExplainResponse
from services.recommendation_explainer import explain_recommendation_with_fallback

router = APIRouter(prefix="/ai/recommend", tags=["recommendation"])


@router.post("/explain", response_model=RecommendationExplainResponse)
async def explain_recommendation_endpoint(request: RecommendationExplainRequest):
    return await explain_recommendation_with_fallback(request)
