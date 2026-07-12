"""Build script ejecutado por Vercel antes del despliegue de Django."""
import os

import django


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'techcheck.settings')
    django.setup()

    from django.core.management import call_command

    call_command('migrate', '--noinput')
    call_command('seed_toe')

    admin_user = os.environ.get('ADMIN_USERNAME')
    admin_pass = os.environ.get('ADMIN_PASSWORD')
    if admin_user and admin_pass:
        call_command(
            'create_admin',
            username=admin_user,
            password=admin_pass,
            email=os.environ.get('ADMIN_EMAIL', 'admin@techcheck.local'),
        )


if __name__ == '__main__':
    main()
