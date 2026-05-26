import logging

import requests


OPEN_LIBRARY_SEARCH_URLS = (
    "https://openlibrary.org/search.json",
    "http://openlibrary.org/search.json",
)
COVER_URL_TEMPLATE = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
REQUEST_HEADERS = {
    "User-Agent": "Ohara/1.0 (https://ohara-7u9j.onrender.com)",
}

logger = logging.getLogger(__name__)


class OpenLibraryError(Exception):
    pass


def _primeiro_valor(valor):
    if isinstance(valor, list) and valor:
        return valor[0]
    return valor


def _normalizar_livro(documento):
    cover_id = documento.get("cover_i")
    isbn = _primeiro_valor(documento.get("isbn"))
    autores = documento.get("author_name") or []

    return {
        "titulo": documento.get("title") or "Titulo desconhecido",
        "autores": ", ".join(autores) if autores else "Autor desconhecido",
        "ano_publicacao": documento.get("first_publish_year"),
        "isbn": isbn,
        "cover_id": str(cover_id) if cover_id else None,
        "capa_url": COVER_URL_TEMPLATE.format(cover_id=cover_id) if cover_id else None,
        "openlibrary_key": documento.get("key"),
    }


def buscar_livros(termo, tipo_busca="geral", limite=20):
    termo = (termo or "").strip()
    if not termo:
        return []

    tipo_normalizado = (tipo_busca or "geral").strip().lower()
    parametros = {"limit": limite}

    if tipo_normalizado in {"titulo", "title"}:
        parametros["title"] = termo
    elif tipo_normalizado in {"autor", "author"}:
        parametros["author"] = termo
    else:
        parametros["q"] = termo

    ultima_excecao = None
    for url in OPEN_LIBRARY_SEARCH_URLS:
        try:
            resposta = requests.get(
                url,
                params=parametros,
                headers=REQUEST_HEADERS,
                timeout=(10, 30),
            )
            resposta.raise_for_status()
            break
        except requests.RequestException as exc:
            ultima_excecao = exc
            logger.warning("Falha ao consultar Open Library em %s: %s", url, exc)
    else:
        raise OpenLibraryError("Nao foi possivel consultar a Open Library.") from ultima_excecao

    try:
        dados = resposta.json()
    except ValueError as exc:
        raise OpenLibraryError("A Open Library retornou uma resposta invalida.") from exc

    documentos = dados.get("docs", [])
    return [_normalizar_livro(documento) for documento in documentos]
