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
    estadoInicial.hidden = false;
    atualizarEstadoBusca("Busca indisponível", "Tente novamente em instantes ou confirme se o backend está ativo.");
    showMessage("mensagemBusca", error.message, "error");
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
