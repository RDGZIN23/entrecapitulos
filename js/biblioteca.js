// ========================================
// IMPORTAÇÕES DO FIREBASE
// ========================================

import {
  auth,
  db
} from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const campoPesquisa =
  document.getElementById("campoPesquisa");

const contadorContinuar =
  document.getElementById("contadorContinuar");

const contadorFavoritos =
  document.getElementById("contadorFavoritos");

const contadorLancamentos =
  document.getElementById("contadorLancamentos");

const contadorLivros =
  document.getElementById("contadorLivros");

const listaContinuar =
  document.getElementById("listaContinuar");

const listaFavoritosBiblioteca =
  document.getElementById("listaFavoritosBiblioteca");

const listaLancamentos =
  document.getElementById("listaLancamentos");

const gradeLivros =
  document.getElementById("gradeLivros");


// ========================================
// CONFIGURAÇÕES
// ========================================

const capaPadrao =
  "images/depois-de-te-odiar.png";

let livrosDisponiveis = [];
let favoritosUsuario = [];
let usuarioAtual = null;


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


function criarMensagemVazia(texto) {
  const mensagem =
    document.createElement("div");

  mensagem.className =
    "mensagem-vazia";

  mensagem.textContent =
    texto;

  return mensagem;
}


function obterDataEmMilissegundos(valor) {
  if (!valor) {
    return 0;
  }

  if (typeof valor.toMillis === "function") {
    return valor.toMillis();
  }

  if (valor.seconds) {
    return valor.seconds * 1000;
  }

  const data =
    new Date(valor);

  return Number.isNaN(data.getTime())
    ? 0
    : data.getTime();
}


function configurarImagem(
  imagem,
  capa,
  titulo
) {
  imagem.src =
    capa ||
    capaPadrao;

  imagem.alt =
    `Capa do livro ${
      titulo ||
      "sem título"
    }`;

  imagem.loading =
    "lazy";

  imagem.addEventListener(
    "error",
    () => {
      imagem.src =
        capaPadrao;
    },
    { once: true }
  );
}


function obterProgressoSalvo() {
  try {
    const valor =
      localStorage.getItem(
        "ultimoCapituloLido"
      );

    if (!valor) {
      return null;
    }

    const progresso =
      JSON.parse(valor);

    if (
      !progresso ||
      !progresso.capituloId
    ) {
      return null;
    }

    return progresso;

  } catch (erro) {
    console.error(
      "Erro ao ler progresso:",
      erro
    );

    return null;
  }
}


// ========================================
// CARTÃO PADRÃO DE LIVRO
// ========================================

function criarCartaoLivro(livro) {
  const cartao =
    document.createElement("article");

  cartao.className =
    "cartao-livro";

  const imagem =
    document.createElement("img");

  imagem.className =
    "capa-livro";

  configurarImagem(
    imagem,
    livro.capa,
    livro.titulo
  );

  const conteudo =
    document.createElement("div");

  conteudo.className =
    "conteudo-livro";

  const titulo =
    document.createElement("h3");

  titulo.textContent =
    livro.titulo ||
    "Livro sem título";

  const autor =
    document.createElement("p");

  autor.className =
    "autor-livro";

  autor.textContent =
    livro.autor ||
    "Autor não informado";

  const botao =
    document.createElement("a");

  botao.className =
    "botao-livro";

  botao.href =
    `livro.html?id=${livro.id}`;

  botao.textContent =
    "Ver livro";

  conteudo.append(
    titulo,
    autor,
    botao
  );

  cartao.append(
    imagem,
    conteudo
  );

  return cartao;
}


// ========================================
// CARTÃO DE CONTINUAR LENDO
// ========================================

