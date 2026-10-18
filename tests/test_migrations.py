import json
import os
import tempfile
import unittest
from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

import db_migrate
from migrate_database import migrate_databases
from models import GoalTracker, History, MigrationConflict, Player, User, db


class DatabaseMigrationTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.source_engine = create_engine(
            f"sqlite:///{(self.root / 'source.db').as_posix()}"
        )
        self.target_engine = create_engine(
            f"sqlite:///{(self.root / 'target.db').as_posix()}"
        )
        db.metadata.create_all(self.source_engine)
        db.metadata.create_all(self.target_engine)

    def tearDown(self):
        self.source_engine.dispose()
        self.target_engine.dispose()
        self.temp_dir.cleanup()

    def test_distinct_histories_with_the_same_id_are_preserved_and_rerunnable(self):
        source_session = sessionmaker(bind=self.source_engine)()
        target_session = sessionmaker(bind=self.target_engine)()
        try:
            source_session.add(
                User(username="manager", password="hash", nombre="Manager")
            )
            source_session.add(
                History(
                    id=1,
                    username="manager",
                    player_id="player-1",
                    snapshot='{"overall":90}',
                    created_at="2026-01-01",
                )
            )
            source_session.add(
                History(
                    id=2,
                    username="manager",
                    player_id="player-1",
                    snapshot='{"overall":90}',
                    created_at="2026-01-01",
                )
            )
            source_session.commit()
            target_session.add(
                User(username="manager", password="hash", nombre="Manager")
            )
            target_session.add(
                History(
                    id=1,
                    username="manager",
                    player_id="player-1",
                    snapshot='{"overall":89}',
                    created_at="2025-12-31",
                )
            )
            target_session.commit()
        finally:
            source_session.close()
            target_session.close()

        self.assertEqual(
            migrate_databases(self.source_engine, self.target_engine), 0
        )
        self.assertEqual(
            migrate_databases(self.source_engine, self.target_engine), 0
        )

        check_session = sessionmaker(bind=self.target_engine)()
        try:
            snapshots = check_session.scalars(
                select(History.snapshot).order_by(History.id)
            ).all()
        finally:
            check_session.close()
        self.assertEqual(
            snapshots,
            ['{"overall":89}', '{"overall":90}', '{"overall":90}'],
        )

    def test_matching_history_with_a_different_id_is_not_duplicated(self):
        source_session = sessionmaker(bind=self.source_engine)()
        target_session = sessionmaker(bind=self.target_engine)()
        try:
            source_session.add(
                History(
                    id=7,
                    username="manager",
                    player_id="player-1",
                    snapshot='{"overall":90}',
                    created_at=None,
                )
            )
            source_session.commit()
            target_session.add(
                History(
                    id=3,
                    username="manager",
                    player_id="player-1",
                    snapshot='{"overall":90}',
                    created_at=None,
                )
            )
            target_session.commit()
        finally:
            source_session.close()
            target_session.close()

        self.assertEqual(
            migrate_databases(
                self.source_engine,
                self.target_engine,
                source_identifier="matching-history-test",
            ),
            0,
        )
        self.assertEqual(
            migrate_databases(
                self.source_engine,
                self.target_engine,
                source_identifier="matching-history-test",
            ),
            0,
        )

        check_session = sessionmaker(bind=self.target_engine)()
        try:
            self.assertEqual(check_session.query(History).count(), 1)
        finally:
            check_session.close()

    def test_json_import_includes_legacy_and_account_files_without_duplicates(self):
        data_dir = self.root / "data"
        user_dir = data_dir / "usuarios" / "manager"
        user_dir.mkdir(parents=True)
        (data_dir / "usuarios.json").write_text(
            json.dumps(
                {
                    "admin": {"password": "admin-hash", "nombre": "Admin"},
                    "manager": {"password": "manager-hash", "nombre": "Manager"},
                }
            ),
            encoding="utf-8",
        )
        (user_dir / "jugadores.json").write_text(
            json.dumps([{"id": "player-1", "nombre": "Forward", "custom": 7}]),
            encoding="utf-8",
        )
        (user_dir / "historial.json").write_text(
            json.dumps(
                {
                    "player-1": [
                        {"overall": 90, "_ts": "2026-01-01"},
                        {"overall": 90, "_ts": "2026-01-01"},
                    ]
                }
            ),
            encoding="utf-8",
        )
        (data_dir / "jugadores.json").write_text(
            json.dumps([{"id": "legacy-player", "nombre": "Legacy"}]),
            encoding="utf-8",
        )
        (data_dir / "tecnicos.json").write_text(
            json.dumps([{"id": "coach-1", "nombre": "Coach"}]),
            encoding="utf-8",
        )

        previous_base_dir = db_migrate.BASE_DIR
        previous_database_url = os.environ.get("DATABASE_URL")
        db_migrate.BASE_DIR = data_dir
        os.environ["DATABASE_URL"] = f"sqlite:///{(self.root / 'json.db').as_posix()}"
        try:
            db_migrate.migrate()
            db_migrate.migrate()
        finally:
            db_migrate.BASE_DIR = previous_base_dir
            if previous_database_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous_database_url

        json_engine = create_engine(
            f"sqlite:///{(self.root / 'json.db').as_posix()}"
        )
        check_session = sessionmaker(bind=json_engine)()
        try:
            self.assertEqual(check_session.query(User).count(), 2)
            self.assertEqual(check_session.query(Player).count(), 2)
            self.assertEqual(check_session.query(History).count(), 2)
            player = check_session.get(Player, ("manager", "player-1"))
            self.assertEqual(json.loads(player.data)["custom"], 7)
        finally:
            check_session.close()
            json_engine.dispose()

    def test_json_import_restores_scorers_over_an_empty_destination(self):
        data_dir = self.root / "scorer-data"
        user_dir = data_dir / "usuarios" / "manager"
        user_dir.mkdir(parents=True)
        (data_dir / "usuarios.json").write_text(
            json.dumps(
                {
                    "manager": {
                        "password": "manager-hash",
                        "nombre": "Manager",
                    }
                }
            ),
            encoding="utf-8",
        )
        scorers = {
            "delanteros": [{"id": "player-1", "nombre": "Forward", "goles_base": 12}],
            "estrella_id": "player-1",
            "historial_partidos": [],
            "temporadas_archivadas": [],
        }
        (user_dir / "goleadores.json").write_text(
            json.dumps(scorers),
            encoding="utf-8",
        )

        target_url = f"sqlite:///{(self.root / 'scorer-target.db').as_posix()}"
        target_engine = create_engine(target_url)
        db.metadata.create_all(target_engine)
        target_session = sessionmaker(bind=target_engine)()
        try:
            target_session.add(
                User(
                    username="manager",
                    password="manager-hash",
                    nombre="Manager",
                    created="",
                    pregunta=None,
                    respuesta=None,
                )
            )
            target_session.add(
                GoalTracker(
                    username="manager",
                    data=json.dumps(
                        {
                            "delanteros": [],
                            "historial_partidos": [],
                            "temporadas_archivadas": [],
                        }
                    ),
                )
            )
            target_session.commit()
        finally:
            target_session.close()
            target_engine.dispose()

        previous_base_dir = db_migrate.BASE_DIR
        previous_database_url = os.environ.get("DATABASE_URL")
        db_migrate.BASE_DIR = data_dir
        os.environ["DATABASE_URL"] = target_url
        try:
            db_migrate.migrate()
            db_migrate.migrate()
        finally:
            db_migrate.BASE_DIR = previous_base_dir
            if previous_database_url is None:
                os.environ.pop("DATABASE_URL", None)
            else:
                os.environ["DATABASE_URL"] = previous_database_url

        check_engine = create_engine(target_url)
        check_session = sessionmaker(bind=check_engine)()
        try:
            tracker = check_session.get(GoalTracker, "manager")
            self.assertEqual(json.loads(tracker.data), scorers)
        finally:
            check_session.close()
            check_engine.dispose()

    def test_conflicting_player_data_is_archived_without_overwriting_destination(self):
        source_session = sessionmaker(bind=self.source_engine)()
        try:
            source_session.add(
                User(username="manager", password="hash", nombre="Manager")
            )
            source_session.add(
                Player(
                    username="manager",
                    id="player-1",
                    data='{"id":"player-1","overall":91}',
                )
            )
            source_session.commit()
        finally:
            source_session.close()

        target_session = sessionmaker(bind=self.target_engine)()
        try:
            target_session.add(
                User(username="manager", password="hash", nombre="Manager")
            )
            target_session.add(
                Player(
                    username="manager",
                    id="player-1",
                    data='{"id":"player-1","overall":90}',
                )
            )
            target_session.commit()
        finally:
            target_session.close()

        self.assertEqual(
            migrate_databases(
                self.source_engine,
                self.target_engine,
                source_identifier="conflicting-player-test",
            ),
            1,
        )

        check_session = sessionmaker(bind=self.target_engine)()
        try:
            player = check_session.get(Player, ("manager", "player-1"))
            self.assertEqual(player.data, '{"id":"player-1","overall":90}')
            conflict = check_session.query(MigrationConflict).one()
            self.assertEqual(
                json.loads(conflict.source_data)["data"],
                '{"id":"player-1","overall":91}',
            )
            self.assertEqual(
                json.loads(conflict.target_data)["data"],
                '{"id":"player-1","overall":90}',
            )
        finally:
            check_session.close()


if __name__ == "__main__":
    unittest.main()
