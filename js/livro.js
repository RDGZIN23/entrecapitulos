// ==============================
// IMPORTAÇÕES DO FIREBASE
// ==============================

import {
  db,
  auth
} from "./firebase-config.js";

import {
  alternarFavorito,
  verificarFavorito
} from "./favoritos.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


// ==============================
// PARÂMETROS DA PÁGINA
// ==============================

const parametros =
  new URLSearchParams(window.location.search);

const livroId =
  parametros.get("id");


// ==============================
// ELEMENTOS DA PÁGINA
// ==============================

const tituloLivro =
  document.getElementById("tituloLivro");

const autorLivro =
  document.getElementById("autorLivro");

const generoLivro =
  document.getElementById("generoLivro");

const sinopseLivro =
  document.getElementById("sinopseLivro");

const capaLivro =
  document.getElementById("capaLivro");

const listaCapitulos =
  document.getElementById("listaCapitulos");

const quantidadeCapitulos =
  document.getElementById("quantidadeCapitulos");

const botaoComecarLeitura =
  document.getElementById("botaoComecarLeitura");

const botaoFavorito =
  document.getElementById("botaoFavorito");

const seloStatusLivro =
  document.getElementById("seloStatusLivro");

const seloGeneroLivro =
  document.getElementById("seloGeneroLivro");

const seloQuantidadeLivro =
  document.getElementById("seloQuantidadeLivro");

const painelProgresso =
  document.getElementById("painelProgresso");

const porcentagemProgresso =
  document.getElementById("porcentagemProgresso");

const barraProgressoLivro =
  document.getElementById("barraProgressoLivro");

const descricaoProgresso =
  document.getElementById("descricaoProgresso");

const nomeAutorSecao =
  document.getElementById("nomeAutorSecao");

const estrelasLivro =
  document.getElementById("estrelasLivro");

const textoAvaliacaoLivro =
  document.getElementById("textoAvaliacaoLivro");

const mediaAvaliacoes =
  document.getElementById("mediaAvaliacoes");

const estrelasMedia =
  document.getElementById("estrelasMedia");

const totalAvaliacoes =
  document.getElementById("totalAvaliacoes");

const areaAvaliacoes =
  document.querySelector(".mensagem-avaliacao");


// ==============================
// DADOS TEMPORÁRIOS
// ==============================

let livroAtual = null;
let capitulosPublicados = [];
let avaliacoesLivro = [];
let usuarioAtual = null;
let avaliacaoUsuarioAtual = null;
let notaSelecionada = 0;


// ==============================
// PROTEGER TEXTOS DO HTML
// ==============================

function escaparHTML(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


// ==============================
// FORMATAR DATA
// ==============================

function formatarData(timestamp) {
  if (!timestamp) {
    return "Agora";
  }

  try {
    const data =
      typeof timestamp.toDate === "function"
        ? timestamp.toDate()
        : new Date(timestamp);

    return data.toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    );

  } catch (erro) {
    return "Data não disponível";
  }
}


// ==============================
// CRIAR ESTRELAS
// ==============================

function criarTextoEstrelas(nota = 0) {
  const valor =
    Math.min(
      5,
      Math.max(
        0,
        Math.round(Number(nota) || 0)
      )
    );

  return (
    "★".repeat(valor) +
    "☆".repeat(5 - valor)
  );
}


// ==============================
// LER LOCALSTORAGE
// ==============================

function lerLocalStorage(
  chave,
  valorPadrao = null
) {
  try {
    const valor =
      localStorage.getItem(chave);

    if (!valor) {
      return valorPadrao;
    }

    return JSON.parse(valor);

  } catch (erro) {
    console.error(
      `Erro ao ler ${chave}:`,
      erro
    );

    return valorPadrao;
  }
}


// ==============================
// NORMALIZAR LISTA
// ==============================

function transformarEmLista(valor) {
  if (Array.isArray(valor)) {
    return valor;
  }

  if (
    valor &&
    typeof valor === "object"
  ) {
    return Object.values(valor);
  }

  return [];
}


// ==============================
// OBTER CAPÍTULOS LIDOS
// ==============================

function obterIdsCapitulosLidos() {
  const dados =
    lerLocalStorage(
      "capitulosLidos",
      []
    );

  return transformarEmLista(dados)
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return (
        item?.capituloId ||
        item?.id ||
        null
      );
    })
    .filter(Boolean);
}


// ==============================
// OBTER ÚLTIMO CAPÍTULO
// ==============================

function obterUltimoCapituloLido() {
  const progresso =
    lerLocalStorage(
      "ultimoCapituloLido",
      null
    );

  if (
    !progresso ||
    typeof progresso !== "object"
  ) {
    return null;
  }

  const idLivroSalvo =
    progresso.livroId ||
    progresso.idLivro;

  if (
    idLivroSalvo &&
    idLivroSalvo !== livroId
  ) {
    return null;
  }

  return progresso;
}


// ==============================
// VERIFICAR LIVRO INICIADO
// ==============================

function livroFoiIniciado() {
  const livros =
    lerLocalStorage(
      "livrosIniciados",
      []
    );

  return transformarEmLista(livros)
    .some((item) => {
      if (typeof item === "string") {
        return item === livroId;
      }

      return (
        item?.livroId === livroId ||
        item?.id === livroId
      );
    });
}


