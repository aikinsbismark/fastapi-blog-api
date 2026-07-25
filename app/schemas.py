from fastapi import Form
from pydantic import BaseModel, ConfigDict, Field, EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict
from datetime import datetime
from .models import BlogStatus


class AdminUserCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    username: str
    email_address: EmailStr
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


class UserRead(BaseModel):
    model_config = ConfigDict(extra='ignore')

    id: int
    username: str 


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str


class AuthorBase(BaseModel):
    model_config = ConfigDict(extra='ignore')

    id: int
    username: str
    email_address: EmailStr
    

class AuthorCreate(BaseModel):
    model_config = ConfigDict(extra='ignore')

    username: str
    email_address: EmailStr
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
    model_config = ConfigDict(extra='ignore')

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
    model_config = ConfigDict(extra='ignore')

    user_id: int


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


class Settings(BaseSettings):
    model_config = SettingsConfigDict()

    secret_key: str = Field('SECRET_KEY')
    posts_per_page: int = 10