function criarCartaoContinuar(
  progresso
) {
  const cartao =
    document.createElement("article");

  cartao.className =
    "cartao-continuar";

  const imagem =
    document.createElement("img");

  imagem.className =
    "capa-continuar";

  const livroRelacionado =
    livrosDisponiveis.find(
      (livro) =>
        livro.id === progresso.livroId
    );

  configurarImagem(
    imagem,
    progresso.capa ||
    livroRelacionado?.capa,
    progresso.livroTitulo ||
    livroRelacionado?.titulo
  );

  const conteudo =
    document.createElement("div");

  conteudo.className =
    "conteudo-continuar";

  const titulo =
    document.createElement("h3");

  titulo.textContent =
    progresso.livroTitulo ||
    livroRelacionado?.titulo ||
    "Livro";

  const descricao =
    document.createElement("p");

  const numeroCapitulo =
    progresso.numero
      ? `Capítulo ${progresso.numero}`
      : "Capítulo";

  const tituloCapitulo =
    progresso.capituloTitulo
      ? ` • ${progresso.capituloTitulo}`
      : "";

  descricao.textContent =
    `${numeroCapitulo}${tituloCapitulo}`;

  const barra =
    document.createElement("div");

  barra.className =
    "barra-progresso";

  const preenchimento =
    document.createElement("div");

  preenchimento.className =
    "progresso-preenchido";

  preenchimento.style.width =
    progresso.porcentagem
      ? `${Math.min(
          100,
          Math.max(
            5,
            Number(progresso.porcentagem)
          )
        )}%`
      : "20%";

  barra.appendChild(
    preenchimento
  );

  const botao =
    document.createElement("a");

  botao.className =
    "botao-livro";

  botao.href =
    `leitura.html?id=${progresso.capituloId}`;

  botao.textContent =
    "Continuar leitura";

  conteudo.append(
    titulo,
    descricao,
    barra,
    botao
  );

  cartao.append(
    imagem,
    conteudo
  );

  return cartao;
}


// ========================================
// CARREGAR TODOS OS LIVROS
// ========================================

async function carregarLivros() {
  try {
    const resultado =
      await getDocs(
        collection(db, "livros")
      );

    livrosDisponiveis = [];

    resultado.forEach((documento) => {
      const dados =
        documento.data();

      const status =
        String(
          dados.status ||
          "publicado"
        ).toLowerCase();

      if (
        status !== "publicado" &&
        status !== "ativo"
      ) {
        return;
      }

      livrosDisponiveis.push({
        id: documento.id,
        ...dados
      });
    });

    livrosDisponiveis.sort(
      (a, b) =>
        obterDataEmMilissegundos(
          b.criadoEm
        ) -
        obterDataEmMilissegundos(
          a.criadoEm
        )
    );

    renderizarTodosOsLivros(
      livrosDisponiveis
    );

    renderizarLancamentos();

  } catch (erro) {
    console.error(
      "Erro ao carregar livros:",
      erro
    );

    livrosDisponiveis = [];

    if (contadorLivros) {
      contadorLivros.textContent =
        "0";
    }

    if (contadorLancamentos) {
      contadorLancamentos.textContent =
        "0";
    }

    if (gradeLivros) {
      gradeLivros.innerHTML = "";

      gradeLivros.appendChild(
        criarMensagemVazia(
          "Não foi possível carregar a biblioteca."
        )
      );
    }

    if (listaLancamentos) {
      listaLancamentos.innerHTML = "";

      listaLancamentos.appendChild(
        criarMensagemVazia(
          "Não foi possível carregar os lançamentos."
        )
      );
    }
  }
}


// ========================================
// RENDERIZAR TODOS OS LIVROS
// ========================================

function renderizarTodosOsLivros(
  livros
) {
  if (!gradeLivros) {
    return;
  }

  gradeLivros.innerHTML = "";

  if (contadorLivros) {
    contadorLivros.textContent =
      String(livros.length);
  }

  if (livros.length === 0) {
    gradeLivros.appendChild(
      criarMensagemVazia(
        "Nenhum livro foi encontrado."
      )
    );

    return;
  }

  livros.forEach((livro) => {
    gradeLivros.appendChild(
      criarCartaoLivro(livro)
    );
  });
}


// ========================================
// RENDERIZAR LANÇAMENTOS
// ========================================

function renderizarLancamentos() {
  if (!listaLancamentos) {
    return;
  }

  const lancamentos =
    livrosDisponiveis.slice(0, 8);

  listaLancamentos.innerHTML = "";

  if (contadorLancamentos) {
    contadorLancamentos.textContent =
      String(lancamentos.length);
  }

  if (lancamentos.length === 0) {
    listaLancamentos.appendChild(
      criarMensagemVazia(
        "Nenhum lançamento disponível."
      )
    );

    return;
  }

  lancamentos.forEach((livro) => {
    listaLancamentos.appendChild(
      criarCartaoLivro(livro)
    );
  });
}


// ========================================
// CARREGAR FAVORITOS
// ========================================

