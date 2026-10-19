import unittest
from unittest.mock import patch

import start


class LauncherPortTests(unittest.TestCase):
    def test_app_url_uses_the_requested_host(self):
        self.assertEqual(
            start.app_url(start.PORT, start.LAN_HOST),
            "http://192.168.40.3:5000",
        )

    @patch("start.urllib.request.urlopen")
    def test_server_ready_checks_lan_address(self, urlopen):
        response = urlopen.return_value.__enter__.return_value
        response.status = 200
        response.headers.get.return_value = "Django"

        self.assertTrue(start.server_ready(start.PORT))
        urlopen.assert_called_once_with(
            "http://192.168.40.3:5000/api/health", timeout=1
        )

    @patch("start.port_available", return_value=True)
    @patch("start.server_ready", return_value=False)
    def test_starts_on_fixed_port_when_available(
        self, server_ready, port_available
    ):
        self.assertEqual(start.find_available_port(), (start.PORT, True))
        server_ready.assert_called_once_with(start.PORT)
        port_available.assert_called_once_with(start.PORT)

    @patch("start.port_available")
    @patch("start.server_ready", return_value=True)
    def test_reuses_an_already_running_django_server(
        self, server_ready, port_available
    ):
        self.assertEqual(start.find_available_port(), (start.PORT, False))
        server_ready.assert_called_once_with(start.PORT)
        port_available.assert_not_called()

    @patch("start.port_available", return_value=False)
    @patch("start.server_ready", return_value=False)
    def test_reports_when_fixed_port_is_occupied_by_another_process(
        self, server_ready, port_available
    ):
        with self.assertRaisesRegex(RuntimeError, "puerto 5000 ya está ocupado"):
            start.find_available_port()
        server_ready.assert_called_once_with(start.PORT)
        port_available.assert_called_once_with(start.PORT)


if __name__ == "__main__":
    unittest.main()
