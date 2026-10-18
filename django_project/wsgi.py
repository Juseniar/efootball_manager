import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "django_project.settings")

from django.core.wsgi import get_wsgi_application

from django_project.database import create_tables


create_tables()
application = get_wsgi_application()