async function carregarFavoritos(
  usuarioId
) {
  if (!listaFavoritosBiblioteca) {
    return;
  }

  listaFavoritosBiblioteca.innerHTML = "";

  if (!usuarioId) {
    favoritosUsuario = [];

    if (contadorFavoritos) {
      contadorFavoritos.textContent =
        "0";
    }

    listaFavoritosBiblioteca.appendChild(
      criarMensagemVazia(
        "Entre na sua conta para ver seus favoritos."
      )
    );

    return;
  }

  try {
    const consulta =
      query(
        collection(db, "favoritos"),
        where(
          "usuarioId",
          "==",
          usuarioId
        )
      );

    const resultado =
      await getDocs(consulta);

    favoritosUsuario = [];

    resultado.forEach((documento) => {
      favoritosUsuario.push({
        id: documento.id,
        ...documento.data()
      });
    });

    favoritosUsuario.sort(
      (a, b) =>
        obterDataEmMilissegundos(
          b.criadoEm
        ) -
        obterDataEmMilissegundos(
          a.criadoEm
        )
    );

    if (contadorFavoritos) {
      contadorFavoritos.textContent =
        String(favoritosUsuario.length);
    }

    if (
      favoritosUsuario.length === 0
    ) {
      listaFavoritosBiblioteca.appendChild(
        criarMensagemVazia(
          "Você ainda não possui livros favoritos."
        )
      );

      return;
    }

    favoritosUsuario.forEach(
      (favorito) => {
        const livroRelacionado =
          livrosDisponiveis.find(
            (livro) =>
              livro.id ===
              favorito.livroId
          );

        const livro = {
          id:
            favorito.livroId ||
            livroRelacionado?.id,
          titulo:
            favorito.titulo ||
            livroRelacionado?.titulo,
          autor:
            favorito.autor ||
            livroRelacionado?.autor,
          capa:
            favorito.capa ||
            livroRelacionado?.capa
        };

        if (!livro.id) {
          return;
        }

        listaFavoritosBiblioteca.appendChild(
          criarCartaoLivro(livro)
        );
      }
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar favoritos:",
      erro
    );

    favoritosUsuario = [];

    if (contadorFavoritos) {
      contadorFavoritos.textContent =
        "0";
    }

    listaFavoritosBiblioteca.innerHTML =
      "";

    listaFavoritosBiblioteca.appendChild(
      criarMensagemVazia(
        "Não foi possível carregar seus favoritos."
      )
    );
  }
}


// ========================================
// CARREGAR CONTINUAR LENDO
// ========================================

function carregarContinuarLendo() {
  if (!listaContinuar) {
    return;
  }

  const progresso =
    obterProgressoSalvo();

  listaContinuar.innerHTML = "";

  if (!progresso) {
    if (contadorContinuar) {
      contadorContinuar.textContent =
        "0";
    }

    listaContinuar.appendChild(
      criarMensagemVazia(
        "Você ainda não começou nenhuma leitura."
      )
    );

    return;
  }

  if (contadorContinuar) {
    contadorContinuar.textContent =
      "1";
  }

  listaContinuar.appendChild(
    criarCartaoContinuar(progresso)
  );
}


// ========================================
// PESQUISA
// ========================================

function pesquisarLivros() {
  const termo =
    normalizarTexto(
      campoPesquisa?.value
    );

  if (!termo) {
    renderizarTodosOsLivros(
      livrosDisponiveis
    );

    return;
  }

  const resultados =
    livrosDisponiveis.filter(
      (livro) => {
        const titulo =
          normalizarTexto(
            livro.titulo
          );

        const autor =
          normalizarTexto(
            livro.autor
          );

        return (
          titulo.includes(termo) ||
          autor.includes(termo)
        );
      }
    );

  renderizarTodosOsLivros(
    resultados
  );
}


if (campoPesquisa) {
  campoPesquisa.addEventListener(
    "input",
    pesquisarLivros
  );
}


// ========================================
// INICIAR BIBLIOTECA
// ========================================

async function iniciarBiblioteca() {
  await carregarLivros();

  carregarContinuarLendo();

  await carregarFavoritos(
    usuarioAtual?.uid
  );
}


// ========================================
// VERIFICAR LOGIN
// ========================================

onAuthStateChanged(
  auth,
  async (usuario) => {
    usuarioAtual =
      usuario ||
      null;

    await iniciarBiblioteca();
  }
);