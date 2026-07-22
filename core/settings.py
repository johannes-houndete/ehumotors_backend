"""
Django settings for core project.
"""

import os
import dj_database_url
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file for local development
_env_file = BASE_DIR / '.env'
if _env_file.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_file)
    except ImportError:
        pass

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'django-insecure-$cf2)81e1^t89mfkc*6w6u7%l6)fiq@#2g5dsbzxfz7d3211t7')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

_DB_HOST = os.environ.get('DB_HOST', '127.0.0.1')
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': os.environ.get('DB_NAME', 'ehu_motors'),
        'USER': os.environ.get('DB_USER', 'root'),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': _DB_HOST,
        'PORT': os.environ.get('DB_PORT', '3306') if not _DB_HOST.startswith('/') else '',
    }
}

_DB_URL = os.environ.get('DATABASE_URL') or os.environ.get('MYSQL_URL')
if _DB_URL:
    DATABASES['default'] = dj_database_url.parse(_DB_URL)
    DATABASES['default']['ENGINE'] = 'django.db.backends.mysql'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Porto-Novo'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# JWT Auth
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'api.jwt_auth.EhuJWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

_cors_extra = os.environ.get('CORS_ALLOWED_ORIGINS', '')
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:80",
    "http://localhost",
] + [o.strip() for o in _cors_extra.split(',') if o.strip()]

# ── KKiaPay Sandbox ───────────────────────────────────────────────────────────
# Les 3 clés (publique, privée, secrète) viennent de
# https://app.kkiapay.me/dashboard/developers/keys — les 3 sont nécessaires
# pour que le serveur puisse vérifier une transaction (X-API-KEY / X-PRIVATE-KEY
# / X-SECRET-KEY). La clé publique est aussi utilisée par le widget côté front.

def _clean_env(key: str, default: str = '') -> str:
    # Certaines plateformes (ex. Railway) laissent passer un \n ou un espace
    # collé en fin de variable lors du copier-coller dans leur UI — ça part
    # tel quel dans les headers HTTP et `requests` rejette la requête avec
    # "Invalid leading whitespace, reserved character(s) [...] in header value".
    return os.environ.get(key, default).strip()


KKIAPAY_PUBLIC_KEY      = _clean_env('KKIAPAY_PUBLIC_KEY')
KKIAPAY_PRIVATE_KEY    = _clean_env('KKIAPAY_PRIVATE_KEY')
KKIAPAY_SECRET_KEY     = _clean_env('KKIAPAY_SECRET_KEY')
KKIAPAY_BASE_URL       = _clean_env('KKIAPAY_BASE_URL', 'https://api-sandbox.kkiapay.me')
KKIAPAY_WEBHOOK_SECRET = _clean_env('KKIAPAY_WEBHOOK_SECRET')
KKIAPAY_SANDBOX        = 'sandbox' in KKIAPAY_BASE_URL
