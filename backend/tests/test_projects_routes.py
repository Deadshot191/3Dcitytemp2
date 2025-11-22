"""Unit tests for project API routes"""
import pytest
from httpx import AsyncClient
from app.models.user import User
from app.models.project import Project, ModelType


class TestProjectGeneration:
    """Test project generation endpoint"""
    
    @pytest.mark.asyncio
    async def test_generate_project_without_token(self, async_client: AsyncClient):
        """Test that project generation fails without JWT token"""
        project_data = {
            "name": "Test City",
            "description": "Test description",
            "model_type": "planning",
            "sectors": ["government", "healthcare"]
        }
        
        response = await async_client.post("/api/projects/generate", json=project_data)
        
        # Should return 401 Unauthorized without token
        assert response.status_code == 401
        assert "Not authenticated" in response.text or "Unauthorized" in response.text
    
    @pytest.mark.asyncio
    async def test_generate_project_with_invalid_token(self, async_client: AsyncClient):
        """Test that project generation fails with invalid JWT token"""
        project_data = {
            "name": "Test City",
            "description": "Test description",
            "model_type": "planning",
            "sectors": ["government", "healthcare"]
        }
        
        headers = {"Authorization": "Bearer invalid_token_12345"}
        response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=headers
        )
        
        # Should return 401 Unauthorized with invalid token
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_generate_project_success(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user: User
    ):
        """Test successful project generation with valid token"""
        project_data = {
            "name": "Test City Planning",
            "description": "A test city with multiple zones",
            "model_type": "planning",
            "sectors": ["government", "healthcare", "education"],
            "theme": "modern"
        }
        
        response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        
        # Should return 201 Created
        assert response.status_code == 201
        
        data = response.json()
        
        # Verify response structure
        assert data["name"] == "Test City Planning"
        assert data["description"] == "A test city with multiple zones"
        assert data["model_type"] == "planning"
        assert data["user_id"] == str(test_user.id)
        
        # Verify locations were generated
        assert "locations" in data
        assert len(data["locations"]) > 0
        
        # Verify roads were generated
        assert "roads" in data
        assert len(data["roads"]) > 0
        
        # Verify each location has required fields
        for location in data["locations"]:
            assert "id" in location
            assert "name" in location
            assert "type" in location
            assert "position" in location
            assert "zone" in location
            assert location["zone"] in project_data["sectors"]
    
    @pytest.mark.asyncio
    async def test_generate_project_without_sectors(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test that project generation fails without sectors"""
        project_data = {
            "name": "Test City",
            "description": "Test description",
            "model_type": "planning",
            "sectors": []  # Empty sectors
        }
        
        response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        
        # Should return 400 Bad Request
        assert response.status_code == 400
    
    @pytest.mark.asyncio
    async def test_generate_corporate_project(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test corporate campus generation"""
        project_data = {
            "name": "Corporate Campus",
            "description": "Modern corporate headquarters",
            "model_type": "corporate",
            "sectors": ["admin", "research", "cafeteria"]
        }
        
        response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify corporate-specific sectors
        assert data["model_type"] == "corporate"
        location_zones = [loc["zone"] for loc in data["locations"]]
        assert "admin" in location_zones or "research" in location_zones


class TestProjectCRUD:
    """Test project CRUD operations"""
    
    @pytest.mark.asyncio
    async def test_list_projects(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user: User
    ):
        """Test listing user's projects"""
        # Create a test project first
        project_data = {
            "name": "My City",
            "description": "Test",
            "model_type": "planning",
            "sectors": ["government"]
        }
        await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        
        # List projects
        response = await async_client.get("/api/projects/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    @pytest.mark.asyncio
    async def test_update_project_owner(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        test_user: User
    ):
        """Test that project owner can update their project"""
        # Create project
        project_data = {
            "name": "Original Name",
            "description": "Original Description",
            "model_type": "planning",
            "sectors": ["government"]
        }
        create_response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Update project
        update_data = {
            "name": "Updated Name",
            "description": "Updated Description"
        }
        response = await async_client.put(
            f"/api/projects/{project_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated Description"
    
    @pytest.mark.asyncio
    async def test_update_project_non_owner(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        auth_headers_user_2: dict,
        test_user: User,
        test_user_2: User
    ):
        """Test that non-owner cannot update project (403 Forbidden)"""
        # User 1 creates project
        project_data = {
            "name": "User 1 Project",
            "description": "Created by user 1",
            "model_type": "planning",
            "sectors": ["government"]
        }
        create_response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # User 2 tries to update
        update_data = {"name": "Hacked Name"}
        response = await async_client.put(
            f"/api/projects/{project_id}",
            json=update_data,
            headers=auth_headers_user_2  # Different user's token
        )
        
        # Should return 403 Forbidden
        assert response.status_code == 403
        assert "Not authorized" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_delete_project_owner(
        self,
        async_client: AsyncClient,
        auth_headers: dict
    ):
        """Test that project owner can delete their project"""
        # Create project
        project_data = {
            "name": "To Delete",
            "description": "This will be deleted",
            "model_type": "planning",
            "sectors": ["government"]
        }
        create_response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # Delete project
        response = await async_client.delete(
            f"/api/projects/{project_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 204
        
        # Verify project is deleted
        get_response = await async_client.get(
            f"/api/projects/{project_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_project_non_owner(
        self,
        async_client: AsyncClient,
        auth_headers: dict,
        auth_headers_user_2: dict
    ):
        """Test that non-owner cannot delete project (403 Forbidden)"""
        # User 1 creates project
        project_data = {
            "name": "Protected Project",
            "description": "Cannot be deleted by others",
            "model_type": "planning",
            "sectors": ["government"]
        }
        create_response = await async_client.post(
            "/api/projects/generate",
            json=project_data,
            headers=auth_headers
        )
        project_id = create_response.json()["id"]
        
        # User 2 tries to delete
        response = await async_client.delete(
            f"/api/projects/{project_id}",
            headers=auth_headers_user_2
        )
        
        # Should return 403 Forbidden
        assert response.status_code == 403
