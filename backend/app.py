from flask import Flask, jsonify, request
from flask_cors import CORS

from database import agora_iso, get_connection, init_db
from openlibrary_service import OpenLibraryError, buscar_livros


def criar_app():
    app = Flask(__name__)
    CORS(app)
    init_db()

    @app.errorhandler(404)
    def rota_nao_encontrada(_erro):
        return erro("Rota nao encontrada.", 404)

    @app.errorhandler(500)
    def erro_interno(_erro):
        return erro("Ocorreu um erro inesperado no servidor.", 500)

    @app.get("/api/saude")
    def saude():
        return sucesso({"status": "online"}, "Backend da Biblioteca Vitoriana ativo.")

    @app.get("/api/livros/buscar")
    def buscar_livros_open_library():
        termo = (
            request.args.get("q")
            or request.args.get("title")
            or request.args.get("author")
            or ""
        ).strip()
        tipo_busca = request.args.get("tipo", "geral")

        if request.args.get("title"):
            tipo_busca = "titulo"
        elif request.args.get("author"):
            tipo_busca = "autor"

        if not termo:
            return erro("Informe um termo para buscar livros.", 400)

        limite = obter_limite(request.args.get("limite", 20))

        try:
            livros = buscar_livros(termo, tipo_busca, limite)
        except OpenLibraryError as exc:
            return erro(str(exc), 502)

        return sucesso(livros, "Busca realizada com sucesso.")

    @app.post("/api/livros")
    def salvar_livro():
        dados = request.get_json(silent=True) or {}
        titulo = normalizar_texto(dados.get("titulo"))
        autores = normalizar_autores(dados.get("autores"))

        if not titulo:
            return erro("O titulo do livro e obrigatorio.", 400)

        with get_connection() as conn:
            duplicado = buscar_livro_duplicado(conn, titulo, autores)
            if duplicado:
                return erro(
                    "Este livro ja esta salvo na biblioteca local.",
                    409,
                    dict(duplicado),
                )

            cursor = conn.execute(
                """
                INSERT INTO livros (
                    titulo, autores, ano_publicacao, isbn, cover_id, capa_url,
                    openlibrary_key, status, criado_em
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'disponivel', ?)
                """,
                (
                    titulo,
                    autores,
                    obter_inteiro_ou_none(dados.get("ano_publicacao")),
                    normalizar_texto(dados.get("isbn")),
                    normalizar_texto(dados.get("cover_id")),
                    normalizar_texto(dados.get("capa_url")),
                    normalizar_texto(dados.get("openlibrary_key")),
                    agora_iso(),
                ),
            )
            conn.commit()
            livro = buscar_livro_por_id(conn, cursor.lastrowid)

        return sucesso(dict(livro), "Livro salvo com sucesso.", 201)

    @app.get("/api/livros")
    def listar_livros():
        with get_connection() as conn:
            livros = conn.execute(
                """
                SELECT *
                FROM livros
                ORDER BY id DESC
                """
            ).fetchall()

        return sucesso(linhas_para_lista(livros), "Livros listados com sucesso.")

    @app.get("/api/livros/local")
    def buscar_livros_locais():
        busca = normalizar_texto(request.args.get("busca"))

        with get_connection() as conn:
            if busca:
                termo = f"%{busca.lower()}%"
                livros = conn.execute(
                    """
                    SELECT *
                    FROM livros
                    WHERE LOWER(titulo) LIKE ?
                       OR LOWER(COALESCE(autores, '')) LIKE ?
                    ORDER BY titulo ASC
                    """,
                    (termo, termo),
                ).fetchall()
            else:
                livros = conn.execute(
                    """
                    SELECT *
                    FROM livros
                    ORDER BY titulo ASC
                    """
                ).fetchall()

        return sucesso(linhas_para_lista(livros), "Busca local realizada com sucesso.")

    @app.get("/api/livros/disponiveis")
    def listar_livros_disponiveis():
        with get_connection() as conn:
            livros = conn.execute(
                """
                SELECT *
                FROM livros
                WHERE status = 'disponivel'
                ORDER BY titulo ASC
                """
            ).fetchall()

        return sucesso(linhas_para_lista(livros), "Livros disponiveis listados.")

    @app.post("/api/usuarios")
    def cadastrar_usuario():
        dados = request.get_json(silent=True) or {}
        nome = normalizar_texto(dados.get("nome"))
        email = normalizar_texto(dados.get("email"))

        if not nome:
            return erro("O nome do usuario e obrigatorio.", 400)

        with get_connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO usuarios (nome, email, criado_em)
                VALUES (?, ?, ?)
                """,
                (nome, email, agora_iso()),
            )
            conn.commit()
            usuario = buscar_usuario_por_id(conn, cursor.lastrowid)

        return sucesso(dict(usuario), "Usuario cadastrado com sucesso.", 201)

    @app.get("/api/usuarios")
    def listar_usuarios():
        with get_connection() as conn:
            usuarios = conn.execute(
                """
                SELECT *
                FROM usuarios
                ORDER BY nome ASC
                """
            ).fetchall()

        return sucesso(linhas_para_lista(usuarios), "Usuarios listados com sucesso.")

    @app.post("/api/emprestimos")
    def criar_emprestimo():
        dados = request.get_json(silent=True) or {}
        livro_id = obter_inteiro_ou_none(dados.get("livro_id"))
        usuario_id = obter_inteiro_ou_none(dados.get("usuario_id"))

        if not livro_id or not usuario_id:
            return erro("Informe livro_id e usuario_id para criar o emprestimo.", 400)

        with get_connection() as conn:
            livro = buscar_livro_por_id(conn, livro_id)
            if not livro:
                return erro("Livro nao encontrado.", 404)

            usuario = buscar_usuario_por_id(conn, usuario_id)
            if not usuario:
                return erro("Usuario nao encontrado.", 404)

            if livro["status"] != "disponivel":
                return erro(
                    "Este livro ja esta emprestado. Escolha um livro disponivel.",
                    409,
                )

            cursor = conn.execute(
                """
                INSERT INTO emprestimos (
                    livro_id, usuario_id, data_emprestimo, data_devolucao, status
                )
                VALUES (?, ?, ?, NULL, 'ativo')
                """,
                (livro_id, usuario_id, agora_iso()),
            )
            conn.execute(
                """
                UPDATE livros
                SET status = 'emprestado'
                WHERE id = ?
                """,
                (livro_id,),
            )
            conn.commit()
            emprestimo = buscar_emprestimo_por_id(conn, cursor.lastrowid)

        return sucesso(dict(emprestimo), "Emprestimo criado com sucesso.", 201)

    @app.put("/api/emprestimos/<int:emprestimo_id>/devolver")
    def devolver_livro(emprestimo_id):
        with get_connection() as conn:
            emprestimo = buscar_emprestimo_por_id(conn, emprestimo_id)
            if not emprestimo:
                return erro("Emprestimo nao encontrado.", 404)

            if emprestimo["status"] == "devolvido":
                return erro("Este emprestimo ja foi devolvido.", 409, dict(emprestimo))

            conn.execute(
                """
                UPDATE emprestimos
                SET status = 'devolvido', data_devolucao = ?
                WHERE id = ?
                """,
                (agora_iso(), emprestimo_id),
            )
            conn.execute(
                """
                UPDATE livros
                SET status = 'disponivel'
                WHERE id = ?
                """,
                (emprestimo["livro_id"],),
            )
            conn.commit()
            emprestimo_devolvido = buscar_emprestimo_por_id(conn, emprestimo_id)

        return sucesso(dict(emprestimo_devolvido), "Livro devolvido com sucesso.")

    @app.get("/api/emprestimos")
    def listar_emprestimos():
        status = normalizar_texto(request.args.get("status"))

        with get_connection() as conn:
            if status:
                emprestimos = conn.execute(
                    """
                    SELECT e.*, l.titulo AS livro_titulo, l.autores AS livro_autores,
                           u.nome AS usuario_nome, u.email AS usuario_email
                    FROM emprestimos e
                    JOIN livros l ON l.id = e.livro_id
                    JOIN usuarios u ON u.id = e.usuario_id
                    WHERE e.status = ?
                    ORDER BY e.id DESC
                    """,
                    (status,),
                ).fetchall()
            else:
                emprestimos = conn.execute(
                    """
                    SELECT e.*, l.titulo AS livro_titulo, l.autores AS livro_autores,
                           u.nome AS usuario_nome, u.email AS usuario_email
                    FROM emprestimos e
                    JOIN livros l ON l.id = e.livro_id
                    JOIN usuarios u ON u.id = e.usuario_id
                    ORDER BY e.id DESC
                    """
                ).fetchall()

        return sucesso(linhas_para_lista(emprestimos), "Emprestimos listados com sucesso.")

    @app.get("/api/relatorios")
    def relatorios():
        with get_connection() as conn:
            relatorio = {
                "total_livros_salvos": contar(conn, "livros"),
                "total_usuarios": contar(conn, "usuarios"),
                "total_emprestimos": contar(conn, "emprestimos"),
                "total_livros_disponiveis": contar_por_status(
                    conn, "livros", "disponivel"
                ),
                "total_livros_emprestados": contar_por_status(
                    conn, "livros", "emprestado"
                ),
                "emprestimos_ativos": contar_por_status(conn, "emprestimos", "ativo"),
                "emprestimos_devolvidos": contar_por_status(
                    conn, "emprestimos", "devolvido"
                ),
            }

        return sucesso(relatorio, "Relatorio gerado com sucesso.")

    return app


def sucesso(dados=None, mensagem="Operacao realizada com sucesso.", status=200):
    return jsonify({"sucesso": True, "mensagem": mensagem, "dados": dados}), status


def erro(mensagem, status=400, dados=None):
    return jsonify({"sucesso": False, "mensagem": mensagem, "dados": dados}), status


def linhas_para_lista(linhas):
    return [dict(linha) for linha in linhas]


def normalizar_texto(valor):
    if valor is None:
        return None
    valor = str(valor).strip()
    return valor or None


def normalizar_autores(valor):
    if isinstance(valor, list):
        valor = ", ".join(str(item).strip() for item in valor if str(item).strip())
    return normalizar_texto(valor)


def obter_inteiro_ou_none(valor):
    if valor in (None, ""):
        return None
    try:
        return int(valor)
    except (TypeError, ValueError):
        return None


def obter_limite(valor):
    limite = obter_inteiro_ou_none(valor) or 20
    return min(max(limite, 1), 50)


def buscar_livro_duplicado(conn, titulo, autores):
    return conn.execute(
        """
        SELECT *
        FROM livros
        WHERE LOWER(TRIM(titulo)) = LOWER(TRIM(?))
          AND LOWER(TRIM(COALESCE(autores, ''))) = LOWER(TRIM(COALESCE(?, '')))
        LIMIT 1
        """,
        (titulo, autores),
    ).fetchone()


def buscar_livro_por_id(conn, livro_id):
    return conn.execute(
        """
        SELECT *
        FROM livros
        WHERE id = ?
        """,
        (livro_id,),
    ).fetchone()


def buscar_usuario_por_id(conn, usuario_id):
    return conn.execute(
        """
        SELECT *
        FROM usuarios
        WHERE id = ?
        """,
        (usuario_id,),
    ).fetchone()


def buscar_emprestimo_por_id(conn, emprestimo_id):
    return conn.execute(
        """
        SELECT e.*, l.titulo AS livro_titulo, l.autores AS livro_autores,
               u.nome AS usuario_nome, u.email AS usuario_email
        FROM emprestimos e
        JOIN livros l ON l.id = e.livro_id
        JOIN usuarios u ON u.id = e.usuario_id
        WHERE e.id = ?
        """,
        (emprestimo_id,),
    ).fetchone()


def contar(conn, tabela):
    return conn.execute(f"SELECT COUNT(*) AS total FROM {tabela}").fetchone()["total"]


def contar_por_status(conn, tabela, status):
    return conn.execute(
        f"SELECT COUNT(*) AS total FROM {tabela} WHERE status = ?",
        (status,),
    ).fetchone()["total"]


app = criar_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
