import os
from pathlib import Path

from flask import Flask
from models import db
from migrate_database import normalize_database_url


ROOT = Path(__file__).resolve().parent.parent
LOCAL_DATABASE_PATH = ROOT / "instance" / "database.db"
LOCAL_DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)

_database_url = os.environ.get("DATABASE_URL", f"sqlite:///{LOCAL_DATABASE_PATH.as_posix()}")

database_app = Flask("efootball_manager_database")
database_app.config["SQLALCHEMY_DATABASE_URI"] = normalize_database_url(_database_url)
database_app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
database_app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {"pool_pre_ping": True}
db.init_app(database_app)


def create_tables():
    with database_app.app_context():
        db.create_all()
