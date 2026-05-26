from datetime import datetime, timezone
from pathlib import Path
import sqlite3


BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "biblioteca.db"


def agora_iso():
    return datetime.now(timezone.utc).isoformat()


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    with get_connection() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS livros (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT NOT NULL,
                autores TEXT,
                ano_publicacao INTEGER,
                isbn TEXT,
                cover_id TEXT,
                capa_url TEXT,
                openlibrary_key TEXT,
                status TEXT DEFAULT 'disponivel',
                criado_em TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT,
                criado_em TEXT
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS emprestimos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                livro_id INTEGER,
                usuario_id INTEGER,
                data_emprestimo TEXT,
                data_devolucao TEXT,
                status TEXT DEFAULT 'ativo',
                FOREIGN KEY(livro_id) REFERENCES livros(id),
                FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
            )
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_livros_titulo_autores
            ON livros(titulo, autores)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_livros_status
            ON livros(status)
            """
        )
        conn.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_emprestimos_status
            ON emprestimos(status)
            """
        )
        conn.commit()