// ==============================
// EXIBIR ERRO
// ==============================

function mostrarErro(mensagem) {
  if (tituloLivro) {
    tituloLivro.textContent =
      "Livro não encontrado";
  }

  if (autorLivro) {
    autorLivro.textContent =
      "Autor desconhecido";
  }

  if (generoLivro) {
    generoLivro.textContent =
      "Indisponível";
  }

  if (sinopseLivro) {
    sinopseLivro.textContent =
      mensagem;
  }

  if (listaCapitulos) {
    listaCapitulos.innerHTML = `
      <p class="mensagem-status">
        ${escaparHTML(mensagem)}
      </p>
    `;
  }

  atualizarQuantidadeCapitulos(0);

  desativarBotaoLeitura(
    "Livro indisponível"
  );

  if (botaoFavorito) {
    botaoFavorito.disabled = true;
    botaoFavorito.style.opacity = "0.6";
  }
}


// ==============================
// BOTÃO DE LEITURA
// ==============================

function desativarBotaoLeitura(texto) {
  if (!botaoComecarLeitura) {
    return;
  }

  botaoComecarLeitura.href = "#";
  botaoComecarLeitura.textContent =
    texto;

  botaoComecarLeitura.style.pointerEvents =
    "none";

  botaoComecarLeitura.style.opacity =
    "0.6";
}


function ativarBotaoLeitura(
  capituloId,
  texto
) {
  if (
    !botaoComecarLeitura ||
    !capituloId
  ) {
    return;
  }

  botaoComecarLeitura.href =
    `leitura.html?id=${capituloId}`;

  botaoComecarLeitura.textContent =
    texto;

  botaoComecarLeitura.style.pointerEvents =
    "auto";

  botaoComecarLeitura.style.opacity =
    "1";
}


// ==============================
// CONFIGURAR CAPA
// ==============================

function configurarCapa(
  capa,
  titulo
) {
  if (!capaLivro) {
    return;
  }

  const container =
    document.getElementById(
      "capaLivroContainer"
    );

  const skeleton =
    document.getElementById(
      "skeletonCapa"
    );

  // Estado inicial
  capaLivro.hidden = true;

  capaLivro.classList.remove(
    "capa-carregada"
  );

  container?.classList.remove(
    "capa-pronta",
    "capa-sem-imagem"
  );

  skeleton?.classList.remove(
    "skeleton-capa-erro"
  );

  capaLivro.alt =
    titulo
      ? `Capa do livro ${titulo}`
      : "Capa do livro";

  const urlCapa =
    String(capa || "").trim();

  // Livro sem capa
  if (!urlCapa) {
    container?.classList.add(
      "capa-sem-imagem"
    );

    skeleton?.classList.add(
      "skeleton-capa-erro"
    );

    return;
  }

  // Quando a capa carregar
  capaLivro.onload = () => {
    capaLivro.hidden = false;

    requestAnimationFrame(() => {
      capaLivro.classList.add(
        "capa-carregada"
      );
    });

    container?.classList.add(
      "capa-pronta"
    );
  };

  // Se a capa falhar
  capaLivro.onerror = () => {
    console.warn(
      "Erro ao carregar a capa:",
      urlCapa
    );

    capaLivro.hidden = true;

    container?.classList.add(
      "capa-sem-imagem"
    );

    skeleton?.classList.add(
      "skeleton-capa-erro"
    );
  };

  // Só coloca o src no final
  capaLivro.src = urlCapa;
}


// ==============================
// CONFIGURAR SELOS
// ==============================

function configurarSelos(livro) {
  const genero =
    livro.genero ||
    "Literatura";

  const status =
    String(
      livro.status ||
      "publicado"
    ).toLowerCase();

  if (seloGeneroLivro) {
    seloGeneroLivro.textContent =
      `📚 ${genero}`;
  }

  if (!seloStatusLivro) {
    return;
  }

  if (
    livro.destaque === true ||
    livro.emDestaque === true
  ) {
    seloStatusLivro.textContent =
      "✨ Em destaque";

  } else if (
    status === "concluido" ||
    status === "concluído" ||
    status === "finalizado"
  ) {
    seloStatusLivro.textContent =
      "✅ História concluída";

  } else {
    seloStatusLivro.textContent =
      "🆕 Em publicação";
  }
}


// ==============================
// MOSTRAR RESUMO DAS AVALIAÇÕES
// ==============================

function configurarAvaliacoes(
  media = 0,
  total = 0
) {
  const mediaValida =
    Math.min(
      5,
      Math.max(
        0,
        Number(media) || 0
      )
    );

  const quantidade =
    Math.max(
      0,
      Number(total) || 0
    );

  const textoEstrelas =
    criarTextoEstrelas(mediaValida);

  if (estrelasLivro) {
    estrelasLivro.textContent =
      textoEstrelas;
  }

  if (estrelasMedia) {
    estrelasMedia.textContent =
      textoEstrelas;
  }

  if (mediaAvaliacoes) {
    mediaAvaliacoes.textContent =
      mediaValida
        .toFixed(1)
        .replace(".", ",");
  }

  const textoQuantidade =
    quantidade === 1
      ? "1 avaliação"
      : `${quantidade} avaliações`;

  if (textoAvaliacaoLivro) {
    textoAvaliacaoLivro.textContent =
      quantidade > 0
        ? textoQuantidade
        : "Ainda sem avaliações";
  }

  if (totalAvaliacoes) {
    totalAvaliacoes.textContent =
      quantidade > 0
        ? textoQuantidade
        : "Nenhuma avaliação";
  }
}


