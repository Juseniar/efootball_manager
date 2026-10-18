import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("SECRET_KEY", "local-development-only-change-me")
DEBUG = False
ROOT_URLCONF = "django_project.urls"
WSGI_APPLICATION = "django_project.wsgi.application"
ALLOWED_HOSTS = ["*"]
INSTALLED_APPS = []
MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django_project.middleware.SqlAlchemyContextMiddleware",
    "django_project.middleware.NoCacheMiddleware",
]
SESSION_ENGINE = "django.contrib.sessions.backends.signed_cookies"
SESSION_COOKIE_NAME = "session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = bool(os.environ.get("RENDER"))
DEFAULT_CHARSET = "utf-8"
DATA_UPLOAD_MAX_MEMORY_SIZE = 40 * 1024 * 1024
