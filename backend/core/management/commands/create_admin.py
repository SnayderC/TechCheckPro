from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

Usuario = get_user_model()


class Command(BaseCommand):
    help = 'Crea un usuario administrador para gestión del sistema.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin')
        parser.add_argument('--password', default='Admin2026!')
        parser.add_argument('--email', default='admin@techcheck.local')

    def handle(self, *args, **options):
        username = options['username']
        if Usuario.objects.filter(username=username).exists():
            u = Usuario.objects.get(username=username)
            u.rol = 'ADMIN'
            u.is_staff = True
            u.save()
            self.stdout.write(self.style.WARNING(f'Usuario "{username}" actualizado a ADMIN.'))
            return

        Usuario.objects.create_superuser(
            username=username,
            email=options['email'],
            password=options['password'],
            rol='ADMIN',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Administrador creado: {username} / {options["password"]}',
        ))