// ==============================
// ADICIONAR ESTILOS DAS AVALIAÇÕES
// ==============================

function adicionarEstilosAvaliacoes() {
  if (
    document.getElementById(
      "estilosSistemaAvaliacoes"
    )
  ) {
    return;
  }

  const estilo =
    document.createElement("style");

  estilo.id =
    "estilosSistemaAvaliacoes";

  estilo.textContent = `
    .area-sistema-avaliacoes {
      display: grid;
      gap: 22px;
    }

    .formulario-avaliacao {
      padding: 20px;
      border: 1px solid rgba(124, 77, 255, 0.22);
      border-radius: 16px;
      background: rgba(124, 77, 255, 0.055);
    }

    .formulario-avaliacao h3 {
      margin: 0 0 8px;
      color: #ffffff;
      font-size: 18px;
    }

    .formulario-avaliacao p {
      margin: 0 0 16px;
      color: #aaaab5;
      font-size: 14px;
      line-height: 1.6;
    }

    .seletor-estrelas {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      margin-bottom: 16px;
    }

    .estrela-selecionavel {
      padding: 0;
      border: none;
      background: transparent;
      color: #676772;
      font-size: 32px;
      line-height: 1;
      cursor: pointer;
      transition:
        color 0.2s ease,
        transform 0.2s ease;
    }

    .estrela-selecionavel:hover {
      transform: scale(1.12);
    }

    .estrela-selecionavel.ativa {
      color: #ffc95c;
    }

    .campo-resenha {
      width: 100%;
      min-height: 120px;
      resize: vertical;
      padding: 14px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      outline: none;
      background: rgba(10, 10, 16, 0.72);
      color: #ffffff;
      font-family: inherit;
      font-size: 15px;
      line-height: 1.6;
    }

    .campo-resenha:focus {
      border-color: rgba(124, 77, 255, 0.65);
      box-shadow: 0 0 0 3px rgba(124, 77, 255, 0.1);
    }

    .rodape-formulario-avaliacao {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
    }

    .contador-resenha {
      color: #8f8f9b;
      font-size: 12px;
    }

    .botao-publicar-avaliacao {
      min-height: 43px;
      padding: 10px 17px;
      border: none;
      border-radius: 11px;
      background: linear-gradient(
        135deg,
        #7145ff,
        #9a54ff
      );
      color: #ffffff;
      font-family: inherit;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
    }

    .botao-publicar-avaliacao:disabled {
      opacity: 0.55;
      cursor: wait;
    }

    .mensagem-formulario-avaliacao {
      min-height: 19px;
      margin: 12px 0 0 !important;
      font-size: 13px !important;
    }

    .mensagem-formulario-avaliacao.sucesso {
      color: #71dda4;
    }

    .mensagem-formulario-avaliacao.erro {
      color: #ff9aaa;
    }

    .aviso-login-avaliacao {
      padding: 20px;
      border: 1px dashed rgba(124, 77, 255, 0.3);
      border-radius: 15px;
      background: rgba(124, 77, 255, 0.055);
      color: #b9b9c5;
      line-height: 1.6;
      text-align: center;
    }

    .aviso-login-avaliacao a {
      color: #cbb7ff;
      font-weight: bold;
    }

    .titulo-lista-avaliacoes {
      margin: 0;
      color: #ffffff;
      font-size: 18px;
    }

    .lista-avaliacoes-leitores {
      display: grid;
      gap: 13px;
    }

    .cartao-avaliacao-leitor {
      padding: 17px;
      border: 1px solid rgba(255, 255, 255, 0.075);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.025);
    }

    .cabecalho-avaliacao-leitor {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 11px;
    }

    .dados-leitor-avaliacao {
      display: flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
    }

    .avatar-leitor-avaliacao {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(124, 77, 255, 0.17);
      color: #d5c5ff;
      font-size: 14px;
      font-weight: bold;
    }

    .nome-leitor-avaliacao {
      display: block;
      color: #ffffff;
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .data-avaliacao {
      display: block;
      margin-top: 3px;
      color: #858590;
      font-size: 11px;
    }

    .estrelas-cartao-avaliacao {
      flex: 0 0 auto;
      color: #ffc95c;
      font-size: 15px;
      letter-spacing: 1px;
    }

    .texto-resenha-leitor {
      margin: 0;
      color: #bcbcc6;
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-line;
      overflow-wrap: anywhere;
    }

    .selo-sua-avaliacao {
      display: inline-block;
      margin-top: 11px;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(124, 77, 255, 0.14);
      color: #cbb8ff;
      font-size: 11px;
      font-weight: bold;
    }

    .sem-avaliacoes {
      padding: 18px;
      border: 1px dashed rgba(255, 255, 255, 0.11);
      border-radius: 13px;
      color: #9999a5;
      line-height: 1.6;
      text-align: center;
    }

    @media (max-width: 600px) {
      .rodape-formulario-avaliacao {
        align-items: stretch;
        flex-direction: column;
      }

      .botao-publicar-avaliacao {
        width: 100%;
      }

      .cabecalho-avaliacao-leitor {
        flex-direction: column;
      }
    }
  `;

  document.head.appendChild(estilo);
}


