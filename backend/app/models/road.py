from typing import Optional
from pydantic import BaseModel, Field

class RoadEmbedded(BaseModel):
    """Embedded Road model (no separate document)"""
    id: str  # Generated unique ID within project
    from_location: str  # Location ID (embedded location id)
    to_location: str    # Location ID (embedded location id)
    distance: float
    type: str = "main"  # road type: 'main', 'secondary', 'residential'
    
    class Config:
        from_attributes = True

class RoadResponse(BaseModel):
    """Schema for road response"""
    id: str
    from_location: str
    to_location: str
    distance: float
    type: str
    
    class Config:
        from_attributes = True
