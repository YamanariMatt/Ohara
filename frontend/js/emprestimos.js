const formEmprestimo = document.getElementById("formEmprestimo");
const livroDisponivel = document.getElementById("livroDisponivel");
const usuarioEmprestimo = document.getElementById("usuarioEmprestimo");
const listaEmprestimos = document.getElementById("listaEmprestimos");
const estadoEmprestimos = document.getElementById("estadoEmprestimos");
const btnAtualizarEmprestimos = document.getElementById("btnAtualizarEmprestimos");

document.addEventListener("DOMContentLoaded", () => {
  carregarDadosEmprestimos();
});

btnAtualizarEmprestimos.addEventListener("click", () => carregarDadosEmprestimos());

formEmprestimo.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = formEmprestimo.querySelector("button[type='submit']");
  const livroId = Number(livroDisponivel.value);
  const usuarioId = Number(usuarioEmprestimo.value);

  if (!livroId || !usuarioId) {
    showMessage("mensagemEmprestimos", "Selecione um livro e um usuário.", "error");
    return;
  }

  setButtonLoading(submitButton, true, "Registrando...");

  try {
    const resposta = await apiRequest("/emprestimos", {
      method: "POST",
      body: {
        livro_id: livroId,
        usuario_id: usuarioId,
      },
    });
    showMessage("mensagemEmprestimos", resposta.mensagem, "success");
    await carregarDadosEmprestimos();
  } catch (error) {
    showMessage("mensagemEmprestimos", error.message, "error");
  } finally {
    setButtonLoading(submitButton, false);
    atualizarEstadoFormulario();
  }
});

async function carregarDadosEmprestimos() {
  showMessage("mensagemEmprestimos", "");

  try {
    const [livros, usuarios, emprestimos] = await Promise.all([
      apiRequest("/livros/disponiveis"),
      apiRequest("/usuarios"),
      apiRequest("/emprestimos?status=ativo"),
    ]);

    preencherLivros(livros.dados || []);
    preencherUsuarios(usuarios.dados || []);
    renderizarEmprestimos(emprestimos.dados || []);
    atualizarEstadoFormulario();
  } catch (error) {
    showMessage("mensagemEmprestimos", error.message, "error");
    preencherLivros([]);
    preencherUsuarios([]);
    renderizarEmprestimos([]);
    atualizarEstadoFormulario();
  }
}

function preencherLivros(livros) {
  livroDisponivel.innerHTML = livros.length
    ? `<option value="">Selecione um livro</option>${livros.map((livro) => `
        <option value="${livro.id}">${escapeHTML(livro.titulo)} - ${escapeHTML(livro.autores || "Autor desconhecido")}</option>
      `).join("")}`
    : `<option value="">Nenhum livro disponível</option>`;
}

function preencherUsuarios(usuarios) {
  usuarioEmprestimo.innerHTML = usuarios.length
    ? `<option value="">Selecione um usuário</option>${usuarios.map((usuario) => `
        <option value="${usuario.id}">${escapeHTML(usuario.nome)}</option>
      `).join("")}`
    : `<option value="">Nenhum usuário cadastrado</option>`;
}

function atualizarEstadoFormulario() {
  const submitButton = formEmprestimo.querySelector("button[type='submit']");
  const semLivros = livroDisponivel.options.length <= 1;
  const semUsuarios = usuarioEmprestimo.options.length <= 1;

  submitButton.disabled = semLivros || semUsuarios;
}

function renderizarEmprestimos(emprestimos) {
  estadoEmprestimos.hidden = emprestimos.length > 0;

  if (!emprestimos.length) {
    listaEmprestimos.innerHTML = "";
    return;
  }

  listaEmprestimos.innerHTML = emprestimos.map((emprestimo) => `
    <article class="loan-item">
      <div>
        <h3>${escapeHTML(emprestimo.livro_titulo)}</h3>
        <p>${escapeHTML(emprestimo.usuario_nome)} · ${escapeHTML(formatDate(emprestimo.data_emprestimo))}</p>
        <p><span class="status-badge ativo">${escapeHTML(emprestimo.status)}</span></p>
      </div>
      <button type="button" data-devolver-id="${emprestimo.id}">Devolver</button>
    </article>
  `).join("");

  listaEmprestimos.querySelectorAll("[data-devolver-id]").forEach((button) => {
    button.addEventListener("click", () => devolverLivro(button.dataset.devolverId, button));
  });
}

async function devolverLivro(emprestimoId, button) {
  setButtonLoading(button, true, "Devolvendo...");

  try {
    const resposta = await apiRequest(`/emprestimos/${emprestimoId}/devolver`, {
      method: "PUT",
    });
    showMessage("mensagemEmprestimos", resposta.mensagem, "success");
    await carregarDadosEmprestimos();
  } catch (error) {
    showMessage("mensagemEmprestimos", error.message, "error");
    setButtonLoading(button, false);
  }
}
