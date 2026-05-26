const API_BASE_URL = "http://localhost:5000/api";

async function apiRequest(endpoint, options = {}) {
  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (error) {
    throw new Error("Não foi possível conectar ao backend. Verifique se o Flask está rodando em http://localhost:5000.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error("O servidor retornou uma resposta inválida.");
  }

  if (!response.ok || payload.sucesso === false) {
    throw new Error(payload.mensagem || "A operação não pôde ser concluída.");
  }

  return payload;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showMessage(elementId, message, type = "info") {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (!message) {
    element.innerHTML = "";
    return;
  }

  element.innerHTML = `<div class="message ${escapeHTML(type)}">${escapeHTML(message)}</div>`;
}

function formatDate(value) {
  if (!value) return "Não informado";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Não informado";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildCover(livro) {
  if (livro.capa_url) {
    return `
      <div class="cover-frame">
        <img src="${escapeHTML(livro.capa_url)}" alt="Capa de ${escapeHTML(livro.titulo)}" loading="lazy">
      </div>
    `;
  }

  return `
    <div class="cover-frame">
      <div class="cover-placeholder">Sem capa disponível</div>
    </div>
  `;
}

function getBookMeta(livro) {
  const autores = livro.autores || "Autor desconhecido";
  const ano = livro.ano_publicacao || "Ano não informado";
  const isbn = livro.isbn || "ISBN não informado";

  return `
    <p class="book-meta">
      <span><strong>Autor:</strong> ${escapeHTML(autores)}</span>
      <span><strong>Ano:</strong> ${escapeHTML(ano)}</span>
      <span><strong>ISBN:</strong> ${escapeHTML(isbn)}</span>
    </p>
  `;
}

function setButtonLoading(button, isLoading, loadingText = "Aguarde...") {
  if (!button) return;

  if (isLoading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}
