import sqlite3
from flask import g, current_app

class PostgresConnection:
    def __init__(self, url):
        import psycopg
        from psycopg.rows import dict_row
        self.conn = psycopg.connect(url, row_factory=dict_row)

    def execute(self, sql, params=()):
        return self.conn.execute(sql.replace('?', '%s'), params)

    def executescript(self, script):
        for statement in script.split(';'):
            if statement.strip(): self.conn.execute(statement)

    def commit(self): self.conn.commit()
    def close(self): self.conn.close()

def db():
    if 'db' not in g:
        if current_app.config.get('DATABASE_URL'):
            g.db = PostgresConnection(current_app.config['DATABASE_URL'])
        else:
            g.db = sqlite3.connect(current_app.config['DATABASE'], timeout=10)
            g.db.row_factory = sqlite3.Row
            g.db.execute('PRAGMA foreign_keys=ON')
    return g.db

def init_db():
    db().executescript('''
    CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT 'Скальд', honey INTEGER NOT NULL DEFAULT 0, total INTEGER NOT NULL DEFAULT 0, streak INTEGER NOT NULL DEFAULT 0, last_day TEXT, strings INTEGER NOT NULL DEFAULT 0, horn INTEGER NOT NULL DEFAULT 0, blessing INTEGER NOT NULL DEFAULT 0, beer INTEGER NOT NULL DEFAULT 0, best_combo INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), started DOUBLE PRECISION NOT NULL, last_hit DOUBLE PRECISION NOT NULL DEFAULT 0, hits INTEGER NOT NULL DEFAULT 0, combo INTEGER NOT NULL DEFAULT 0, best_combo INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL DEFAULT 0, finished INTEGER NOT NULL DEFAULT 0, boost INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS results (player_id TEXT NOT NULL REFERENCES players(id), score INTEGER NOT NULL, created TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS promos (code TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), created TEXT NOT NULL, redeemed INTEGER NOT NULL DEFAULT 0);
    ''')
    db().commit()

def close_db(error=None):
    conn = g.pop('db', None)
    if conn: conn.close()
