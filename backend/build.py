"""Build script ejecutado por Vercel antes del despliegue de Django."""
import os

import django


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'techcheck.settings')
    django.setup()

    from django.core.management import call_command
    from core.models import Factor

    call_command('migrate', '--noinput')

    if Factor.objects.count() == 0:
        call_command('seed_toe')


if __name__ == '__main__':
    main()
