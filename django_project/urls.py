from django.http import HttpResponseNotAllowed
from django.urls import path
from django.views.decorators.csrf import csrf_exempt

from django_project import views


def dispatch_methods(**handlers):
    @csrf_exempt
    def dispatch(request, *args, **kwargs):
        handler = handlers.get(request.method)
        if handler is None:
            return HttpResponseNotAllowed(handlers)
        return handler(request, *args, **kwargs)

    return dispatch


urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_page, name="login"),
    path("sw.js", views.service_worker, name="service-worker"),
    path("manifest.json", views.manifest, name="manifest"),
    path("goleadores.js", views.goleadores_js, name="goleadores-js"),
    path("goleadores.css", views.goleadores_css, name="goleadores-css"),
    path("imagenes/<path:path>", views.imagen, name="imagen"),
    path("api/escudos", views.get_escudos, name="escudos"),
    path("api/login-cards", views.get_login_cards, name="login-cards"),
    path("api/health", views.health, name="health"),
    path("api/login", views.api_login, name="api-login"),
    path("api/registro", views.api_registro, name="api-registro"),
    path("api/logout", views.api_logout, name="api-logout"),
    path("api/pregunta", views.api_pregunta, name="api-pregunta"),
    path("api/recuperar", views.api_recuperar, name="api-recuperar"),
    path(
        "api/configurar_pregunta",
        views.api_configurar_pregunta,
        name="api-configurar-pregunta",
    ),
    path("api/me", views.api_me, name="api-me"),
    path(
        "api/jugadores",
        dispatch_methods(GET=views.get_jug, POST=views.post_jug),
        name="jugadores",
    ),
    path(
        "api/jugadores/<str:jid>",
        dispatch_methods(PUT=views.put_jug, DELETE=views.del_jug),
        name="actualizar-jugador",
    ),
    path(
        "api/jugadores/<str:jid>/imagen",
        views.patch_jug_imagen,
        name="actualizar-imagen-jugador",
    ),
    path(
        "api/tecnicos",
        dispatch_methods(GET=views.get_tec, POST=views.post_tec),
        name="tecnicos",
    ),
    path(
        "api/tecnicos/<str:tid>",
        dispatch_methods(PUT=views.put_tec, DELETE=views.del_tec),
        name="actualizar-tecnico",
    ),
    path(
        "api/carpetas",
        dispatch_methods(GET=views.get_car, POST=views.post_car),
        name="carpetas",
    ),
    path(
        "api/carpetas/<str:cid>",
        dispatch_methods(PUT=views.put_car, DELETE=views.del_car),
        name="actualizar-carpeta",
    ),
    path("api/historial/<str:jid>", views.get_hist, name="historial"),
    path(
        "api/prog_historial/<str:jid>",
        dispatch_methods(
            GET=views.get_prog_hist,
            POST=views.post_prog_hist,
        ),
        name="historial-progreso",
    ),
    path(
        "api/plantillas/<str:tid>",
        dispatch_methods(GET=views.get_plt, POST=views.post_plt),
        name="plantilla",
    ),
    path(
        "api/goleadores",
        dispatch_methods(GET=views.get_goleadores, POST=views.post_goleadores),
        name="goleadores",
    ),
    path("api/backup", views.api_backup, name="backup"),
    path("api/versions", views.api_versions, name="versions"),
    path(
        "api/versions/<str:snapshot_id>",
        views.api_version_detail,
        name="version-detail",
    ),
    path(
        "api/versions/<str:snapshot_id>/restore",
        views.api_restore_version,
        name="restore-version",
    ),
    path(
        "api/versions/<str:snapshot_id>/delete",
        views.api_delete_version,
        name="delete-version",
    ),
    path("api/admin/usuarios", views.admin_usuarios, name="admin-usuarios"),
    path(
        "api/admin/reset_pwd",
        views.admin_reset_pwd,
        name="admin-reset-password",
    ),
    path(
        "api/admin/eliminar_usuario",
        views.admin_eliminar_usuario,
        name="admin-eliminar-usuario",
    ),
    path("api/admin/yo", views.admin_yo, name="admin-yo"),
]
