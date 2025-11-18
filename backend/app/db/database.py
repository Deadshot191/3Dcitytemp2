from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# MongoDB client
mongo_client: AsyncIOMotorClient = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global mongo_client
    mongo_client = AsyncIOMotorClient(settings.MONGODB_URL)
    print(f"✅ Connected to MongoDB at {settings.MONGODB_URL}")

async def close_mongo_connection():
    """Close MongoDB connection"""
    global mongo_client
    if mongo_client:
        mongo_client.close()
        print("🔴 MongoDB connection closed")

async def init_db():
    """Initialize database and register models"""
    # Import all models here
    from app.models.user import User
    from app.models.project import Project
    from app.models.location import Location
    from app.models.road import Road
    
    # Initialize Beanie with the models
    await init_beanie(
        database=mongo_client[settings.DATABASE_NAME],
        document_models=[User, Project, Location, Road]
    )
    print(f"✅ Beanie initialized with database: {settings.DATABASE_NAME}")

def get_database():
    """Get database instance"""
    return mongo_client[settings.DATABASE_NAME]