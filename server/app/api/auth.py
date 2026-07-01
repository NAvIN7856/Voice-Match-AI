from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.services.db_service import db_service
from pydantic import BaseModel, Field

router = APIRouter(prefix="/auth", tags=["auth"])

# Configure OAuth2 Password Bearer flow (optional, doesn't throw errors so we can support guest access)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

class UserAuthSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)

class UserResponseSchema(BaseModel):
    id: str
    username: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str
    user: UserResponseSchema

async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Dependency to authenticate request and fetch the current user.
    Supports optional auth (returns None if no token provided).
    Throws 401 if token is provided but invalid/expired.
    """
    if not token:
        return None
        
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token contains no user identification",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    user = db_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return user

@router.post("/register", response_model=TokenSchema)
async def register(data: UserAuthSchema):
    existing = db_service.get_user_by_username(data.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already taken"
        )
        
    hashed = hash_password(data.password)
    user = db_service.create_user(data.username, hashed)
    
    token = create_access_token(data={"sub": user["_id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "username": user["username"]
        }
    }

@router.post("/login", response_model=TokenSchema)
async def login(data: UserAuthSchema):
    user = db_service.get_user_by_username(data.username)
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    token = create_access_token(data={"sub": user["_id"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["_id"],
            "username": user["username"]
        }
    }

@router.get("/me", response_model=UserResponseSchema)
async def get_me(current_user: dict = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required to view this profile",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return {
        "id": current_user["_id"],
        "username": current_user["username"]
    }
