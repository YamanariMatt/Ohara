const formBusca = document.getElementById("formBusca");
const resultadosBusca = document.getElementById("resultadosBusca");
const estadoInicial = document.getElementById("estadoInicial");
const loadingBusca = document.getElementById("loadingBusca");

formBusca.addEventListener("submit", async (event) => {
  event.preventDefault();

  const termo = document.getElementById("termoBusca").value.trim();
  const tipo = new FormData(formBusca).get("tipoBusca");

  if (!termo) {
    showMessage("mensagemBusca", "Informe um termo para buscar.", "error");
    return;
  }

  await buscarLivros(termo, tipo);
});

async function buscarLivros(termo, tipo) {
  resultadosBusca.innerHTML = "";
  estadoInicial.hidden = true;
  atualizarEstadoBusca("Procure por um livro para começar", "Os resultados aparecerão aqui com capa, autoria, ano e ISBN quando disponíveis.");
  loadingBusca.hidden = false;
  showMessage("mensagemBusca", "");

  try {
    const endpoint = montarEndpointBusca(termo, tipo);
    const resposta = await apiRequest(endpoint);
    renderizarResultados(resposta.dados || []);
    showMessage("mensagemBusca", resposta.mensagem, "success");
  } catch (error) {
    try {
      const livros = await buscarDiretoOpenLibrary(termo, tipo);
      renderizarResultados(livros);
      showMessage("mensagemBusca", "Busca realizada pela Open Library. O backend continua disponível para salvar livros.", "success");
    } catch (fallbackError) {
      estadoInicial.hidden = false;
      atualizarEstadoBusca("Busca indisponível", "Tente novamente em instantes ou confirme se o backend está ativo.");
      showMessage("mensagemBusca", error.message, "error");
    }
  } finally {
    loadingBusca.hidden = true;
  }
}

function montarEndpointBusca(termo, tipo) {
  const valor = encodeURIComponent(termo);

  if (tipo === "titulo") {
    return `/livros/buscar?title=${valor}`;
  }

  if (tipo === "autor") {
    return `/livros/buscar?author=${valor}`;
  }

  return `/livros/buscar?q=${valor}`;
}

function renderizarResultados(livros) {
  if (!livros.length) {
    estadoInicial.hidden = false;
    atualizarEstadoBusca("Nenhum livro encontrado", "Tente outro termo, título ou autor.");
    return;
  }

  estadoInicial.hidden = true;
  resultadosBusca.innerHTML = livros.map(renderizarCardBusca).join("");

  resultadosBusca.querySelectorAll("[data-save-index]").forEach((button) => {
    button.addEventListener("click", () => salvarLivro(livros[Number(button.dataset.saveIndex)], button));
  });
}

function atualizarEstadoBusca(titulo, texto) {
  estadoInicial.querySelector("h3").textContent = titulo;
  estadoInicial.querySelector("p").textContent = texto;
}

async function buscarDiretoOpenLibrary(termo, tipo) {
  const url = montarUrlOpenLibrary(termo, tipo);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("A Open Library não respondeu à busca.");
  }

  const payload = await response.json();
  return (payload.docs || []).slice(0, 20).map(normalizarLivroOpenLibrary);
}

function montarUrlOpenLibrary(termo, tipo) {
  const params = new URLSearchParams({ limit: "20" });

  if (tipo === "titulo") {
    params.set("title", termo);
  } else if (tipo === "autor") {
    params.set("author", termo);
  } else {
    params.set("q", termo);
  }

  return `https://openlibrary.org/search.json?${params.toString()}`;
}

function normalizarLivroOpenLibrary(documento) {
  const coverId = documento.cover_i || null;
  const autores = Array.isArray(documento.author_name) && documento.author_name.length
    ? documento.author_name.join(", ")
    : "Autor desconhecido";
  const isbn = Array.isArray(documento.isbn) && documento.isbn.length
    ? documento.isbn[0]
    : null;

  return {
    titulo: documento.title || "Título desconhecido",
    autores,
    ano_publicacao: documento.first_publish_year || null,
    isbn,
    cover_id: coverId ? String(coverId) : null,
    capa_url: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    openlibrary_key: documento.key || null,
  };
}

function renderizarCardBusca(livro, index) {
  return `
    <article class="book-card">
      ${buildCover(livro)}
      <div class="book-body">
        <h3 class="book-title">${escapeHTML(livro.titulo)}</h3>
        ${getBookMeta(livro)}
      </div>
      <div class="book-actions">
        <button type="button" data-save-index="${index}">Salvar livro</button>
      </div>
    </article>
  `;
}

async function salvarLivro(livro, button) {
  setButtonLoading(button, true, "Salvando...");
  showMessage("mensagemBusca", "");

  try {
    const resposta = await apiRequest("/livros", {
      method: "POST",
      body: livro,
    });
    showMessage("mensagemBusca", resposta.mensagem, "success");
    button.textContent = "Salvo";
    button.disabled = true;
  } catch (error) {
    showMessage("mensagemBusca", error.message, "error");
    setButtonLoading(button, false);
  }
}
