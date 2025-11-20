from typing import Optional, List
from pydantic import BaseModel, Field

class LocationPosition(BaseModel):
    """3D Position coordinates"""
    x: float
    y: float
    z: float
    
    @classmethod
    def from_list(cls, position: List[float]):
        """Create from list [x, y, z]"""
        return cls(x=position[0], y=position[1], z=position[2])
    
    def to_list(self) -> List[float]:
        """Convert to list format"""
        return [self.x, self.y, self.z]

class LocationEmbedded(BaseModel):
    """Embedded Location model (no separate document)"""
    id: str  # Generated unique ID within project
    name: str
    type: str  # e.g., 'Building', 'Hospital', 'Park'
    position: LocationPosition
    description: Optional[str] = None
    color: Optional[str] = "#60a5fa"
    zone: Optional[str] = None
    
    class Config:
        from_attributes = True

class LocationResponse(BaseModel):
    """Schema for location response"""
    id: str
    name: str
    type: str
    position: List[float]
    description: Optional[str] = None
    color: Optional[str] = None
    zone: Optional[str] = None
    
    class Config:
        from_attributes = True
