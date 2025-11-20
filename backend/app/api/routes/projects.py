"""
Projects API Routes
Handles project generation and management
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.project import Project, ProjectCreate, ProjectResponse, ModelType
from app.models.user import User
from app.models.location import LocationResponse
from app.models.road import RoadResponse
from app.api.deps import get_current_user
from app.services.project_generator import generate_project_layout

router = APIRouter()


@router.post("/generate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def generate_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new project with procedurally generated city/campus layout
    
    - **name**: Project name
    - **description**: Project description
    - **model_type**: Type of project ('planning' or 'corporate')
    - **sectors**: List of zone types to include in the generation
    - **theme**: Optional theme/style
    """
    
    # Validate sectors based on model type
    if not project_data.sectors or len(project_data.sectors) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one sector must be specified"
        )
    
    try:
        # Generate locations and roads using the generator service
        locations, roads = generate_project_layout(
            model_type=project_data.model_type,
            sectors=project_data.sectors
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating project layout: {str(e)}"
        )
    
    # Create project document with embedded data
    project = Project(
        name=project_data.name,
        description=project_data.description,
        model_type=project_data.model_type,
        sectors=project_data.sectors,
        theme=project_data.theme,
        user_id=str(current_user.id),
        locations=locations,
        roads=roads
    )
    
    # Save to database
    await project.insert()
    
    # Convert to response format
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        model_type=project.model_type,
        sectors=project.sectors,
        theme=project.theme,
        user_id=project.user_id,
        locations=[
            LocationResponse(
                id=loc.id,
                name=loc.name,
                type=loc.type,
                position=loc.position.to_list(),
                description=loc.description,
                color=loc.color,
                zone=loc.zone
            )
            for loc in project.locations
        ],
        roads=[
            RoadResponse(
                id=road.id,
                from_location=road.from_location,
                to_location=road.to_location,
                distance=road.distance,
                type=road.type
            )
            for road in project.roads
        ],
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100
):
    """
    List all projects for the current user
    """
    projects = await Project.find(
        Project.user_id == str(current_user.id)
    ).skip(skip).limit(limit).to_list()
    
    return [
        ProjectResponse(
            id=str(project.id),
            name=project.name,
            description=project.description,
            model_type=project.model_type,
            sectors=project.sectors,
            theme=project.theme,
            user_id=project.user_id,
            locations=[
                LocationResponse(
                    id=loc.id,
                    name=loc.name,
                    type=loc.type,
                    position=loc.position.to_list(),
                    description=loc.description,
                    color=loc.color,
                    zone=loc.zone
                )
                for loc in project.locations
            ],
            roads=[
                RoadResponse(
                    id=road.id,
                    from_location=road.from_location,
                    to_location=road.to_location,
                    distance=road.distance,
                    type=road.type
                )
                for road in project.roads
            ],
            created_at=project.created_at,
            updated_at=project.updated_at
        )
        for project in projects
    ]


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific project by ID
    """
    project = await Project.get(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify ownership
    if project.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this project"
        )
    
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        model_type=project.model_type,
        sectors=project.sectors,
        theme=project.theme,
        user_id=project.user_id,
        locations=[
            LocationResponse(
                id=loc.id,
                name=loc.name,
                type=loc.type,
                position=loc.position.to_list(),
                description=loc.description,
                color=loc.color,
                zone=loc.zone
            )
            for loc in project.locations
        ],
        roads=[
            RoadResponse(
                id=road.id,
                from_location=road.from_location,
                to_location=road.to_location,
                distance=road.distance,
                type=road.type
            )
            for road in project.roads
        ],
        created_at=project.created_at,
        updated_at=project.updated_at
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a project
    """
    project = await Project.get(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Verify ownership
    if project.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this project"
        )
    
    await project.delete()
    return None
