import hmac
import secrets
import time
from datetime import date, datetime, timedelta, timezone
from functools import wraps
from flask import Flask, abort, jsonify, redirect, render_template, request, send_from_directory, session
import config
from models import db, init_db, close_db

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.config.update(DATABASE=config.DATABASE, DATABASE_URL=config.DATABASE_URL, SECRET_KEY=config.SECRET_KEY or secrets.token_hex(32), SESSION_COOKIE_HTTPONLY=True, SESSION_COOKIE_SAMESITE='Lax', MAX_CONTENT_LENGTH=16384)
app.teardown_appcontext(close_db)
with app.app_context(): init_db()

def now(): return datetime.now(timezone.utc)
def player():
    pid = session.get('player')
    if not pid:
        pid = secrets.token_urlsafe(24)
        session['player'] = pid
    db().execute('INSERT INTO players(id) VALUES (?) ON CONFLICT(id) DO NOTHING', (pid,))
    db().commit()
    return db().execute('SELECT * FROM players WHERE id=?', (pid,)).fetchone()

def profile(p):
    achievements = []
    if p['total'] >= 1000: achievements.append('Убийца ётунов')
    if p['total'] >= 5000: achievements.append('Любимец Браги')
    if p['best_combo'] >= 100: achievements.append('100 комбо')
    codes = [dict(x) for x in db().execute('SELECT code, created, redeemed FROM promos WHERE player_id=? ORDER BY created DESC', (p['id'],))]
    return {k:p[k] for k in ('name','honey','total','streak','strings','horn','blessing','beer','best_combo')} | {'achievements':achievements, 'promos':codes, 'promo_cost':config.PROMO_COST, 'shop_url':config.SHOP_URL}

@app.after_request
def headers(response):
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['Referrer-Policy'] = 'same-origin'
    return response

@app.get('/')
def home(): return send_from_directory(app.static_folder, 'index.html')

@app.get('/<path:filename>')
def assets(filename): return send_from_directory(app.static_folder, filename)

@app.get('/game')
@app.get('/leaderboard')
@app.get('/rewards')
def game(): return render_template('game.html', shop_url=config.SHOP_URL)

@app.get('/api/me')
def me():
    p = player(); today = date.today(); last = p['last_day']
    if last != today.isoformat():
        streak = p['streak'] + 1 if last == (today - timedelta(days=1)).isoformat() else 1
        db().execute('UPDATE players SET streak=?, last_day=?, honey=honey+? WHERE id=?', (streak, today.isoformat(), min(streak, 7)*10, p['id']))
        db().commit(); p = player()
    return jsonify(profile(p))

@app.post('/api/start')
def start():
    p=player(); data=request.get_json(silent=True) or {}; name=str(data.get('name','')).strip()[:24] or 'Скальд'
    gid=secrets.token_urlsafe(18); boost=int(p['beer'] > 0)
    db().execute('UPDATE players SET name=?, beer=beer-? WHERE id=?', (name, boost, p['id']))
    db().execute('UPDATE games SET finished=1 WHERE player_id=? AND finished=0', (p['id'],))
    db().execute('INSERT INTO games(id,player_id,started,boost) VALUES (?,?,?,?)',(gid,p['id'],time.time(),boost)); db().commit()
    return jsonify(id=gid, duration=60, boost=bool(boost))

def active_game(p, data):
    return db().execute('SELECT * FROM games WHERE id=? AND player_id=? AND finished=0', (str(data.get('id','')),p['id'])).fetchone()

