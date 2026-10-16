import pymysql, json, sys
sys.stdout.reconfigure(encoding='utf-8')
c = pymysql.connect(host='localhost', user='root', password='', database='efootball_manager')
with c.cursor() as cur:
    cur.execute('SELECT username, id, data FROM players WHERE username=%s', ('sebastiannieto002@outlook.com',))
    rows = cur.fetchall()
    targets = ['messi', 'ronaldinho', 'lamine', 'suarez', 'aguero', 'kuyt', 'hazard', 'rui costa', 'cantona']
    for u, jid, d_raw in rows:
        d = json.loads(d_raw)
        nom = d.get('nombre', '')
        for t in targets:
            if t in nom.lower():
                print(f"{nom} | pos: {d.get('posicion')} | ovr: {d.get('ovr')} | id: {jid} | img: {d.get('imagen')}")