// ==============================
// MONTAR ÁREA DE AVALIAÇÕES
// ==============================

function montarInterfaceAvaliacoes() {
  if (!areaAvaliacoes) {
    return;
  }

  adicionarEstilosAvaliacoes();

  areaAvaliacoes.className =
    "area-sistema-avaliacoes";

  areaAvaliacoes.innerHTML = `
    <div id="conteudoFormularioAvaliacao">
      <div class="aviso-login-avaliacao">
        Verificando sua conta...
      </div>
    </div>

    <h3 class="titulo-lista-avaliacoes">
      Resenhas publicadas
    </h3>

    <div
      class="lista-avaliacoes-leitores"
      id="listaAvaliacoesLeitores"
    >
      <div class="sem-avaliacoes">
        Carregando avaliações...
      </div>
    </div>
  `;
}


// ==============================
// PEGAR INICIAIS DO LEITOR
// ==============================

function obterIniciais(nome = "") {
  const partes =
    String(nome)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (partes.length === 0) {
    return "L";
  }

  if (partes.length === 1) {
    return partes[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    partes[0][0] +
    partes[partes.length - 1][0]
  ).toUpperCase();
}


// ==============================
// OBTER NOME DO USUÁRIO
// ==============================

async function obterNomeUsuario(usuario) {
  if (!usuario) {
    return "Leitor";
  }

  if (usuario.displayName) {
    return usuario.displayName;
  }

  try {
    const referencia =
      doc(
        db,
        "usuarios",
        usuario.uid
      );

    const resultado =
      await getDoc(referencia);

    if (resultado.exists()) {
      const dados =
        resultado.data();

      return (
        dados.nome ||
        dados.nomeCompleto ||
        dados.usuario ||
        usuario.email?.split("@")[0] ||
        "Leitor"
      );
    }

  } catch (erro) {
    console.warn(
      "Não foi possível carregar o nome:",
      erro
    );
  }

  return (
    usuario.email?.split("@")[0] ||
    "Leitor"
  );
}


// ==============================
// MOSTRAR FORMULÁRIO
// ==============================

function mostrarFormularioAvaliacao() {
  const conteudo =
    document.getElementById(
      "conteudoFormularioAvaliacao"
    );

  if (!conteudo) {
    return;
  }

  if (!usuarioAtual) {
    conteudo.innerHTML = `
      <div class="aviso-login-avaliacao">
        Para dar estrelas e escrever uma resenha,
        <a href="login.html">
          entre na sua conta
        </a>.
      </div>
    `;

    return;
  }

  const comentarioAtual =
    avaliacaoUsuarioAtual?.comentario ||
    "";

  notaSelecionada =
    Number(
      avaliacaoUsuarioAtual?.nota ||
      0
    );

  const textoBotao =
    avaliacaoUsuarioAtual
      ? "Atualizar avaliação"
      : "Publicar avaliação";

  conteudo.innerHTML = `
    <form
      class="formulario-avaliacao"
      id="formularioAvaliacao"
    >
      <h3>
        ${
          avaliacaoUsuarioAtual
            ? "Edite sua avaliação"
            : "Avalie esta história"
        }
      </h3>

      <p>
        Escolha de 1 a 5 estrelas e compartilhe
        sua opinião com outros leitores.
      </p>

      <div
        class="seletor-estrelas"
        id="seletorEstrelas"
        aria-label="Escolha uma nota"
      >
        ${[1, 2, 3, 4, 5]
          .map(
            (numero) => `
              <button
                type="button"
                class="estrela-selecionavel ${
                  numero <= notaSelecionada
                    ? "ativa"
                    : ""
                }"
                data-nota="${numero}"
                aria-label="${numero} ${
                  numero === 1
                    ? "estrela"
                    : "estrelas"
                }"
              >
                ★
              </button>
            `
          )
          .join("")}
      </div>

      <textarea
        class="campo-resenha"
        id="campoResenha"
        maxlength="1000"
        placeholder="Conte o que você achou desta história..."
      >${escaparHTML(comentarioAtual)}</textarea>

      <div class="rodape-formulario-avaliacao">
        <span
          class="contador-resenha"
          id="contadorResenha"
        >
          ${comentarioAtual.length}/1000
        </span>

        <button
          type="submit"
          class="botao-publicar-avaliacao"
          id="botaoPublicarAvaliacao"
        >
          ${textoBotao}
        </button>
      </div>

      <p
        class="mensagem-formulario-avaliacao"
        id="mensagemFormularioAvaliacao"
      ></p>
    </form>
  `;

  configurarEventosFormulario();
}


// ==============================
// ATUALIZAR ESTRELAS DO FORMULÁRIO
// ==============================

function atualizarEstrelasFormulario() {
  const estrelas =
    document.querySelectorAll(
      ".estrela-selecionavel"
    );

  estrelas.forEach((estrela) => {
    const nota =
      Number(
        estrela.dataset.nota
      );

    estrela.classList.toggle(
      "ativa",
      nota <= notaSelecionada
    );
  });
}


// ==============================
// MOSTRAR MENSAGEM DO FORMULÁRIO
// ==============================

