"""
Wait for a stable database connection.
Used as a bit of hack if/when waiting for a Postgres container to start.

ref: https://stackoverflow.com/questions/32098797/how-can-i-check-database-connection-to-mysql-in-django
"""
import time

from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError
from django.utils.translation import ngettext


class Command(BaseCommand):
    help = "Checks database connection"

    def add_arguments(self, parser):
        parser.add_argument(
            "--seconds",
            nargs="?",
            type=int,
            const=1,
            help="Number of seconds to wait before retrying",
            default=5,
        )
        parser.add_argument(
            "--max_retries",
            nargs="?",
            type=int,
            const=1,
            help="Maximum number of times to to test for a connection",
            default=30,
        )

    def handle(self, *args, **options):
        wait = options["seconds"]
        max_retries = options["max_retries"]
        num_loops = 1
        connection_made = False
        while True:
            self.stdout.write(self.style.SUCCESS(f"({num_loops}/{max_retries}) Checking database connection..."))
            try:
                connection.ensure_connection()
                connection_made = True
                break
            except OperationalError:
                plural_time = ngettext("second", "seconds", wait)
                self.stdout.write(
                    self.style.WARNING(
                        f"Database unavailable, retrying after {wait} {plural_time}!"
                    )
                )
                time.sleep(wait)
            if num_loops >= max_retries:
                self.stdout.write(
                    self.style.WARNING(f"Maximum attempts reached: {max_retries}")
                )
                break
            num_loops += 1

        if connection_made:
            self.stdout.write(self.style.SUCCESS("Database connections successful"))
        else:
            self.stdout.write(self.style.WARNING("Failed to make Database connection"))
