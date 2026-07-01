from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .routers import authors, admin_user, users, blogs, comments, likes
from .core import Base, engine
from contextlib import asynccontextmanager



Base.metadata.create_all(bind=engine)



@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield



app = FastAPI(lifespan=lifespan)

base_dir = Path(__file__).resolve().parent.parent
static_dir = base_dir / "frontend" / "static"
templates_dir = static_dir / "templates"

app.mount("/static", StaticFiles(directory=static_dir), name="static")


@app.get("/", response_class=FileResponse)
async def root() -> FileResponse:
    return FileResponse(templates_dir / "index.html")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon() -> FileResponse:
    return FileResponse(static_dir / "icons" / "favicon.ico")


@app.get("/{page}.html", response_class=FileResponse)
async def html_page(page: str) -> FileResponse:
    path = templates_dir / f"{page}.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Page not found")
    return FileResponse(path)


app.include_router(admin_user.admin_router)
app.include_router(authors.router)
app.include_router(users.router)
app.include_router(blogs.router)
app.include_router(comments.router)
app.include_router(likes.router)




@app.get("/", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse(
        request=request, name="login.html"
    )

@app.get("/", response_class=HTMLResponse)
async def home(request: Request, db: Session = Depends(get_db)):
    posts = db.query(Blog).options(selectinload(Blog.author)).filter(Blog.status==BlogStatus.PUBLISHED).order_by(Blog.created_at.desc()).all()
    return templates.TemplateResponse(
        request=request, name="index.html", context={"request": request, "posts": posts}
    )

@app.get("/", include_in_schema=False)
async def register(request: Request):
    return templates.TemplateResponse(
        request,
        "register.html",
        {"title": "Register"},
    )