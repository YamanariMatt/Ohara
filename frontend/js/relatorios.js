const cardsRelatorio = document.getElementById("cardsRelatorio");
const btnAtualizarRelatorio = document.getElementById("btnAtualizarRelatorio");

const metricas = [
  ["total_livros_salvos", "Livros salvos"],
  ["total_livros_disponiveis", "Livros disponíveis"],
  ["total_livros_emprestados", "Livros emprestados"],
  ["total_usuarios", "Usuários cadastrados"],
  ["total_emprestimos", "Total de empréstimos"],
  ["emprestimos_ativos", "Empréstimos ativos"],
  ["emprestimos_devolvidos", "Empréstimos devolvidos"],
];

document.addEventListener("DOMContentLoaded", () => {
  carregarRelatorio();
});

btnAtualizarRelatorio.addEventListener("click", () => carregarRelatorio());

async function carregarRelatorio() {
  setButtonLoading(btnAtualizarRelatorio, true, "Atualizando...");
  showMessage("mensagemRelatorios", "");

  try {
    const resposta = await apiRequest("/relatorios");
    renderizarRelatorio(resposta.dados || {});
    showMessage("mensagemRelatorios", resposta.mensagem, "success");
  } catch (error) {
    showMessage("mensagemRelatorios", error.message, "error");
    renderizarRelatorio({});
  } finally {
    setButtonLoading(btnAtualizarRelatorio, false);
  }
}

function renderizarRelatorio(dados) {
  cardsRelatorio.innerHTML = metricas.map(([chave, rotulo]) => `
    <article class="report-card">
      <span>${escapeHTML(rotulo)}</span>
      <strong>${escapeHTML(dados[chave] ?? 0)}</strong>
    </article>
  `).join("");
}
