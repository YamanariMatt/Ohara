const listaBiblioteca = document.getElementById("listaBiblioteca");
const estadoBiblioteca = document.getElementById("estadoBiblioteca");
const formFiltroBiblioteca = document.getElementById("formFiltroBiblioteca");
const btnDisponiveis = document.getElementById("btnDisponiveis");
const btnTodos = document.getElementById("btnTodos");

document.addEventListener("DOMContentLoaded", () => {
  carregarLivros();
});

formFiltroBiblioteca.addEventListener("submit", async (event) => {
  event.preventDefault();
  const termo = document.getElementById("buscaLocal").value.trim();
  await filtrarLivros(termo);
});

btnDisponiveis.addEventListener("click", () => carregarLivrosDisponiveis());
btnTodos.addEventListener("click", () => {
  document.getElementById("buscaLocal").value = "";
  carregarLivros();
});

async function carregarLivros() {
  showMessage("mensagemBiblioteca", "");
  listaBiblioteca.innerHTML = "";

  try {
    const resposta = await apiRequest("/livros");
    renderizarBiblioteca(resposta.dados || []);
  } catch (error) {
    showMessage("mensagemBiblioteca", error.message, "error");
    renderizarBiblioteca([]);
  }
}

async function filtrarLivros(termo) {
  showMessage("mensagemBiblioteca", "");
  listaBiblioteca.innerHTML = "";

  try {
    const resposta = await apiRequest(`/livros/local?busca=${encodeURIComponent(termo)}`);
    renderizarBiblioteca(resposta.dados || []);
  } catch (error) {
    showMessage("mensagemBiblioteca", error.message, "error");
    renderizarBiblioteca([]);
  }
}

async function carregarLivrosDisponiveis() {
  showMessage("mensagemBiblioteca", "");
  listaBiblioteca.innerHTML = "";

  try {
    const resposta = await apiRequest("/livros/disponiveis");
    renderizarBiblioteca(resposta.dados || []);
    showMessage("mensagemBiblioteca", resposta.mensagem, "success");
  } catch (error) {
    showMessage("mensagemBiblioteca", error.message, "error");
    renderizarBiblioteca([]);
  }
}

function renderizarBiblioteca(livros) {
  estadoBiblioteca.hidden = livros.length > 0;

  if (!livros.length) {
    listaBiblioteca.innerHTML = "";
    return;
  }

  listaBiblioteca.innerHTML = livros.map((livro) => `
    <article class="book-card">
      ${buildCover(livro)}
      <div class="book-body">
        <h3 class="book-title">${escapeHTML(livro.titulo)}</h3>
        ${getBookMeta(livro)}
      </div>
      <div class="book-actions">
        <span class="status-badge ${escapeHTML(livro.status)}">${escapeHTML(livro.status)}</span>
      </div>
    </article>
  `).join("");
}