function mostrarMensagemAvaliacao(
  mensagem,
  tipo = ""
) {
  const elemento =
    document.getElementById(
      "mensagemFormularioAvaliacao"
    );

  if (!elemento) {
    return;
  }

  elemento.textContent =
    mensagem;

  elemento.className =
    "mensagem-formulario-avaliacao";

  if (tipo) {
    elemento.classList.add(tipo);
  }
}


// ==============================
// CONFIGURAR EVENTOS DO FORMULÁRIO
// ==============================

function configurarEventosFormulario() {
  const formulario =
    document.getElementById(
      "formularioAvaliacao"
    );

  const estrelas =
    document.querySelectorAll(
      ".estrela-selecionavel"
    );

  const campoResenha =
    document.getElementById(
      "campoResenha"
    );

  const contadorResenha =
    document.getElementById(
      "contadorResenha"
    );

  estrelas.forEach((estrela) => {
    estrela.addEventListener(
      "click",
      () => {
        notaSelecionada =
          Number(
            estrela.dataset.nota
          );

        atualizarEstrelasFormulario();

        mostrarMensagemAvaliacao("");
      }
    );
  });

  if (
    campoResenha &&
    contadorResenha
  ) {
    campoResenha.addEventListener(
      "input",
      () => {
        contadorResenha.textContent =
          `${campoResenha.value.length}/1000`;
      }
    );
  }

  if (!formulario) {
    return;
  }

  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();

      await salvarAvaliacao();
    }
  );
}


// ==============================
// VALIDAR AVALIAÇÃO
// ==============================

function validarAvaliacao(
  nota,
  comentario
) {
  if (!usuarioAtual) {
    return {
      valida: false,
      mensagem:
        "Entre na sua conta para avaliar esta história."
    };
  }

  if (!livroId) {
    return {
      valida: false,
      mensagem:
        "Não foi possível identificar este livro."
    };
  }

  if (
    !Number.isInteger(nota) ||
    nota < 1 ||
    nota > 5
  ) {
    return {
      valida: false,
      mensagem:
        "Escolha uma nota de 1 a 5 estrelas."
    };
  }

  if (comentario.length < 3) {
    return {
      valida: false,
      mensagem:
        "Escreva uma resenha com pelo menos 3 caracteres."
    };
  }

  if (comentario.length > 1000) {
    return {
      valida: false,
      mensagem:
        "Sua resenha não pode ultrapassar 1000 caracteres."
    };
  }

  return {
    valida: true,
    mensagem: ""
  };
}


// ==============================
// SALVAR OU ATUALIZAR AVALIAÇÃO
// ==============================

async function salvarAvaliacao() {
  const campoResenha =
    document.getElementById(
      "campoResenha"
    );

  const botaoPublicar =
    document.getElementById(
      "botaoPublicarAvaliacao"
    );

  const comentario =
    campoResenha?.value
      .trim() ||
    "";

  const validacao =
    validarAvaliacao(
      notaSelecionada,
      comentario
    );

  if (!validacao.valida) {
    mostrarMensagemAvaliacao(
      validacao.mensagem,
      "erro"
    );

    return;
  }

  if (!usuarioAtual) {
    return;
  }

  try {
    if (botaoPublicar) {
      botaoPublicar.disabled =
        true;

      botaoPublicar.textContent =
        "Salvando...";
    }

    mostrarMensagemAvaliacao(
      "Salvando sua avaliação..."
    );

    const nomeUsuario =
      await obterNomeUsuario(
        usuarioAtual
      );

    const avaliacaoId =
      `${livroId}_${usuarioAtual.uid}`;

    const referenciaAvaliacao =
      doc(
        db,
        "avaliacoes",
        avaliacaoId
      );

    const dadosAvaliacao = {
      livroId,
      usuarioId:
        usuarioAtual.uid,

      usuarioNome:
        nomeUsuario,

      usuarioEmail:
        usuarioAtual.email ||
        "",

      nota:
        notaSelecionada,

      comentario,

      atualizadoEm:
        serverTimestamp()
    };

    if (!avaliacaoUsuarioAtual) {
      dadosAvaliacao.criadoEm =
        serverTimestamp();
    }

    await setDoc(
      referenciaAvaliacao,
      dadosAvaliacao,
      {
        merge: true
      }
    );

    avaliacaoUsuarioAtual = {
      ...avaliacaoUsuarioAtual,
      ...dadosAvaliacao,
      id: avaliacaoId,
      criadoEm:
        avaliacaoUsuarioAtual
          ?.criadoEm ||
        new Date(),
      atualizadoEm:
        new Date()
    };

    mostrarMensagemAvaliacao(
      avaliacaoUsuarioAtual
        ? "Avaliação salva com sucesso."
        : "Avaliação publicada com sucesso.",
      "sucesso"
    );

    await carregarAvaliacoes();

    mostrarFormularioAvaliacao();

  } catch (erro) {
    console.error(
      "Erro ao salvar avaliação:",
      erro
    );

    mostrarMensagemAvaliacao(
      "Não foi possível salvar sua avaliação. Verifique as regras do Firebase.",
      "erro"
    );

  } finally {
    const novoBotao =
      document.getElementById(
        "botaoPublicarAvaliacao"
      );

    if (novoBotao) {
      novoBotao.disabled =
        false;

      novoBotao.textContent =
        avaliacaoUsuarioAtual
          ? "Atualizar avaliação"
          : "Publicar avaliação";
    }
  }
}


