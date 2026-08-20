"""
Location search service - worldwide place autocomplete
-----------------------------------------------------------------
Backs the "Complete Residential Address" field in Add User (and any other
address field) with a real, free, keyless geocoding lookup against
OpenStreetMap's Nominatim API, so typing a place name like "Hassan"
returns real matches such as "Hassan, Karnataka, India" from anywhere in
the world - not a hardcoded India-only list.

No API key or DEMO_MODE toggle is needed here: Nominatim is a public,
no-signup geocoding service, subject to its usage policy (a descriptive
User-Agent header and a light request rate), which is what this module
enforces server-side so the frontend never has to call it directly.
"""
import logging
from typing import List

import httpx

logger = logging.getLogger("sugamseva.location")

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "SugamSeva-GovDashboard/1.0 (https://github.com/sugamseva)"


def search_locations(query: str, limit: int = 6) -> List[dict]:
    """Look up place names worldwide and return simplified, display-ready
    results, e.g. searching "hassan" returns an entry with
    display_name="Hassan, Karnataka, India"."""
    query = (query or "").strip()
    if len(query) < 2:
        return []

    try:
        resp = httpx.get(
            NOMINATIM_SEARCH_URL,
            params={
                "q": query,
                "format": "jsonv2",
                "addressdetails": 1,
                "limit": limit,
            },
            headers={"User-Agent": USER_AGENT},
            timeout=6,
        )
        resp.raise_for_status()
        results = resp.json()
    except Exception:
        logger.exception("Location search failed for query=%s", query)
        return []

    out = []
    for r in results:
        addr = r.get("address", {})
        place = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("county")
            or r.get("name")
            or r.get("display_name", "").split(",")[0]
        )
        state = addr.get("state")
        country = addr.get("country")
        short_parts = [p for p in [place, state, country] if p]
        out.append(
            {
                "display_name": r.get("display_name"),
                "short_name": ", ".join(dict.fromkeys(short_parts)),
                "lat": r.get("lat"),
                "lon": r.get("lon"),
                "type": r.get("type"),
            }
        )
    return out