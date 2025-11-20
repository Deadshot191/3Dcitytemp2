from typing import Optional, List
from datetime import datetime
from beanie import Document
from pydantic import BaseModel, Field
from enum import Enum

from app.models.location import LocationEmbedded, LocationResponse
from app.models.road import RoadEmbedded, RoadResponse

class ModelType(str, Enum):
    """Project model types"""
    PLANNING = "planning"
    CORPORATE = "corporate"

class Project(Document):
    """Project database model with embedded locations and roads"""
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    model_type: ModelType = ModelType.PLANNING
    sectors: Optional[List[str]] = None
    theme: Optional[str] = None
    user_id: str = Field(..., index=True)  # Reference to User._id
    
    # Embedded locations and roads
    locations: List[LocationEmbedded] = Field(default_factory=list)
    roads: List[RoadEmbedded] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    
    class Settings:
        name = "projects"
        indexes = [
            "user_id",
        ]

class ProjectCreate(BaseModel):
    """Schema for creating a project with generation"""
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    model_type: ModelType = ModelType.PLANNING
    sectors: List[str] = Field(..., min_length=1)  # Required for generation
    theme: Optional[str] = None

class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    name: Optional[str] = None
    description: Optional[str] = None
    sectors: Optional[List[str]] = None
    theme: Optional[str] = None

class ProjectResponse(BaseModel):
    """Schema for project response with embedded data"""
    id: str
    name: str
    description: str
    model_type: ModelType
    sectors: Optional[List[str]] = None
    theme: Optional[str] = None
    user_id: str
    locations: List[LocationResponse] = []
    roads: List[RoadResponse] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
