from sqlalchemy import event
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.ext.asyncio import async_sessionmaker
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase
from .config import settings



class Base(AsyncAttrs, DeclarativeBase):
    pass



engine = create_async_engine(
    settings.database_url, 
    pool_pre_ping=True
)      

if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine.sync_engine, "connect")
    def _enable_sqlite_fk(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


SessionLocal = async_sessionmaker(
    autocommit=False, 
    autoflush=False, bind=engine,
    expire_on_commit=False
)     