from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user import User, UserCreate, UserLogin, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.api.deps import get_current_user

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """Register a new user"""
    
    # Check if user already exists
    existing_user = await User.find_one(User.email == user_data.email)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=user_data.is_active,
        is_superuser=user_data.is_superuser
    )
    
    # Save to database
    await db_user.insert()
    
    # Convert to response format
    return UserResponse(
        id=str(db_user.id),
        email=db_user.email,
        is_active=db_user.is_active,
        is_superuser=db_user.is_superuser,
        created_at=db_user.created_at
    )

@router.post("/token", response_model=Token)
async def login(credentials: UserLogin):
    """Login and get access token"""
    
    # Find user by email
    user = await User.find_one(User.email == credentials.email)
    
    # Verify credentials
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        is_active=current_user.is_active,
        is_superuser=current_user.is_superuser,
        created_at=current_user.created_at
    )

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)):
    """Logout (client should delete token)"""
    return {"message": "Successfully logged out"}
