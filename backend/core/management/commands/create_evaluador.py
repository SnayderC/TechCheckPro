from django.core.management.base import BaseCommand
from core.models import Usuario


class Command(BaseCommand):
    help = 'Crea un usuario evaluador de demostración para pruebas locales.'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='evaluador')
        parser.add_argument('--password', default='evaluador123')
        parser.add_argument('--email', default='evaluador@techcheck.local')
        parser.add_argument(
            '--reset-password',
            action='store_true',
            help='Restablece la contraseña si el usuario ya existe',
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']

        existing = Usuario.objects.filter(username=username).first()
        if existing:
            if options['reset_password']:
                existing.set_password(password)
                existing.is_active = True
                existing.save()
                self.stdout.write(self.style.SUCCESS(
                    f'Contraseña restablecida para "{username}": {password}',
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f'El usuario "{username}" ya existe. Use --reset-password para cambiar la clave.',
                ))
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
