const formUsuario = document.getElementById("formUsuario");
const listaUsuarios = document.getElementById("listaUsuarios");
const estadoUsuarios = document.getElementById("estadoUsuarios");

document.addEventListener("DOMContentLoaded", () => {
  carregarUsuarios();
});

formUsuario.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitButton = formUsuario.querySelector("button[type='submit']");
  const nome = document.getElementById("nomeUsuario").value.trim();
  const email = document.getElementById("emailUsuario").value.trim();

  if (!nome) {
    showMessage("mensagemUsuarios", "Informe o nome do usuário.", "error");
    return;
  }

  setButtonLoading(submitButton, true, "Cadastrando...");

  try {
    const resposta = await apiRequest("/usuarios", {
      method: "POST",
      body: { nome, email },
    });
    showMessage("mensagemUsuarios", resposta.mensagem, "success");
    formUsuario.reset();
    await carregarUsuarios();
  } catch (error) {
    showMessage("mensagemUsuarios", error.message, "error");
  } finally {
    setButtonLoading(submitButton, false);
  }
});

async function carregarUsuarios() {
  try {
    const resposta = await apiRequest("/usuarios");
    renderizarUsuarios(resposta.dados || []);
  } catch (error) {
    showMessage("mensagemUsuarios", error.message, "error");
    renderizarUsuarios([]);
  }
}

function renderizarUsuarios(usuarios) {
  estadoUsuarios.hidden = usuarios.length > 0;

  listaUsuarios.innerHTML = usuarios.map((usuario) => `
    <tr>
      <td>${escapeHTML(usuario.nome)}</td>
      <td>${escapeHTML(usuario.email || "Não informado")}</td>
      <td>${escapeHTML(formatDate(usuario.criado_em))}</td>
    </tr>
  `).join("");
}
