"""Pytest configuration and shared fixtures"""
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import timedelta

from app.main import app
from app.core.security import create_access_token, get_password_hash
from app.models.user import User
from app.models.project import Project
from app.core.config import settings


@pytest_asyncio.fixture
async def test_db():
    """Initialize test database connection"""
    # Use test database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    test_db_name = "test_city_planner"
    
    # Initialize Beanie with test database
    await init_beanie(
        database=client[test_db_name],
        document_models=[User, Project]
    )
    
    yield
    
    # Cleanup: Drop test database after tests
    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def async_client(test_db) -> AsyncGenerator[AsyncClient, None]:
    """Create async HTTP client for testing"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def test_user(test_db) -> User:
    """Create a test user in the database"""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        is_active=True
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def test_user_2(test_db) -> User:
    """Create a second test user for ownership tests"""
    user = User(
        email="test2@example.com",
        hashed_password=get_password_hash("testpassword123"),
        is_active=True
    )
    await user.insert()
    return user


@pytest.fixture
def auth_token(test_user: User) -> str:
    """Generate JWT token for test user"""
    access_token = create_access_token(
        data={"sub": test_user.email},
        expires_delta=timedelta(minutes=30)
    )
    return access_token


@pytest.fixture
def auth_token_user_2(test_user_2: User) -> str:
    """Generate JWT token for second test user"""
    access_token = create_access_token(
        data={"sub": test_user_2.email},
        expires_delta=timedelta(minutes=30)
    )
    return access_token


@pytest.fixture
def auth_headers(auth_token: str) -> dict:
    """Create authorization headers with JWT token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture
def auth_headers_user_2(auth_token_user_2: str) -> dict:
    """Create authorization headers for second user"""
    return {"Authorization": f"Bearer {auth_token_user_2}"}
