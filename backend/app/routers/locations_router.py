from fastapi import APIRouter, Depends, Query

from app import models
from app.security import get_current_official
from app.services import location

router = APIRouter(prefix="/locations", tags=["Locations"])


@router.get("/search")
def search_locations(
    q: str = Query(..., min_length=2, description="Place name to search, e.g. 'Hassan'"),
    current: models.Official = Depends(get_current_official),
):
    """Worldwide place autocomplete for address fields. Returns real matches
    (city/town/state/country) for any query, anywhere in the world -
    e.g. q=Hassan returns Hassan, Karnataka, India among any other
    same-named places worldwide."""
    return location.search_locations(q)