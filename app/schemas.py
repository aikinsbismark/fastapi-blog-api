from fastapi import Form
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from datetime import datetime
from .models import BlogStatus


class AdminUserCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    username: str
    email: EmailStr
    password: str


class AdminSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')

    id: int


class AdminUserRead(BaseModel):
    model_config = ConfigDict(extra='ignore')

    id: int
    username: str
    is_superuser: bool


class UserSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')

    id: int
    username: str
    disabled: bool | None = None


class UserCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    username: str
    password: str 
    email: EmailStr


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    image_file: str | None
    image_path: str


class UserPrivate(UserRead):
    email: EmailStr


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=1, max_length=50)
    email: EmailStr | None = Field(default=None, max_length=120)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str


class AuthorBase(BaseModel):
    model_config = ConfigDict(extra='ignore', from_attributes=True)

    id: int
    username: str
    email: EmailStr
    disabled: bool | None = None
    

class AuthorCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    username: str
    email: EmailStr
    password: str


class BlogCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    title: str
    content: str
    status: BlogStatus = BlogStatus.PENDING

        
class BlogPost(BlogCreate):
    model_config = ConfigDict(extra='ignore')
    
    id: int
    author_id: int
    created_at: datetime
    content: str
    status: BlogStatus
    

class BlogUpdate(BaseModel):
    model_config = ConfigDict(extra='ignore')


class CommentCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    parent_id: int | None = None
    content: str = Form(...)


class CommentRead(BaseModel):   
    model_config = ConfigDict(extra='ignore')

    id: int
    parent_id: int | None = None
    blog_id: int
    user_id: int
    content: str
    created_at: datetime
    children: list | None = None


class UserReadBlog(BaseModel):
    model_config = ConfigDict(extra='ignore', from_attributes=True)

    id: int
    title: str
    content: str
    author: AuthorBase
    likes_count: int = 0


class BlogInfoSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')

    title: str
    content: str 


class LikePost(BaseModel):
    pass



class PaginatedBlogsResponse(BaseModel):
    model_config = ConfigDict(extra='ignore')
    
    blogs: list[UserReadBlog]
    total: int
    skip: int
    limit: int
    has_more: bool


class BlogResponse(BlogInfoSchema):
    model_config = ConfigDict(extra='ignore')

    id: int
    author_id: int
    date_posted: datetime
    author: AuthorBase


class ForgotPasswordRequest(BaseModel):
    email: EmailStr = Field(max_length=120)


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)