// ==============================
// CARREGAR AVALIAÇÕES DO LIVRO
// ==============================

async function carregarAvaliacoes() {
  const lista =
    document.getElementById(
      "listaAvaliacoesLeitores"
    );

  if (!livroId) {
    configurarAvaliacoes(0, 0);

    if (lista) {
      lista.innerHTML = `
        <div class="sem-avaliacoes">
          Livro não identificado.
        </div>
      `;
    }

    return;
  }

  try {
    const consulta =
      query(
        collection(
          db,
          "avaliacoes"
        ),
        where(
          "livroId",
          "==",
          livroId
        )
      );

    const resultado =
      await getDocs(consulta);

    avaliacoesLivro =
      resultado.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

    avaliacoesLivro.sort(
      (a, b) => {
        const dataA =
          a.atualizadoEm?.seconds ||
          a.criadoEm?.seconds ||
          0;

        const dataB =
          b.atualizadoEm?.seconds ||
          b.criadoEm?.seconds ||
          0;

        return dataB - dataA;
      }
    );

    if (usuarioAtual) {
      avaliacaoUsuarioAtual =
        avaliacoesLivro.find(
          (avaliacao) =>
            avaliacao.usuarioId ===
            usuarioAtual.uid
        ) || null;

    } else {
      avaliacaoUsuarioAtual =
        null;
    }

    const total =
      avaliacoesLivro.length;

    const soma =
      avaliacoesLivro.reduce(
        (acumulador, avaliacao) =>
          acumulador +
          Number(
            avaliacao.nota || 0
          ),
        0
      );

    const media =
      total > 0
        ? soma / total
        : 0;

    configurarAvaliacoes(
      media,
      total
    );

    mostrarListaAvaliacoes();

  } catch (erro) {
    console.error(
      "Erro ao carregar avaliações:",
      erro
    );

    configurarAvaliacoes(0, 0);

    if (lista) {
      lista.innerHTML = `
        <div class="sem-avaliacoes">
          Não foi possível carregar as avaliações.
        </div>
      `;
    }
  }
}


// ==============================
// MOSTRAR LISTA DE AVALIAÇÕES
// ==============================

