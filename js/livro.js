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

  capaLivro.src =
    capa ||
    "images/depois-de-te-odiar.png";

  capaLivro.alt =
    `Capa do livro ${titulo}`;

  capaLivro.addEventListener(
    "error",
    () => {
      capaLivro.src =
        "images/depois-de-te-odiar.png";
    },
    { once: true }
  );
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

function atualizarEstrelasFormul