@app.post('/api/hit')
def hit():
    p=player(); data=request.get_json(silent=True) or {}; game=active_game(p,data); t=time.time()
    if not game or t-game['started'] > 63: return jsonify(error='Сага завершена'),400
    if t-game['last_hit'] < .23 or game['hits'] >= 180: return jsonify(error='Слишком быстро'),429
    combo=game['combo']+1; points=(10+p['strings']*2)*min(5,1+combo//10)
    # Bonus barrels are limited to one per ten accepted hits, determined by server.
    barrel=(game['hits']+1)%10 == 0
    if barrel: points*=2
    if game['boost']: points=points*12//10
    db().execute('UPDATE games SET last_hit=?, hits=hits+1, combo=?, best_combo=CASE WHEN best_combo < ? THEN ? ELSE best_combo END, score=score+? WHERE id=?',(t,combo,combo,combo,points,game['id'])); db().commit()
    return jsonify(score=game['score']+points, combo=combo, barrel=barrel)

@app.post('/api/miss')
def miss():
    p=player(); data=request.get_json(silent=True) or {}; game=active_game(p,data)
    if game: db().execute('UPDATE games SET combo=0 WHERE id=?',(game['id'],)); db().commit()
    return jsonify(ok=True)

@app.post('/api/score')
def score():
    p=player(); data=request.get_json(silent=True) or {}; game=active_game(p,data)
    if not game: return jsonify(error='Игра уже завершена'),400
    if time.time()-game['started'] < 55: return jsonify(error='Игра ещё не завершена'),400
    earned=game['score']//10 + p['horn']*5
    db().execute('UPDATE games SET finished=1 WHERE id=?',(game['id'],))
    db().execute('UPDATE players SET honey=honey+?, total=total+?, best_combo=CASE WHEN best_combo < ? THEN ? ELSE best_combo END WHERE id=?',(earned,game['score'],game['best_combo'],game['best_combo'],p['id']))
    db().execute('INSERT INTO results VALUES (?,?,?)',(p['id'],game['score'],now().isoformat())); db().commit()
    return jsonify(earned=earned, score=game['score'], combo=game['best_combo'], profile=profile(player()))

@app.post('/api/upgrade')
def upgrade():
    p=player(); item=(request.get_json(silent=True) or {}).get('item')
    prices={'strings':100*(p['strings']+1), 'horn':120*(p['horn']+1), 'blessing':80, 'beer':150}
    if item not in prices or (item in ('strings','horn') and p[item]>=10): return jsonify(error='Улучшение недоступно'),400
    if p['honey']<prices[item]: return jsonify(error='Недостаточно медовухи'),400
    amount=3 if item=='beer' else 1
    db().execute(f'UPDATE players SET honey=honey-?, {item}={item}+? WHERE id=?',(prices[item],amount,p['id'])); db().commit()
    return jsonify(profile(player()))

@app.post('/api/blessing')
def blessing():
    p=player(); game=active_game(p,request.get_json(silent=True) or {})
    if not game or p['blessing'] < 1: return jsonify(error='Благословение недоступно'),400
    db().execute('UPDATE players SET blessing=blessing-1 WHERE id=?',(p['id'],)); db().commit(); return jsonify(ok=True)

@app.post('/api/promo')
def promo():
    p=player()
    code='BRAGI-'+secrets.token_hex(5).upper()
    changed=db().execute('UPDATE players SET honey=honey-? WHERE id=? AND honey>=?',(config.PROMO_COST,p['id'],config.PROMO_COST))
    if not changed.rowcount: return jsonify(error='Недостаточно медовухи'),400
    db().execute('INSERT INTO promos VALUES (?,?,?,0)',(code,p['id'],now().isoformat())); db().commit()
    return jsonify(code=code, profile=profile(player()))

@app.get('/api/leaderboard')
def leaderboard():
    since=(now()-timedelta(days=7)).isoformat()
    rows=db().execute('SELECT p.name, MAX(r.score) score FROM results r JOIN players p ON p.id=r.player_id WHERE r.created>=? GROUP BY p.id ORDER BY score DESC LIMIT 10',(since,)).fetchall()
    return jsonify([dict(r) for r in rows])

def admin_required(fn):
    @wraps(fn)
    def wrapped(*args,**kwargs):
        auth=request.authorization
        if not config.ADMIN_PASSWORD: return 'Задайте ADMIN_PASSWORD в окружении.',503
        if not auth or not hmac.compare_digest(auth.password or '',config.ADMIN_PASSWORD): return 'Требуется пароль',401,{'WWW-Authenticate':'Basic realm="Bragi admin"'}
        return fn(*args,**kwargs)
    return wrapped

@app.route('/admin/promos',methods=['GET','POST'])
@admin_required
def admin():
    if request.method=='POST':
        if not hmac.compare_digest(request.form.get('csrf',''),session.get('admin_csrf','!')): abort(403)
        code=request.form.get('code','').strip().upper()
        db().execute('UPDATE promos SET redeemed=1 WHERE code=? AND redeemed=0',(code,)); db().commit()
        return redirect('/admin/promos',code=303)
    rows=db().execute('SELECT promos.*, players.name FROM promos JOIN players ON players.id=promos.player_id ORDER BY created DESC').fetchall()
    session['admin_csrf'] = session.get('admin_csrf') or secrets.token_urlsafe(24)
    return render_template('admin.html', promos=rows, csrf=session['admin_csrf'])

if __name__=='__main__': app.run(debug=True)