function mostrarListaAvaliacoes() {
  const lista =
    document.getElementById(
      "listaAvaliacoesLeitores"
    );

  if (!lista) {
    return;
  }

  if (
    !Array.isArray(avaliacoesLivro) ||
    avaliacoesLivro.length === 0
  ) {
    lista.innerHTML = `
      <div class="sem-avaliacoes">
        Ainda não existem avaliações.
        Seja a primeira pessoa a avaliar esta história.
      </div>
    `;

    return;
  }

  lista.innerHTML =
    avaliacoesLivro
      .map((avaliacao) => {
        const nome =
          avaliacao.usuarioNome ||
          "Leitor";

        const comentario =
          avaliacao.comentario ||
          "";

        const nota =
          Number(
            avaliacao.nota || 0
          );

        const data =
          avaliacao.atualizadoEm ||
          avaliacao.criadoEm;

        const pertenceAoUsuario =
          usuarioAtual &&
          avaliacao.usuarioId ===
            usuarioAtual.uid;

        return `
          <article
            class="cartao-avaliacao-leitor"
          >
            <div
              class="cabecalho-avaliacao-leitor"
            >
              <div
                class="dados-leitor-avaliacao"
              >
                <div
                  class="avatar-leitor-avaliacao"
                >
                  ${escaparHTML(
                    obterIniciais(nome)
                  )}
                </div>

                <div>
                  <strong
                    class="nome-leitor-avaliacao"
                  >
                    ${escaparHTML(nome)}
                  </strong>

                  <span
                    class="data-avaliacao"
                  >
                    ${escaparHTML(
                      formatarData(data)
                    )}
                  </span>
                </div>
              </div>

              <div
                class="estrelas-cartao-avaliacao"
                aria-label="${nota} estrelas"
              >
                ${criarTextoEstrelas(nota)}
              </div>
            </div>

            <p
              class="texto-resenha-leitor"
            >${escaparHTML(comentario)}</p>

            ${
              pertenceAoUsuario
                ? `
                  <span
                    class="selo-sua-avaliacao"
                  >
                    Sua avaliação
                  </span>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");
}


// ==============================
// ATUALIZAR QUANTIDADE DE CAPÍTULOS
// ==============================

function atualizarQuantidadeCapitulos(
  quantidade = 0
) {
  const total =
    Math.max(
      0,
      Number(quantidade) || 0
    );

  const texto =
    total === 1
      ? "1 capítulo"
      : `${total} capítulos`;

  if (quantidadeCapitulos) {
    quantidadeCapitulos.textContent =
      texto;
  }

  if (seloQuantidadeLivro) {
    seloQuantidadeLivro.textContent =
      `📖 ${texto}`;
  }
}


// ==============================
// CALCULAR PROGRESSO DO LIVRO
// ==============================

function calcularProgressoLivro() {
  if (
    !Array.isArray(capitulosPublicados) ||
    capitulosPublicados.length === 0
  ) {
    return {
      lidos: 0,
      total: 0,
      porcentagem: 0
    };
  }

  const idsLidos =
    obterIdsCapitulosLidos();

  const capitulosLidos =
    capitulosPublicados.filter(
      (capitulo) =>
        idsLidos.includes(capitulo.id)
    );

  const total =
    capitulosPublicados.length;

  const lidos =
    capitulosLidos.length;

  const porcentagem =
    total > 0
      ? Math.round(
          (lidos / total) * 100
        )
      : 0;

  return {
    lidos,
    total,
    porcentagem
  };
}


// ==============================
// ATUALIZAR PAINEL DE PROGRESSO
// ==============================

function atualizarPainelProgresso() {
  if (!painelProgresso) {
    return;
  }

  const progresso =
    calcularProgressoLivro();

  const iniciado =
    livroFoiIniciado() ||
    progresso.lidos > 0;

  if (!iniciado) {
    painelProgresso.style.display =
      "none";

    return;
  }

  painelProgresso.style.display =
    "";

  if (porcentagemProgresso) {
    porcentagemProgresso.textContent =
      `${progresso.porcentagem}%`;
  }

  if (barraProgressoLivro) {
    barraProgressoLivro.style.width =
      `${progresso.porcentagem}%`;

    barraProgressoLivro.setAttribute(
      "aria-valuenow",
      String(progresso.porcentagem)
    );
  }

  if (descricaoProgresso) {
    if (
      progresso.total > 0 &&
      progresso.lidos >= progresso.total
    ) {
      descricaoProgresso.textContent =
        "Você concluiu esta história. 🎉";

    } else if (progresso.lidos === 1) {
      descricaoProgresso.textContent =
        `Você leu 1 de ${progresso.total} capítulos.`;

    } else {
      descricaoProgresso.textContent =
        `Você leu ${progresso.lidos} de ${progresso.total} capítulos.`;
    }
  }
}


// ==============================
// DEFINIR BOTÃO PRINCIPAL DE LEITURA
// ==============================

function atualizarBotaoPrincipalLeitura() {
  if (
    !Array.isArray(capitulosPublicados) ||
    capitulosPublicados.length === 0
  ) {
    desativarBotaoLeitura(
      "Nenhum capítulo publicado"
    );

    return;
  }

  const primeiroCapitulo =
    capitulosPublicados[0];

  const ultimoLido =
    obterUltimoCapituloLido();

  const idUltimoCapitulo =
    ultimoLido?.capituloId ||
    ultimoLido?.id ||
    null;

  const capituloEncontrado =
    capitulosPublicados.find(
      (capitulo) =>
        capitulo.id ===
        idUltimoCapitulo
    );

  if (capituloEncontrado) {
    ativarBotaoLeitura(
      capituloEncontrado.id,
      "Continuar leitura"
    );

    return;
  }

  ativarBotaoLeitura(
    primeiroCapitulo.id,
    "Começar leitura"
  );
}


// ==============================
// ATUALIZAR FAVORITO NA TELA
// ==============================

function atualizarVisualFavorito(
  favorito
) {
  if (!botaoFavorito) {
    return;
  }

  botaoFavorito.classList.toggle(
    "favoritado",
    favorito
  );

  botaoFavorito.setAttribute(
    "aria-pressed",
    favorito
      ? "true"
      : "false"
  );

  botaoFavorito.innerHTML =
    favorito
      ? "❤️ Remover dos favoritos"
      : "♡ Adicionar aos favoritos";
}


// ==============================
// VERIFICAR ESTADO DO FAVORITO
// ==============================

async function carregarEstadoFavorito() {
  if (!botaoFavorito) {
    return;
  }

  if (!usuarioAtual) {
    atualizarVisualFavorito(false);

    botaoFavorito.disabled = false;
    botaoFavorito.style.opacity = "1";

    return;
  }

  try {
    botaoFavorito.disabled = true;

    const resultado =
      await verificarFavorito(
        livroId,
        usuarioAtual.uid
      );

    const estaFavoritado =
      typeof resultado === "boolean"
        ? resultado
        : Boolean(
            resultado?.favorito ||
            resultado?.favoritado ||
            resultado?.existe
          );

    atualizarVisualFavorito(
      estaFavoritado
    );

  } catch (erro) {
    console.error(
      "Erro ao verificar favorito:",
      erro
    );

    atualizarVisualFavorito(false);

  } finally {
    botaoFavorito.disabled = false;
    botaoFavorito.style.opacity = "1";
  }
}


// ==============================
// CLIQUE NO BOTÃO DE FAVORITO
// ==============================

async function clicarBotaoFavorito() {
  if (!usuarioAtual) {
    const confirmarLogin =
      window.confirm(
        "Você precisa entrar na sua conta para adicionar livros aos favoritos. Deseja entrar agora?"
      );

    if (confirmarLogin) {
      window.location.href =
        "entrar.html";
    }

    return;
  }

  if (
    !livroId ||
    !livroAtual
  ) {
    window.alert(
      "Não foi possível identificar este livro."
    );

    return;
  }

  try {
    botaoFavorito.disabled =
      true;

    botaoFavorito.style.opacity =
      "0.65";

    const resultado =
      await alternarFavorito({
        livroId,

        titulo:
          livroAtual.titulo ||
          "Livro",

        autor:
          livroAtual.autor ||
          "Autor não informado",

        capa:
  livroAtual.capa || ""
      });

    if (
      resultado.redirecionado
    ) {
      return;
    }

    atualizarVisualFavorito(
      resultado.favoritado
    );

  } catch (erro) {
    console.error(
      "Erro ao alterar favorito:",
      erro
    );

    window.alert(
      "Não foi possível atualizar seus favoritos."
    );

    const favoritoAtual =
      await verificarFavorito(
        livroId
      );

    atualizarVisualFavorito(
      favoritoAtual
    );

  } finally {
    botaoFavorito.disabled =
      false;

    botaoFavorito.style.opacity =
      "1";
  }
}


// ==============================
// CONFIGURAR BOTÃO DE FAVORITO
// ==============================

function configurarBotaoFavorito() {
  if (!botaoFavorito) {
    return;
  }

  botaoFavorito.addEventListener(
    "click",
    async (evento) => {
      evento.preventDefault();

      await clicarBotaoFavorito();
    }
  );
}


// ==============================
// CARREGAR DADOS DO LIVRO
// ==============================

async function carregarLivro() {
  if (!livroId) {
    mostrarErro(
      "O endereço deste livro está incompleto."
    );
    return;
  }

  try {
    const referencia =
      doc(db, "livros", livroId);

    const resultado =
      await getDoc(referencia);

    if (!resultado.exists()) {
      mostrarErro(
        "Este livro não foi encontrado."
      );
      return;
    }

    livroAtual = {
      id: resultado.id,
      ...resultado.data()
    };

    if (tituloLivro) {
      tituloLivro.textContent =
        livroAtual.titulo ||
        "Sem título";
    }

    if (autorLivro) {
      autorLivro.textContent =
        livroAtual.autor ||
        "Autor desconhecido";
    }

    if (nomeAutorSecao) {
      nomeAutorSecao.textContent =
        livroAtual.autor ||
        "Autor desconhecido";
    }

    if (generoLivro) {
      generoLivro.textContent =
        livroAtual.genero ||
        "Literatura";
    }

    if (sinopseLivro) {
      sinopseLivro.textContent =
        livroAtual.sinopse ||
        "Este livro ainda não possui uma sinopse.";
    }

    configurarCapa(
      livroAtual.capa,
      livroAtual.titulo
    );

    configurarSelos(
      livroAtual
    );

    await carregarCapitulos();

    await carregarAvaliacoes();

    atualizarPainelProgresso();

    atualizarBotaoPrincipalLeitura();

    if (usuarioAtual) {
      await carregarEstadoFavorito();
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar livro:",
      erro
    );

    mostrarErro(
      "Não foi possível carregar este livro."
    );
  }
}


// ==============================
// CARREGAR CAPÍTULOS PUBLICADOS
// ==============================

async function carregarCapitulos() {
  if (!listaCapitulos) {
    return;
  }

  listaCapitulos.innerHTML = `
    <p class="mensagem-status">
      Carregando capítulos...
    </p>
  `;

  try {
    const consultaCapitulos =
      query(
        collection(
          db,
          "capitulos"
        ),
        where(
          "livroId",
          "==",
          livroId
        ),
        where(
          "status",
          "==",
          "publicado"
        )
      );

    const resultado =
      await getDocs(
        consultaCapitulos
      );

    capitulosPublicados =
      resultado.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

    capitulosPublicados.sort(
      (a, b) =>
        Number(a.numero || 0) -
        Number(b.numero || 0)
    );

    atualizarQuantidadeCapitulos(
      capitulosPublicados.length
    );

    if (
      capitulosPublicados.length === 0
    ) {
      listaCapitulos.innerHTML = `
        <p class="mensagem-status">
          Nenhum capítulo foi publicado ainda.
        </p>
      `;

      desativarBotaoLeitura(
        "Nenhum capítulo publicado"
      );

      atualizarPainelProgresso();

      return;
    }

    listaCapitulos.innerHTML =
      capitulosPublicados
        .map((capitulo) => {
          const numero =
            Number(
              capitulo.numero || 0
            );

          const titulo =
            capitulo.titulo ||
            `Capítulo ${numero}`;

          return `
            <a
              class="item-capitulo"
              href="leitura.html?id=${capitulo.id}"
            >
              <div class="numero-capitulo">
                ${numero}
              </div>

              <div class="informacoes-capitulo">
                <span class="rotulo-capitulo">
                  Capítulo ${numero}
                </span>

                <strong class="titulo-capitulo">
                  ${escaparHTML(titulo)}
                </strong>
              </div>

              <span class="seta-capitulo">
                ›
              </span>
            </a>
          `;
        })
        .join("");

    atualizarBotaoPrincipalLeitura();

    atualizarPainelProgresso();

  } catch (erro) {
    console.error(
      "Erro ao carregar capítulos:",
      erro
    );

    capitulosPublicados = [];

    atualizarQuantidadeCapitulos(0);

    listaCapitulos.innerHTML = `
      <p class="mensagem-status">
        Não foi possível carregar os capítulos.
      </p>
    `;

    desativarBotaoLeitura(
      "Capítulos indisponíveis"
    );
  }
}


// ==============================
// INICIALIZAÇÃO DA PÁGINA
// ==============================

configurarBotaoFavorito();

montarInterfaceAvaliacoes();

onAuthStateChanged(
  auth,
  async (usuario) => {
    usuarioAtual = usuario;

    if (usuarioAtual) {
      await carregarEstadoFavorito();
    }

    await carregarAvaliacoes();

    mostrarFormularioAvaliacao();
  }
);

carregarLivro();
