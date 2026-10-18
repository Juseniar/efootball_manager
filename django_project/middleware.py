from django_project.database import database_app
from models import db


class SqlAlchemyContextMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        with database_app.app_context():
            try:
                return self.get_response(request)
            finally:
                db.session.remove()


class NoCacheMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path in ("/", "/login") or request.path.startswith("/api/"):
            response["Cache-Control"] = (
                "no-store, no-cache, must-revalidate, max-age=0"
            )
            response["Pragma"] = "no-cache"
            response["Expires"] = "0"
        return response
