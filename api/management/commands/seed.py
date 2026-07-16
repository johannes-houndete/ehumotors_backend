import os
import bcrypt
from django.core.management.base import BaseCommand
from django.utils import timezone
from api.models import Stations, Utilisateurs, Tarifs

# Try to load .env.seed if it exists (for local development)
try:
    from dotenv import load_dotenv
    load_dotenv('.env.seed')
except ImportError:
    pass

class Command(BaseCommand):
    help = "Seed initial stations, admin, and agents from environment variables"

    def handle(self, *args, **options):
        self.stdout.write("--- Starting Database Seeding ---")

        # 1. Seed Stations
        stations_map = {}
        i = 1
        while True:
            nom = os.environ.get(f"STATION_{i}_NOM")
            if not nom:
                # If N=1 and N=2 are empty, check if we finished or need defaults
                if i > 2:
                    break
                # Provide standard defaults if nothing in env
                nom = "Vodjè" if i == 1 else "Godomey"
            
            adresse = os.environ.get(f"STATION_{i}_ADRESSE", f"Adresse {nom}")
            capacite_raw = os.environ.get(f"STATION_{i}_CAPACITE")
            capacite = float(capacite_raw) if capacite_raw else 4416.0

            station, created = Stations.objects.get_or_create(
                nom=nom,
                defaults={
                    "adresse": adresse,
                    "capacite_wh": capacite,
                    "created_at": timezone.now()
                }
            )
            stations_map[nom.lower()] = station
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"Station created: {nom}"))
            else:
                self.stdout.write(f"Station already exists: {nom}")
            i += 1

        # 2. Seed Admin
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@admin.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        admin_nom = os.environ.get("ADMIN_NOM", "Admin")

        # Hash admin password
        hashed_admin_pwd = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

        admin_user, created = Utilisateurs.objects.get_or_create(
            email=admin_email,
            defaults={
                "nom": admin_nom,
                "mot_de_passe": hashed_admin_pwd,
                "role": "admin",
                "actif": 1,
                "created_at": timezone.now()
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Admin created: {admin_email}"))
        else:
            self.stdout.write(f"Admin already exists: {admin_email}")

        # 3. Seed Default Tarif if not exists
        if not Tarifs.objects.exists():
            default_tarif_rule = '{"tiers":[{"min":5,"max":10,"rate":20},{"min":10,"max":20,"rate":15},{"min":20,"max":90,"rate":12},{"min":90,"max":100,"rate":15}],"penalty_threshold":5,"penalty_value":250,"justification":"Tarif initial seed"}'
            Tarifs.objects.create(
                regle=default_tarif_rule,
                prix_par_wh=0.0,
                admin=admin_user,
                date_modif=timezone.now()
            )
            self.stdout.write(self.style.SUCCESS("Default pricing rules seeded."))

        # 4. Seed Agents
        j = 1
        while True:
            agent_email = os.environ.get(f"AGENT_{j}_EMAIL")
            if not agent_email:
                if j > 2:
                    break
                # Standard defaults
                agent_email = "vodje@ehumotors.com" if j == 1 else "godomey@ehumotors.com"

            agent_password = os.environ.get(f"AGENT_{j}_PASSWORD", "password123")
            agent_nom = os.environ.get(f"AGENT_{j}_NOM", f"Agent {j}")
            agent_station_name = os.environ.get(f"AGENT_{j}_STATION", "Vodjè" if j == 1 else "Godomey")

            station = stations_map.get(agent_station_name.lower())
            if not station:
                # If the mapped station wasn't created/found, fallback to first available
                station = list(stations_map.values())[0] if stations_map else None

            hashed_agent_pwd = bcrypt.hashpw(agent_password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

            agent_user, created = Utilisateurs.objects.get_or_create(
                email=agent_email,
                defaults={
                    "nom": agent_nom,
                    "mot_de_passe": hashed_agent_pwd,
                    "role": "agent",
                    "station": station,
                    "actif": 1,
                    "created_at": timezone.now()
                }
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Agent created: {agent_email} (Station: {station.nom if station else 'None'})"))
            else:
                self.stdout.write(f"Agent already exists: {agent_email}")
            j += 1

        self.stdout.write("--- Seeding Completed Successfully ---")
