# Ohara

https://yamanarimatt.github.io/Ohara/frontend/index.html

Ohara é um sistema de biblioteca local com backend em Python Flask, banco SQLite e frontend responsivo em HTML, CSS e JavaScript puro. A aplicação consome a API pública da Open Library para buscar livros reais, permite salvar obras em um acervo local, cadastrar usuários, registrar empréstimos, devolver livros e consultar indicadores da biblioteca.

O visual do frontend combina uma estética vitoriana elegante com usabilidade moderna: tons de papel antigo, madeira escura, vinho, dourado envelhecido, cards ornamentados discretos e tipografia serifada nos títulos.

## Tecnologias

- Python
- Flask
- flask-cors
- requests
- gunicorn
- SQLite
- HTML
- CSS
- JavaScript puro
- Open Library Search API

## Funcionalidades

- Buscar livros reais na Open Library.
- Buscar por termo geral, título ou autor.
- Exibir título, autores, ano de primeira publicação, ISBN e capa quando disponível.
- Salvar livros em uma biblioteca local SQLite.
- Evitar duplicidade de livros com mesmo título e autor.
- Listar livros salvos.
- Filtrar livros locais por título ou autor.
- Listar apenas livros disponíveis.
- Cadastrar usuários da biblioteca.
- Emprestar livro disponível para um usuário.
- Impedir empréstimo de livro já emprestado.
- Devolver livro emprestado.
- Ver empréstimos ativos.
- Consultar relatório geral da biblioteca.

## Estrutura De Pastas

```text
.
├── backend/
│   ├── app.py
│   ├── database.py
│   ├── openlibrary_service.py
│   ├── .python-version
│   ├── requirements.txt
│   └── biblioteca.db
├── frontend/
│   ├── index.html
│   ├── biblioteca.html
│   ├── usuarios.html
│   ├── emprestimos.html
│   ├── relatorios.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── api.js
│   │   ├── busca.js
│   │   ├── biblioteca.js
│   │   ├── usuarios.js
│   │   ├── emprestimos.js
│   │   └── relatorios.js
│   └── assets/
│       └── README.txt
├── .gitignore
├── render.yaml
└── README.md
```

## Como Executar O Backend

Entre na pasta do backend:

```powershell
cd backend
```

Instale as dependências:

```powershell
pip install -r requirements.txt
```

Inicie a API Flask:

```powershell
python app.py
```

O backend roda em:

```text
http://localhost:5000
```

Ao iniciar, o sistema cria automaticamente as tabelas SQLite no arquivo `backend/biblioteca.db`.

## Como Abrir O Frontend

Com o backend rodando, abra o arquivo:

```text
frontend/index.html
```

No GitHub Pages, o arquivo `index.html` da raiz redireciona automaticamente para `frontend/index.html`.

O frontend consome a API configurada em `frontend/js/api.js`:

```javascript
const LOCAL_API_BASE_URL = "http://localhost:5000/api";
const RENDER_API_BASE_URL = "https://ohara-7u9j.onrender.com/api";
```

Em `localhost`, o frontend usa o backend local. Em GitHub Pages ou outro domínio, ele usa a API publicada no Render.

## Deploy Do Backend No Render

O arquivo `render.yaml` na raiz prepara o backend para deploy como Web Service no Render:

```yaml
services:
  - type: web
    name: ohara
    runtime: python
    rootDir: backend
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app
    healthCheckPath: /api/saude
```

URL atual do backend:

```text
https://ohara-7u9j.onrender.com
```

ID do serviço no Render:

```text
srv-d8aq7i37uimc73am638g
```

Endpoint de saúde:

```text
https://ohara-7u9j.onrender.com/api/saude
```

Configuração equivalente no painel do Render:

- Runtime: `Python 3`
- Root Directory: deixe em branco ou use `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`
- Health Check Path: `/api/saude`

Se o Render estiver configurado para buildar a raiz do repositório, os arquivos `requirements.txt`, `.python-version` e `app.py` da raiz encaminham a execução para o backend em `backend/`. Se preferir configurar `Root Directory: backend`, o backend também continua funcionando diretamente a partir dessa pasta.

### Persistência Do SQLite No Render

Por padrão, o filesystem do Render é efêmero. Isso significa que o SQLite pode perder dados em redeploys ou reinícios se ficar salvo dentro da pasta do projeto.

O backend aceita a variável de ambiente `DATABASE_PATH`. Para persistência real, adicione um disco persistente no Render e configure:

