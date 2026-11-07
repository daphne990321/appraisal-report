"""資料庫命名慣例（NAMING_CONVENTION）產生的名稱。

除了檢查共用 metadata 的測試，每個測試都用自己的 MetaData。
檢查共用 metadata 的測試會暫時在它裡面加入探測表，測試結束時移除。
"""

from collections.abc import Iterator

import pytest
from sqlalchemy import (
    CheckConstraint,
    Column,
    ForeignKeyConstraint,
    Index,
    Integer,
    MetaData,
    Table,
    Text,
    UniqueConstraint,
)

from appraisal.db import NAMING_CONVENTION, Base

SHARED_OFFICES_TABLE = "naming_probe_offices"
SHARED_ORDERS_TABLE = "naming_probe_orders"


def test_index_unique_foreign_key_check_and_primary_key_names_use_project_prefixes() -> None:
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    Table("offices", metadata, Column("id", Integer, primary_key=True))

    foreign_key = ForeignKeyConstraint(["office_id"], ["offices.id"])
    unique = UniqueConstraint("office_id", "order_no")
    # 檢查約束必須明確命名，convention 中的 constraint_name 才有值。
    check = CheckConstraint("amount > 0", name="amount_positive")
    orders = Table(
        "orders",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("office_id", Integer, nullable=False),
        Column("order_no", Integer, nullable=False),
        Column("amount", Integer, nullable=False),
        foreign_key,
        unique,
        check,
    )
    index = Index(None, orders.c.office_id)

    assert orders.primary_key.name == "pk_orders", "primary key should use the pk_ prefix"
    assert index.name == "ix_orders_office_id", "index should use the ix_ prefix"
    assert unique.name == "uq_orders_office_id_order_no", (
        "unique constraint should use the uq_ prefix"
    )
    assert foreign_key.name == "fk_orders_office_id_offices", (
        "foreign key should use the fk_ prefix"
    )
    assert check.name == "ck_orders_amount_positive", "check constraint should use the ck_ prefix"


def test_multi_column_names_list_every_column_in_declared_order() -> None:
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    unique = UniqueConstraint("office_id", "case_no")
    cases = Table(
        "cases",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("office_id", Integer, nullable=False),
        Column("case_no", Text, nullable=False),
        Column("status", Text, nullable=False),
        unique,
    )
    forward = Index(None, cases.c.office_id, cases.c.status)
    backward = Index(None, cases.c.status, cases.c.office_id)

    assert unique.name == "uq_cases_office_id_case_no", (
        "unique name should list both columns in order"
    )
    assert forward.name == "ix_cases_office_id_status", "index name should list columns in order"
    assert backward.name == "ix_cases_status_office_id", (
        "index name should follow the declared column order"
    )


@pytest.fixture
def shared_naming_probe() -> Iterator[Table]:
    """在共用的 Base.metadata 中定義一組探測表；測試結束時移除，不留下任何資料表。"""
    offices = Table(SHARED_OFFICES_TABLE, Base.metadata, Column("id", Integer, primary_key=True))
    orders = Table(
        SHARED_ORDERS_TABLE,
        Base.metadata,
        Column("id", Integer, primary_key=True),
        Column("office_id", Integer, nullable=False),
        Column("order_no", Integer, nullable=False),
        Column("amount", Integer, nullable=False),
        ForeignKeyConstraint(["office_id"], [f"{SHARED_OFFICES_TABLE}.id"]),
        UniqueConstraint("office_id", "order_no"),
        CheckConstraint("amount > 0", name="amount_positive"),
    )
    Index(None, orders.c.office_id)
    try:
        yield orders
    finally:
        Base.metadata.remove(orders)
        Base.metadata.remove(offices)

    leftover = {SHARED_OFFICES_TABLE, SHARED_ORDERS_TABLE} & set(Base.metadata.tables)
    assert not leftover, f"probe tables should not remain in the shared metadata: {leftover!r}"


def test_shared_metadata_applies_naming_convention_to_every_constraint_kind(
    shared_naming_probe: Table,
) -> None:
    orders = shared_naming_probe
    foreign_key = next(c for c in orders.constraints if isinstance(c, ForeignKeyConstraint))
    unique = next(c for c in orders.constraints if isinstance(c, UniqueConstraint))
    check = next(c for c in orders.constraints if isinstance(c, CheckConstraint))
    index = next(iter(orders.indexes))

    assert orders.primary_key.name == "pk_naming_probe_orders", (
        "shared metadata primary key should use the pk_ prefix"
    )
    assert index.name == "ix_naming_probe_orders_office_id", (
        "shared metadata index should use the ix_ prefix"
    )
    assert unique.name == "uq_naming_probe_orders_office_id_order_no", (
        "shared metadata unique constraint should use the uq_ prefix"
    )
    assert foreign_key.name == "fk_naming_probe_orders_office_id_naming_probe_offices", (
        "shared metadata foreign key should use the fk_ prefix"
    )
    assert check.name == "ck_naming_probe_orders_amount_positive", (
        "shared metadata check constraint should use the ck_ prefix"
    )
