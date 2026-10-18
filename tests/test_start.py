import unittest
from unittest.mock import patch

import start


class LauncherPortTests(unittest.TestCase):
    @patch("start.port_available", side_effect=[False, True])
    @patch("start.server_ready", return_value=False)
    def test_uses_next_free_port_when_default_is_occupied(
        self, server_ready, port_available
    ):
        self.assertEqual(start.find_available_port(), (start.PORT + 1, True))
        self.assertEqual(server_ready.call_count, 2)
        self.assertEqual(port_available.call_count, 2)

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
    def test_reports_when_all_candidate_ports_are_occupied(
        self, server_ready, port_available
    ):
        with self.assertRaisesRegex(RuntimeError, "No hay puertos disponibles"):
            start.find_available_port()
        self.assertEqual(server_ready.call_count, start.PORT_SEARCH_ATTEMPTS)
        self.assertEqual(port_available.call_count, start.PORT_SEARCH_ATTEMPTS)


if __name__ == "__main__":
    unittest.main()
