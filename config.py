import os

SHOP_URL = os.environ.get('SHOP_URL', '/#assortment')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
SECRET_KEY = os.environ.get('SECRET_KEY', '')
PROMO_COST = int(os.environ.get('PROMO_COST', '500'))
DATABASE = os.environ.get('DATABASE', os.path.join(os.path.dirname(__file__), 'game.sqlite3'))
DATABASE_URL = os.environ.get('DATABASE_URL', '')
