import json
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    username = db.Column(db.String(80), primary_key=True)
    password = db.Column(db.String(120), nullable=False)
    nombre = db.Column(db.String(120), nullable=False)
    created = db.Column(db.String(50))
    pregunta = db.Column(db.String(255))
    respuesta = db.Column(db.String(255))

    def to_dict(self):
        return {
            "password": self.password,
            "nombre": self.nombre,
            "created": self.created,
            "pregunta": self.pregunta,
            "respuesta": self.respuesta
        }

class Player(db.Model):
    __tablename__ = 'players'
    username = db.Column(db.String(80), db.ForeignKey('users.username'), primary_key=True)
    id = db.Column(db.String(20), primary_key=True)
    data = db.Column(db.Text, nullable=False)

    @property
    def parsed_data(self):
        return json.loads(self.data)

class Coach(db.Model):
    __tablename__ = 'coaches'
    username = db.Column(db.String(80), db.ForeignKey('users.username'), primary_key=True)
    id = db.Column(db.String(20), primary_key=True)
    data = db.Column(db.Text, nullable=False)

    @property
    def parsed_data(self):
        return json.loads(self.data)

class Folder(db.Model):
    __tablename__ = 'folders'
    username = db.Column(db.String(80), db.ForeignKey('users.username'), primary_key=True)
    id = db.Column(db.String(20), primary_key=True)
    data = db.Column(db.Text, nullable=False)

    @property
    def parsed_data(self):
        return json.loads(self.data)

class History(db.Model):
    __tablename__ = 'histories'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), db.ForeignKey('users.username'), nullable=False)
    player_id = db.Column(db.String(20), nullable=False)
    snapshot = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String(50))

class ProgHistory(db.Model):
    __tablename__ = 'prog_histories'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), db.ForeignKey('users.username'), nullable=False)
    player_id = db.Column(db.String(20), nullable=False)
    snapshot = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.String(50))

class Lineup(db.Model):
    __tablename__ = 'lineups'
    username = db.Column(db.String(80), db.ForeignKey('users.username'), primary_key=True)
    coach_id = db.Column(db.String(20), primary_key=True)
    data = db.Column(db.Text, nullable=False)

class GoalTracker(db.Model):
    __tablename__ = 'goal_trackers'
    username = db.Column(db.String(80), db.ForeignKey('users.username'), primary_key=True)
    data = db.Column(db.Text, nullable=False)

    @property
    def parsed_data(self):
        return json.loads(self.data)

