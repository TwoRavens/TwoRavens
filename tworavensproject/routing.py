from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import tworaven_apps.websocket_views.routing

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    'websocket': AuthMiddlewareStack(
        URLRouter(
            tworaven_apps.websocket_views.routing.websocket_urlpatterns
        )
    ),
})
