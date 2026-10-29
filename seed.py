"""Добавить демонстрационные результаты в локальную базу."""
import secrets
from datetime import datetime, timezone
from app import app
from models import db

with app.app_context():
    for name, score in [('Эйрик', 3200), ('Фрейя', 2700), ('Бьёрн', 1900)]:
        pid='demo-'+secrets.token_hex(8)
        db().execute('INSERT INTO players(id,name,total) VALUES (?,?,?)',(pid,name,score))
        db().execute('INSERT INTO results VALUES (?,?,?)',(pid,score,datetime.now(timezone.utc).isoformat()))
    db().commit()
    print('Демо-скальды добавлены.')
