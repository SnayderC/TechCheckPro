from django.core.management.base import BaseCommand
from core.models import Usuario


class Command(BaseCommand):
    help = 'Crea un usuario evaluador de demostración para pruebas locales.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='evaluador')
        parser.add_argument('--password', default='evaluador123')
        parser.add_argument('--email', default='evaluador@techcheck.local')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        if Usuario.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f'El usuario "{username}" ya existe.'))
            return

        Usuario.objects.create_user(
            username=username,
            password=password,
            email=email,
            first_name='Evaluador',
            last_name='TOE',
            rol='EVALUADOR',
        )
        self.stdout.write(self.style.SUCCESS(
            f'Usuario evaluador creado: {username} / {password}',
        ))
