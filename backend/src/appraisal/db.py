"""資料庫基礎：命名慣例、共用 MetaData 與 declarative base、engine 與 sessionmaker 的建立。"""

from typing import Any

from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import (
    AsyncConnection,
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from appraisal.config import Settings

NAMING_CONVENTION: dict[str, str] = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    metadata = metadata


def create_engine(settings: Settings, *, database: str | None = None) -> AsyncEngine:
    # pool_pre_ping：資料庫重新啟動或連線閒置被切斷後，取出連線前先檢查，壞掉就換一條
    return create_async_engine(settings.database_url(database), pool_pre_ping=True)


def create_sessionmaker(
    bind: AsyncEngine | AsyncConnection, **kwargs: Any
) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(bind, expire_on_commit=False, **kwargs)
