import json
import os
import tempfile
import unittest
from pathlib import Path


TEST_DIRECTORY = tempfile.TemporaryDirectory()
_ORIGINAL_DATABASE_URL = os.environ.get("DATABASE_URL")
_ORIGINAL_DATA_DIR = os.environ.get("DATA_DIR")
TEST_ROOT = Path(TEST_DIRECTORY.name)
os.environ["DATABASE_URL"] = (
    f"sqlite:///{(TEST_ROOT / 'django-backend-test.db').as_posix()}"
)
os.environ["DATA_DIR"] = os.path.join(TEST_DIRECTORY.name, "data")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_project.settings")

import django

django.setup()

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import Client
from django.test.client import encode_multipart
from django_project.database import create_tables, database_app
from models import Coach, Folder, GoalTracker, History, Lineup, Player, ProgHistory, User, db


create_tables()


def tearDownModule():
    with database_app.app_context():
        db.session.remove()
        db.engine.dispose()
    if _ORIGINAL_DATABASE_URL is None:
        os.environ.pop("DATABASE_URL", None)
    else:
        os.environ["DATABASE_URL"] = _ORIGINAL_DATABASE_URL
    if _ORIGINAL_DATA_DIR is None:
        os.environ.pop("DATA_DIR", None)
    else:
        os.environ["DATA_DIR"] = _ORIGINAL_DATA_DIR
    TEST_DIRECTORY.cleanup()


class DjangoBackendTests(unittest.TestCase):
    def setUp(self):
        with database_app.app_context():
            for model in (
                GoalTracker,
                Lineup,
                ProgHistory,
                History,
                Folder,
                Coach,
                Player,
                User,
            ):
                db.session.query(model).delete()
            db.session.commit()
        self.client = Client()

    def register(self):
        response = self.client.post(
            "/api/registro",
            data=json.dumps(
                {"username": "manager", "password": "secret", "nombre": "Manager"}
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)

    def test_django_pages_and_health_endpoint(self):
        self.assertEqual(self.client.get("/").status_code, 302)
        login_page = self.client.get("/login")
        self.assertEqual(login_page.status_code, 200)
        login_page.close()
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(response["X-Application-Framework"], "Django")
        self.assertIn("no-store", response["Cache-Control"])

    def test_login_cards_endpoint_lists_only_public_card_images(self):
        manifest_response = self.client.get("/imagenes/jugadores/cards.json")
        self.assertEqual(manifest_response.status_code, 200)
        manifest_cards = json.loads(b"".join(manifest_response.streaming_content))
        self.assertTrue(manifest_cards)
        self.assertTrue(all(name.endswith(".png") for name in manifest_cards))
        manifest_response.close()
        image_response = self.client.get(f"/imagenes/jugadores/{manifest_cards[0]}")
        self.assertEqual(image_response.status_code, 200)
        image_response.close()

        response = self.client.get("/api/login-cards")
        self.assertEqual(response.status_code, 200)
        cards = response.json()
        self.assertEqual(len(cards), len(manifest_cards))
        self.assertTrue(
            all(card["url"].startswith("/imagenes/jugadores/") for card in cards)
        )
        image_response = self.client.get(cards[0]["url"])
        self.assertEqual(image_response.status_code, 200)
        image_response.close()

    def test_authentication_and_existing_api_routes_use_same_database_schema(self):
        self.register()
        self.assertEqual(
            self.client.get("/api/me").json(),
            {"username": "manager", "nombre": "Manager"},
        )

        created = self.client.post(
            "/api/jugadores",
            data={"nombre": "Delantero"},
        )
        self.assertEqual(created.status_code, 201)
        player_id = created.json()["id"]
        self.assertEqual(len(self.client.get("/api/jugadores").json()), 1)

        boundary = "django-backend-test"
        updated = self.client.put(
            f"/api/jugadores/{player_id}",
            data=encode_multipart(boundary, {"nombre": "Actualizado"}),
            content_type=f"multipart/form-data; boundary={boundary}",
        )
        self.assertEqual(updated.status_code, 200, updated.content)
        self.assertEqual(updated.json()["nombre"], "Actualizado")
        self.assertEqual(
            len(self.client.get(f"/api/historial/{player_id}").json()), 1
        )

        image_boundary = "django-image-test"
        image = SimpleUploadedFile("player.png", b"image-data", "image/png")
        image_response = self.client.patch(
            f"/api/jugadores/{player_id}/imagen",
            data=encode_multipart(image_boundary, {"imagen": image}),
            content_type=f"multipart/form-data; boundary={image_boundary}",
        )
        self.assertEqual(image_response.status_code, 200)
        saved_image = self.client.get(
            image_response.json()["imagen"].split("?")[0]
        )
        self.assertEqual(saved_image.status_code, 200)
        saved_image.close()

        coach = self.client.post("/api/tecnicos", data={"nombre": "Técnico"})
        self.assertEqual(coach.status_code, 201)
        coach_id = coach.json()["id"]
        self.assertEqual(len(self.client.get("/api/tecnicos").json()), 1)
        updated_coach = self.client.put(
            f"/api/tecnicos/{coach_id}",
            data=encode_multipart("django-coach-test", {"nombre": "Actualizado"}),
            content_type="multipart/form-data; boundary=django-coach-test",
        )
        self.assertEqual(updated_coach.status_code, 200)

        folder = self.client.post(
            "/api/carpetas",
            data={"tecnico_id": coach_id, "jugador_id": player_id},
        )
        self.assertEqual(folder.status_code, 201)
        folder_id = folder.json()["id"]
        self.assertEqual(len(self.client.get("/api/carpetas").json()), 1)
        self.assertEqual(
            self.client.put(
                f"/api/carpetas/{folder_id}",
                data={"tecnico_id": coach_id, "jugador_id": player_id},
                content_type="application/x-www-form-urlencoded",
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.delete(f"/api/carpetas/{folder_id}").status_code, 200
        )

        saved_lineup = self.client.post(
            "/api/plantillas/coach-1",
            data=json.dumps({"posiciones": [{"id": player_id}], "dibujos": []}),
            content_type="application/json",
        )
        self.assertEqual(saved_lineup.status_code, 200)
        self.assertEqual(
            self.client.get("/api/plantillas/coach-1").json()["posiciones"],
            [{"id": player_id}],
        )

        progress = self.client.post(
            f"/api/prog_historial/{player_id}",
            data=json.dumps({"overall": 90}),
            content_type="application/json",
        )
        self.assertEqual(progress.status_code, 201)
        self.assertEqual(
            len(self.client.get(f"/api/prog_historial/{player_id}").json()), 1
        )

        self.assertEqual(self.client.get("/api/goleadores").status_code, 200)
        self.assertEqual(
            self.client.post(
                "/api/goleadores",
                data=json.dumps({"delanteros": []}),
                content_type="application/json",
            ).status_code,
            200,
        )

        self.assertEqual(
            self.client.delete(f"/api/tecnicos/{coach_id}").status_code, 200
        )
        deleted = self.client.delete(f"/api/jugadores/{player_id}")
        self.assertEqual(deleted.status_code, 200)
        self.assertEqual(self.client.get("/api/jugadores").json(), [])

        self.assertEqual(self.client.post("/api/logout").json(), {"ok": True})
        login = self.client.post(
            "/api/login",
            data=json.dumps({"username": "manager", "password": "secret"}),
            content_type="application/json",
        )
        self.assertEqual(login.status_code, 200)
        self.assertEqual(login.json()["nombre"], "Manager")
