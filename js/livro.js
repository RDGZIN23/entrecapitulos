// ==============================
// IMPORTAÇÕES DO FIREBASE
// ==============================

import { db } from "./firebase-config.js";

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
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


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


// ==============================
// DADOS TEMPORÁRIOS DA PÁGINA
// ==============================

let livroAtual = null;
let capitulosPublicados = [];


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
// LER DADOS DO LOCALSTORAGE
// ==============================

function lerLocalStorage(chave, valorPadrao = null) {
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

  const lista =
    transformarEmLista(dados);

  return lista
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
// OBTER ÚLTIMO CAPÍTULO LIDO
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
// VERIFICAR SE O LIVRO FOI INICIADO
// ==============================

function livroFoiIniciado() {
  const livros =
    lerLocalStorage(
      "livrosIniciados",
      []
    );

  const lista =
    transformarEmLista(livros);

  return lista.some((item) => {
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

  if (quantidadeCapitulos) {
    quantidadeCapitulos.textContent =
      "0 capítulos";
  }

  if (seloQuantidadeLivro) {
    seloQuantidadeLivro.textContent =
      "📖 0 capítulos";
  }

  desativarBotaoLeitura(
    "Livro indisponível"
  );

  if (botaoFavorito) {
    botaoFavorito.disabled = true;
    botaoFavorito.style.opacity = "0.6";
  }
}


// ==============================
// DESATIVAR BOTÃO DE LEITURA
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


// ==============================
// ATIVAR BOTÃO DE LEITURA
// ==============================

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
// CONFIGURAR IMAGEM
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

  if (seloStatusLivro) {
    if (
      livro.destaque === true ||
      livro.emDestaque === true
    ) {
      seloStatusLivro.textContent =
        "✨ Em destaque";

    } else if (
      status === "concluido" ||
      status === "finalizado"
    ) {
      seloStatusLivro.textContent =
        "✅ História concluída";

    } else {
      seloStatusLivro.textContent =
        "🆕 Em publicação";
    }
  }
}


// ==============================
// CONFIGURAR AVALIAÇÕES
// ==============================

function configurarAvaliacoes(livro) {
  const media =
    Number(
      livro.mediaAvaliacoes ||
      livro.avaliacaoMedia ||
      0
    );

  const total =
    Number(
      livro.totalAvaliacoes ||
      0
    );

  const mediaValida =
    Math.min(
      5,
      Math.max(0, media)
    );

  const estrelasPreenchidas =
    Math.round(mediaValida);

  const textoEstrelas =
    "★".repeat(estrelasPreenchidas) +
    "☆".repeat(5 - estrelasPreenchidas);

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

  if (textoAvaliacaoLivro) {
    textoAvaliacaoLivro.textContent =
      total > 0
        ? `${total} ${
            total === 1
              ? "avaliação"
              : "avaliações"
          }`
        : "Ainda sem avaliações";
  }

  if (totalAvaliacoes) {
    totalAvaliacoes.textContent =
      total > 0
        ? `${total} ${
            total === 1
              ? "avaliação"
              : "avaliações"
          }`
        : "Nenhuma avaliação";
  }
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
    const referenciaLivro =
      doc(db, "livros", livroId);

    const resultadoLivro =
      await getDoc(referenciaLivro);

    if (!resultadoLivro.exists()) {
      mostrarErro(
        "Este livro não existe ou foi removido."
      );

      return;
    }

    livroAtual = {
      id: resultadoLivro.id,
      ...resultadoLivro.data()
    };

    const titulo =
      livroAtual.titulo ||
      "Livro sem título";

    const autor =
      livroAtual.autor ||
      "Autor desconhecido";

    const genero =
      livroAtual.genero ||
      "Gênero não definido";

    const capa =
      livroAtual.capa ||
      "images/depois-de-te-odiar.png";

    if (tituloLivro) {
      tituloLivro.textContent =
        titulo;
    }

    if (autorLivro) {
      autorLivro.textContent =
        autor;
    }

    if (nomeAutorSecao) {
      nomeAutorSecao.textContent =
        autor;
    }

    if (generoLivro) {
      generoLivro.textContent =
        genero;
    }

    if (sinopseLivro) {
      sinopseLivro.textContent =
        livroAtual.sinopse ||
        "Sinopse não disponível.";
    }

    configurarCapa(
      capa,
      titulo
    );

    configurarSelos(
      livroAtual
    );

    configurarAvaliacoes(
      livroAtual
    );

    document.title =
      `${titulo} | Entre Capítulos`;

    await configurarFavorito(
      titulo,
      autor,
      capa
    );

    await carregarCapitulos();

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
// CARREGAR CAPÍTULOS
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
    const consulta = query(
      collection(db, "capitulos"),
      where("livroId", "==", livroId),
      where("status", "==", "publicado"),
      orderBy("numero", "asc")
    );

    const resultado =
      await getDocs(consulta);

    if (resultado.empty) {
      capitulosPublicados = [];

      listaCapitulos.innerHTML = `
        <p class="mensagem-status">
          Nenhum capítulo publicado ainda.
        </p>
      `;

      atualizarQuantidadeCapitulos(0);

      atualizarProgressoLeitura();

      desativarBotaoLeitura(
        "Nenhum capítulo disponível"
      );

      return;
    }

    listaCapitulos.innerHTML = "";
    capitulosPublicados = [];

    resultado.forEach((documento) => {
      capitulosPublicados.push({
        id: documento.id,
        ...documento.data()
      });
    });

    atualizarQuantidadeCapitulos(
      capitulosPublicados.length
    );

    const idsCapitulosLidos =
      obterIdsCapitulosLidos();

    capitulosPublicados.forEach(
      (capitulo) => {
        criarCartaoCapitulo(
          capitulo,
          idsCapitulosLidos
        );
      }
    );

    atualizarProgressoLeitura();

    configurarBotaoInteligente();

  } catch (erro) {
    console.error(
      "Erro ao carregar capítulos:",
      erro
    );

    listaCapitulos.innerHTML = `
      <p class="mensagem-status">
        Não foi possível carregar os capítulos.
      </p>
    `;

    atualizarQuantidadeCapitulos(0);

    desativarBotaoLeitura(
      "Capítulos indisponíveis"
    );
  }
}


// ==============================
// ATUALIZAR QUANTIDADE
// ==============================

function atualizarQuantidadeCapitulos(
  total
) {
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
// CRIAR CARTÃO DO CAPÍTULO
// ==============================

function criarCartaoCapitulo(
  capitulo,
  idsCapitulosLidos
) {
  const numero =
    Number(capitulo.numero) || 0;

  const numeroFormatado =
    String(numero).padStart(2, "0");

  const titulo =
    escaparHTML(
      capitulo.titulo ||
      "Capítulo sem título"
    );

  const resumo =
    escaparHTML(
      capitulo.resumo ||
      "Continue acompanhando esta história."
    );

  const foiLido =
    idsCapitulosLidos.includes(
      capitulo.id
    );

  const cartao =
    document.createElement("a");

  cartao.href =
    `leitura.html?id=${capitulo.id}`;

  cartao.className =
    "cartao-capitulo";

  if (foiLido) {
    cartao.classList.add(
      "capitulo-lido"
    );
  }

  cartao.innerHTML = `
    <div class="numero-capitulo">
      ${foiLido ? "✓" : numeroFormatado}
    </div>

    <div class="dados-capitulo">
      <span>
        ${
          foiLido
            ? "Capítulo lido"
            : `Capítulo ${numero}`
        }
      </span>

      <h3>
        ${titulo}
      </h3>

      <p>
        ${resumo}
      </p>
    </div>

    <div class="seta-capitulo">
      ›
    </div>
  `;

  listaCapitulos.appendChild(
    cartao
  );
}


// ==============================
// CONFIGURAR BOTÃO INTELIGENTE
// ==============================

function configurarBotaoInteligente() {
  if (
    capitulosPublicados.length === 0
  ) {
    desativarBotaoLeitura(
      "Nenhum capítulo disponível"
    );

    return;
  }

  const ultimoProgresso =
    obterUltimoCapituloLido();

  const capituloSalvo =
    capitulosPublicados.find(
      (capitulo) =>
        capitulo.id ===
        ultimoProgresso?.capituloId
    );

  if (capituloSalvo) {
    ativarBotaoLeitura(
      capituloSalvo.id,
      "Continuar leitura"
    );

    return;
  }

  if (livroFoiIniciado()) {
    const idsLidos =
      obterIdsCapitulosLidos();

    const proximoNaoLido =
      capitulosPublicados.find(
        (capitulo) =>
          !idsLidos.includes(
            capitulo.id
          )
      );

    if (proximoNaoLido) {
      ativarBotaoLeitura(
        proximoNaoLido.id,
        "Continuar leitura"
      );

      return;
    }
  }

  ativarBotaoLeitura(
    capitulosPublicados[0].id,
    "Começar a ler"
  );
}


// ==============================
// ATUALIZAR PROGRESSO
// ==============================

function atualizarProgressoLeitura() {
  const total =
    capitulosPublicados.length;

  if (total === 0) {
    definirProgresso(
      0,
      "Nenhum capítulo disponível."
    );

    return;
  }

  const idsPublicados =
    capitulosPublicados.map(
      (capitulo) => capitulo.id
    );

  const idsLidos =
    obterIdsCapitulosLidos();

  const quantidadeLida =
    idsPublicados.filter(
      (id) => idsLidos.includes(id)
    ).length;

  const ultimoProgresso =
    obterUltimoCapituloLido();

  let percentual =
    Math.round(
      (quantidadeLida / total) *
      100
    );

  if (
    quantidadeLida === 0 &&
    ultimoProgresso
  ) {
    percentual =
      Number(
        ultimoProgresso.porcentagem ||
        5
      );
  }

  percentual =
    Math.min(
      100,
      Math.max(0, percentual)
    );

  if (quantidadeLida === 0) {
    definirProgresso(
      percentual,
      percentual > 0
        ? "Você começou esta leitura."
        : "Você ainda não começou este livro."
    );

    return;
  }

  if (quantidadeLida >= total) {
    definirProgresso(
      100,
      "Parabéns! Você concluiu todos os capítulos publicados."
    );

    return;
  }

  definirProgresso(
    percentual,
    `${quantidadeLida} de ${total} capítulos concluídos.`
  );
}


// ==============================
// DEFINIR PROGRESSO VISUAL
// ==============================

function definirProgresso(
  percentual,
  descricao
) {
  const valor =
    Math.min(
      100,
      Math.max(
        0,
        Number(percentual) || 0
      )
    );

  if (porcentagemProgresso) {
    porcentagemProgresso.textContent =
      `${valor}%`;
  }

  if (barraProgressoLivro) {
    barraProgressoLivro.style.width =
      `${valor}%`;
  }

  if (descricaoProgresso) {
    descricaoProgresso.textContent =
      descricao;
  }

  if (painelProgresso) {
    painelProgresso.hidden = false;
  }
}


// ==============================
// SISTEMA DE FAVORITOS
// ==============================

async function configurarFavorito(
  titulo,
  autor,
  capa
) {
  if (!botaoFavorito || !livroId) {
    return;
  }

  async function atualizarBotao() {
    const favorito =
      await verificarFavorito(livroId);

    if (favorito) {
      botaoFavorito.textContent =
        "♥ Livro favoritado";

      botaoFavorito.classList.add(
        "favoritado"
      );

    } else {
      botaoFavorito.textContent =
        "♡ Adicionar aos favoritos";

      botaoFavorito.classList.remove(
        "favoritado"
      );
    }
  }

  botaoFavorito.disabled = true;

  botaoFavorito.textContent =
    "Verificando favorito...";

  try {
    await atualizarBotao();

  } catch (erro) {
    console.error(
      "Erro ao verificar favorito:",
      erro
    );

    botaoFavorito.textContent =
      "♡ Adicionar aos favoritos";
  }

  botaoFavorito.disabled = false;

  botaoFavorito.addEventListener(
    "click",
    async () => {
      botaoFavorito.disabled = true;

      botaoFavorito.textContent =
        "Salvando...";

      try {
        const resultado =
          await alternarFavorito({
            livroId,
            titulo,
            autor,
            capa
          });

        if (!resultado.redirecionado) {
          await atualizarBotao();
        }

      } catch (erro) {
        console.error(
          "Erro ao favoritar livro:",
          erro
        );

        alert(
          "Não foi possível atualizar o favorito."
        );

        await atualizarBotao();

      } finally {
        botaoFavorito.disabled = false;
      }
    }
  );
}


// ==============================
// ATUALIZAR AO VOLTAR À PÁGINA
// ==============================

window.addEventListener(
  "pageshow",
  () => {
    if (
      capitulosPublicados.length > 0
    ) {
      atualizarProgressoLeitura();
      configurarBotaoInteligente();
    }
  }
);


// ==============================
// INICIAR PÁGINA
// ==============================

carregarLivro();