```text
DATABASE_PATH=/var/data/biblioteca.db
```

Use `/var/data` como mount path do disco persistente. Sem disco persistente, o backend funciona para demonstração, mas os dados locais não devem ser tratados como permanentes.

## Integração Com A Open Library

O backend consulta a Open Library pelos endpoints públicos:

```text
https://openlibrary.org/search.json?q=TERMO_DE_BUSCA
https://openlibrary.org/search.json?title=TITULO
https://openlibrary.org/search.json?author=AUTOR
```

Quando existe `cover_id`, a capa é exibida por:

```text
https://covers.openlibrary.org/b/id/COVER_ID-L.jpg
```

Quando não há capa, o frontend exibe um card elegante com o texto `Sem capa disponível`.

## Endpoints Da API

### Saúde

```http
GET /api/saude
```

### Buscar livros na Open Library

```http
GET /api/livros/buscar?q=dracula
GET /api/livros/buscar?title=dom casmurro
GET /api/livros/buscar?author=machado de assis
```

Retorna livros normalizados com:

```json
{
  "titulo": "Dracula",
  "autores": "Bram Stoker",
  "ano_publicacao": 1897,
  "isbn": "9780141439846",
  "cover_id": "8231856",
  "capa_url": "https://covers.openlibrary.org/b/id/8231856-L.jpg",
  "openlibrary_key": "/works/OL85892W"
}
```

### Salvar livro

```http
POST /api/livros
```

Body:

```json
{
  "titulo": "Dracula",
  "autores": "Bram Stoker",
  "ano_publicacao": 1897,
  "isbn": "9780141439846",
  "cover_id": "8231856",
  "capa_url": "https://covers.openlibrary.org/b/id/8231856-L.jpg",
  "openlibrary_key": "/works/OL85892W"
}
```

### Listar livros salvos

```http
GET /api/livros
```

### Buscar livros locais

```http
GET /api/livros/local?busca=dracula
```

### Listar livros disponíveis

```http
GET /api/livros/disponiveis
```

### Cadastrar usuário

```http
POST /api/usuarios
```

Body:

```json
{
  "nome": "Mina Murray",
  "email": "mina@example.com"
}
```

### Listar usuários

```http
GET /api/usuarios
```

### Criar empréstimo

```http
POST /api/emprestimos
```

Body:

```json
{
  "livro_id": 1,
  "usuario_id": 1
}
```

### Devolver livro

```http
PUT /api/emprestimos/1/devolver
```

### Listar empréstimos

```http
GET /api/emprestimos
GET /api/emprestimos?status=ativo
```

### Relatório

```http
GET /api/relatorios
```

Retorna:

```json
{
  "total_livros_salvos": 1,
  "total_usuarios": 1,
  "total_emprestimos": 1,
  "total_livros_disponiveis": 1,
  "total_livros_emprestados": 0,
  "emprestimos_ativos": 0,
  "emprestimos_devolvidos": 1
}
```

## Formato Das Respostas

As respostas da API seguem um formato padronizado:

```json
{
  "sucesso": true,
  "mensagem": "Operação realizada com sucesso.",
  "dados": {}
}
```

Em caso de erro:

```json
{
  "sucesso": false,
  "mensagem": "Mensagem amigável para o usuário.",
  "dados": null
}
```

## Banco De Dados

O SQLite usa três tabelas principais:

- `livros`: acervo local, status e metadados vindos da Open Library.
- `usuarios`: leitores cadastrados.
- `emprestimos`: histórico de empréstimos e devoluções.

Regras aplicadas pelo backend:

- Todo livro salvo começa com status `disponivel`.
- Livro emprestado muda para status `emprestado`.
- Livro devolvido volta para status `disponivel`.
- Empréstimos ativos mudam para `devolvido` quando retornados.
- Livros com o mesmo título e autor não são salvos em duplicidade.

## Melhorias Futuras

- Autenticação de usuários.
- Painel administrativo.
- Upload de capas manuais.
- Multa por atraso.
- Prazo de devolução.
- Histórico por usuário.
- Exportação de relatório em PDF.
- Versão com React.
- Deploy online.

## Observações

- O frontend deve ser usado com o backend ativo.
- Caso a Open Library fique indisponível ou a conexão falhe, o sistema retorna uma mensagem amigável.
- O projeto não usa Docker nem frameworks frontend.
