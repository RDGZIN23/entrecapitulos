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
  document.getElementById(
    "campoPesquisa"
  );

const contadorContinuar =
  document.getElementById(
    "contadorContinuar"
  );

const contadorFavoritos =
  document.getElementById(
    "contadorFavoritos"
  );

const contadorLancamentos =
  document.getElementById(
    "contadorLancamentos"
  );

const contadorLivros =
  document.getElementById(
    "contadorLivros"
  );

const listaContinuar =
  document.getElementById(
    "listaContinuar"
  );

const listaFavoritosBiblioteca =
  document.getElementById(
    "listaFavoritosBiblioteca"
  );

const listaLancamentos =
  document.getElementById(
    "listaLancamentos"
  );

const gradeLivros =
  document.getElementById(
    "gradeLivros"
  );

const secaoContinuar =
  document.getElementById(
    "secaoContinuar"
  );

const secaoFavoritos =
  document.getElementById(
    "secaoFavoritos"
  );

const secaoLancamentos =
  document.getElementById(
    "secaoLancamentos"
  );


// ========================================
// CONFIGURAÇÕES
// ========================================

const capaPadrao =
  "images/depois-de-te-odiar.png";

let livrosDisponiveis = [];
let capitulosDisponiveis = [];
let favoritosUsuario = [];
let progressosUsuario = [];
let usuarioAtual = null;


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function normalizarTexto(
  texto = ""
) {
  return String(texto)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}


function criarMensagemVazia(
  texto
) {
  const mensagem =
    document.createElement(
      "div"
    );

  mensagem.className =
    "mensagem-vazia";

  mensagem.textContent =
    texto;

  return mensagem;
}


function obterDataEmMilissegundos(
  valor
) {
  if (!valor) {
    return 0;
  }

  if (
    typeof valor.toMillis ===
    "function"
  ) {
    return valor.toMillis();
  }

  if (valor.seconds) {
    return valor.seconds * 1000;
  }

  const data =
    new Date(valor);

  return Number.isNaN(
    data.getTime()
  )
    ? 0
    : data.getTime();
}


function configurarImagem(
  imagem,
  capa,
  titulo
) {
  imagem.src =
    capa || capaPadrao;

  imagem.alt =
    `Capa do livro ${
      titulo || "sem título"
    }`;

  imagem.loading =
    "lazy";

  imagem.addEventListener(
    "error",
    () => {
      imagem.src =
        capaPadrao;
    },
    {
      once: true
    }
  );
}


function atualizarContador(
  elemento,
  quantidade
) {
  if (!elemento) {
    return;
  }

  elemento.textContent =
    String(
      Math.max(
        0,
        Number(quantidade) || 0
      )
    );
}


// ========================================
// PROGRESSO LOCAL COMO ALTERNATIVA
// ========================================

function obterProgressoLocal() {
  try {
    const valor =
      localStorage.getItem(
        "ultimoCapituloLido"
      );

    if (!valor) {
      return [];
    }

    const progresso =
      JSON.parse(valor);

    if (
      !progresso ||
      !progresso.capituloId
    ) {
      return [];
    }

    return [
      {
        livroId:
          progresso.livroId,

        livroTitulo:
          progresso.livroTitulo ||
          "Livro",

        capa:
          progresso.capa || "",

        ultimoCapituloId:
          progresso.capituloId,

        ultimoCapituloNumero:
          progresso.numero || 0,

        ultimoCapituloTitulo:
          progresso.capituloTitulo ||
          "Capítulo",

        capitulosLidos:
          progresso.capituloId
            ? [
                progresso.capituloId
              ]
            : [],

        atualizadoEm:
          progresso.atualizadoEm ||
          new Date().toISOString()
      }
    ];

  } catch (erro) {
    console.error(
      "Erro ao ler progresso local:",
      erro
    );

    return [];
  }
}


// ========================================
// ENCONTRAR LIVRO
// ========================================

function encontrarLivro(
  livroId
) {
  return livrosDisponiveis.find(
    (livro) =>
      livro.id === livroId
  ) || null;
}


// ========================================
// CAPÍTULOS PUBLICADOS DE UM LIVRO
// ========================================

function obterCapitulosDoLivro(
  livroId
) {
  return capitulosDisponiveis
    .filter(
      (capitulo) =>
        capitulo.livroId ===
        livroId
    )
    .sort(
      (a, b) =>
        (
          Number(a.numero) || 0
        ) -
        (
          Number(b.numero) || 0
        )
    );
}


// ========================================
// CALCULAR PORCENTAGEM
// ========================================

function calcularPorcentagem(
  progresso
) {
  if (!progresso?.livroId) {
    return 0;
  }

  const capitulosDoLivro =
    obterCapitulosDoLivro(
      progresso.livroId
    );

  if (
    capitulosDoLivro.length === 0
  ) {
    return 0;
  }

  const capitulosLidos =
    Array.isArray(
      progresso.capitulosLidos
    )
      ? progresso.capitulosLidos
      : [];

  const idsPublicados =
    capitulosDoLivro.map(
      (capitulo) =>
        capitulo.id
    );

  const quantidadeLida =
    idsPublicados.filter(
      (id) =>
        capitulosLidos.includes(id)
    ).length;

  return Math.min(
    100,
    Math.round(
      (
        quantidadeLida /
        idsPublicados.length
      ) * 100
    )
  );
}


// ========================================
// VERIFICAR LIVRO CONCLUÍDO
// ========================================

function livroFoiConcluido(
  progresso
) {
  if (!progresso?.livroId) {
    return false;
  }

  const capitulosDoLivro =
    obterCapitulosDoLivro(
      progresso.livroId
    );

  if (
    capitulosDoLivro.length === 0
  ) {
    return false;
  }

  const capitulosLidos =
    Array.isArray(
      progresso.capitulosLidos
    )
      ? progresso.capitulosLidos
      : [];

  return capitulosDoLivro.every(
    (capitulo) =>
      capitulosLidos.includes(
        capitulo.id
      )
  );
}


// ========================================
// CARTÃO PADRÃO DE LIVRO
// ========================================

function criarCartaoLivro(
  livro
) {
  const cartao =
    document.createElement(
      "article"
    );

  cartao.className =
    "cartao-livro";

  const imagem =
    document.createElement(
      "img"
    );

  imagem.className =
    "capa-livro";

  configurarImagem(
    imagem,
    livro.capa,
    livro.titulo
  );

  const conteudo =
    document.createElement(
      "div"
    );

  conteudo.className =
    "conteudo-livro";

  const titulo =
    document.createElement(
      "h3"
    );

  titulo.textContent =
    livro.titulo ||
    "Livro sem título";

  const autor =
    document.createElement(
      "p"
    );

  autor.className =
    "autor-livro";

  autor.textContent =
    livro.autor ||
    "Autor não informado";

  const botao =
    document.createElement(
      "a"
    );

  botao.className =
    "botao-livro";

  botao.href =
    livro.id
      ? `livro.html?id=${livro.id}`
      : "index.html";

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
    document.createElement(
      "article"
    );

  cartao.className =
    "cartao-continuar";

  const livroRelacionado =
    encontrarLivro(
      progresso.livroId
    );

  const tituloLivro =
    progresso.livroTitulo ||
    livroRelacionado?.titulo ||
    "Livro";

  const imagem =
    document.createElement(
      "img"
    );

  imagem.className =
    "capa-continuar";

  configurarImagem(
    imagem,
    progresso.capa ||
      livroRelacionado?.capa,
    tituloLivro
  );

  const conteudo =
    document.createElement(
      "div"
    );

  conteudo.className =
    "conteudo-continuar";

  const titulo =
    document.createElement(
      "h3"
    );

  titulo.textContent =
    tituloLivro;

  const descricao =
    document.createElement(
      "p"
    );

  const numero =
    progresso
      .ultimoCapituloNumero ??
    progresso.numero ??
    0;

  const tituloCapitulo =
    progresso
      .ultimoCapituloTitulo ||
    progresso.capituloTitulo ||
    "Capítulo";

  descricao.textContent =
    `${
      numero
        ? `Capítulo ${numero}`
        : "Capítulo"
    } • ${tituloCapitulo}`;

  const barra =
    document.createElement(
      "div"
    );

  barra.className =
    "barra-progresso";

  const preenchimento =
    document.createElement(
      "div"
    );

  preenchimento.className =
    "progresso-preenchido";

  const porcentagem =
    calcularPorcentagem(
      progresso
    );

  preenchimento.style.width =
    `${Math.max(
      porcentagem > 0
        ? porcentagem
        : 5,
      5
    )}%`;

  barra.appendChild(
    preenchimento
  );

  const botao =
    document.createElement(
      "a"
    );

  botao.className =
    "botao-livro";

  const capituloId =
    progresso
      .ultimoCapituloId ||
    progresso.capituloId;

  botao.href =
    capituloId
      ? `leitura.html?id=${capituloId}`
      : livroRelacionado?.id
        ? `livro.html?id=${livroRelacionado.id}`
        : "index.html";

  botao.textContent =
    livroFoiConcluido(progresso)
      ? "Ler novamente"
      : "Continuar leitura";

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
// CARREGAR LIVROS E CAPÍTULOS
// ========================================

async function carregarConteudo() {
  try {
    const [
      resultadoLivros,
      resultadoCapitulos
    ] =
      await Promise.all([
        getDocs(
          collection(
            db,
            "livros"
          )
        ),

        getDocs(
          collection(
            db,
            "capitulos"
          )
        )
      ]);

    livrosDisponiveis =
      resultadoLivros.docs
        .map(
          (documento) => ({
            id: documento.id,
            ...documento.data()
          })
        )
        .filter(
          (livro) => {
            const status =
              normalizarTexto(
                livro.status ||
                "publicado"
              );

            return (
              status ===
                "publicado" ||
              status === "ativo"
            );
          }
        )
        .sort(
          (a, b) =>
            obterDataEmMilissegundos(
              b.criadoEm
            ) -
            obterDataEmMilissegundos(
              a.criadoEm
            )
        );

    capitulosDisponiveis =
      resultadoCapitulos.docs
        .map(
          (documento) => ({
            id: documento.id,
            ...documento.data()
          })
        )
        .filter(
          (capitulo) => {
            const status =
              normalizarTexto(
                capitulo.status ||
                "publicado"
              );

            return (
              status ===
              "publicado"
            );
          }
        );

    renderizarTodosOsLivros(
      livrosDisponiveis
    );

    renderizarLancamentos();

  } catch (erro) {
    console.error(
      "Erro ao carregar biblioteca:",
      erro
    );

    livrosDisponiveis = [];
    capitulosDisponiveis = [];

    atualizarContador(
      contadorLivros,
      0
    );

    atualizarContador(
      contadorLancamentos,
      0
    );

    if (gradeLivros) {
      gradeLivros.innerHTML =
        "";

      gradeLivros.appendChild(
        criarMensagemVazia(
          "Não foi possível carregar a biblioteca."
        )
      );
    }

    if (listaLancamentos) {
      listaLancamentos.innerHTML =
        "";

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

  atualizarContador(
    contadorLivros,
    livros.length
  );

  if (livros.length === 0) {
    gradeLivros.appendChild(
      criarMensagemVazia(
        "Nenhum livro foi encontrado."
      )
    );

    return;
  }

  livros.forEach(
    (livro) => {
      gradeLivros.appendChild(
        criarCartaoLivro(
          livro
        )
      );
    }
  );
}


// ========================================
// RENDERIZAR LANÇAMENTOS
// ========================================

function renderizarLancamentos() {
  if (!listaLancamentos) {
    return;
  }

  const lancamentos =
    livrosDisponiveis.slice(
      0,
      8
    );

  listaLancamentos.innerHTML =
    "";

  atualizarContador(
    contadorLancamentos,
    lancamentos.length
  );

  if (
    lancamentos.length === 0
  ) {
    listaLancamentos.appendChild(
      criarMensagemVazia(
        "Nenhum lançamento disponível."
      )
    );

    return;
  }

  lancamentos.forEach(
    (livro) => {
      listaLancamentos.appendChild(
        criarCartaoLivro(
          livro
        )
      );
    }
  );
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

  listaFavoritosBiblioteca.innerHTML =
    "";

  if (!usuarioId) {
    favoritosUsuario = [];

    atualizarContador(
      contadorFavoritos,
      0
    );

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
        collection(
          db,
          "favoritos"
        ),
        where(
          "usuarioId",
          "==",
          usuarioId
        )
      );

    const resultado =
      await getDocs(
        consulta
      );

    favoritosUsuario =
      resultado.docs
        .map(
          (documento) => ({
            id: documento.id,
            ...documento.data()
          })
        )
        .sort(
          (a, b) =>
            obterDataEmMilissegundos(
              b.criadoEm
            ) -
            obterDataEmMilissegundos(
              a.criadoEm
            )
        );

    atualizarContador(
      contadorFavoritos,
      favoritosUsuario.length
    );

    if (
      favoritosUsuario.length ===
      0
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
          encontrarLivro(
            favorito.livroId
          );

        const livro = {
          id:
            favorito.livroId ||
            livroRelacionado?.id,

          titulo:
            favorito.titulo ||
            livroRelacionado?.titulo ||
            "Livro",

          autor:
            favorito.autor ||
            livroRelacionado?.autor ||
            "Autor não informado",

          capa:
            favorito.capa ||
            livroRelacionado?.capa ||
            capaPadrao,

          genero:
            livroRelacionado?.genero ||
            ""
        };

        if (!livro.id) {
          return;
        }

        listaFavoritosBiblioteca
          .appendChild(
            criarCartaoLivro(
              livro
            )
          );
      }
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar favoritos:",
      erro
    );

    favoritosUsuario = [];

    atualizarContador(
      contadorFavoritos,
      0
    );

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
// CARREGAR PROGRESSO DO FIREBASE
// ========================================

async function carregarProgressos(
  usuarioId
) {
  if (!listaContinuar) {
    return;
  }

  listaContinuar.innerHTML = "";

  if (!usuarioId) {
    progressosUsuario =
      obterProgressoLocal();

    renderizarContinuar();

    return;
  }

  try {
    const consulta =
      query(
        collection(
          db,
          "progressoLeitura"
        ),
        where(
          "usuarioId",
          "==",
          usuarioId
        )
      );

    const resultado =
      await getDocs(
        consulta
      );

    progressosUsuario =
      resultado.docs
        .map(
          (documento) => ({
            id: documento.id,
            ...documento.data()
          })
        )
        .sort(
          (a, b) =>
            obterDataEmMilissegundos(
              b.atualizadoEm
            ) -
            obterDataEmMilissegundos(
              a.atualizadoEm
            )
        );

    /*
      Se não houver progresso no Firebase,
      utiliza o progresso salvo no aparelho.
    */

    if (
      progressosUsuario.length ===
      0
    ) {
      progressosUsuario =
        obterProgressoLocal();
    }

    renderizarContinuar();

  } catch (erro) {
    console.error(
      "Erro ao carregar progresso:",
      erro
    );

    progressosUsuario =
      obterProgressoLocal();

    renderizarContinuar();
  }
}


// ========================================
// RENDERIZAR CONTINUAR LENDO
// ========================================

function renderizarContinuar() {
  if (!listaContinuar) {
    return;
  }

  listaContinuar.innerHTML = "";

  atualizarContador(
    contadorContinuar,
    progressosUsuario.length
  );

  if (
    progressosUsuario.length === 0
  ) {
    listaContinuar.appendChild(
      criarMensagemVazia(
        "Você ainda não começou nenhuma leitura."
      )
    );

    return;
  }

  progressosUsuario.forEach(
    (progresso) => {
      const capituloId =
        progresso
          .ultimoCapituloId ||
        progresso.capituloId;

      if (!capituloId) {
        return;
      }

      listaContinuar.appendChild(
        criarCartaoContinuar(
          progresso
        )
      );
    }
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

    if (secaoContinuar) {
      secaoContinuar.hidden =
        false;
    }

    if (secaoFavoritos) {
      secaoFavoritos.hidden =
        false;
    }

    if (secaoLancamentos) {
      secaoLancamentos.hidden =
        false;
    }

    return;
  }

  /*
    Durante a pesquisa, escondemos as
    outras áreas para os resultados
    aparecerem logo abaixo do campo.
  */

  if (secaoContinuar) {
    secaoContinuar.hidden =
      true;
  }

  if (secaoFavoritos) {
    secaoFavoritos.hidden =
      true;
  }

  if (secaoLancamentos) {
    secaoLancamentos.hidden =
      true;
  }

  const livrosEncontradosPorCapitulo =
    new Set();

  capitulosDisponiveis.forEach(
    (capitulo) => {
      const textoCapitulo =
        normalizarTexto(
          [
            capitulo.titulo || "",
            capitulo.resumo || "",
            capitulo.livroTitulo || "",
            `capítulo ${
              capitulo.numero || ""
            }`,
            `capitulo ${
              capitulo.numero || ""
            }`
          ].join(" ")
        );

      if (
        textoCapitulo.includes(
          termo
        ) &&
        capitulo.livroId
      ) {
        livrosEncontradosPorCapitulo
          .add(
            capitulo.livroId
          );
      }
    }
  );

  const resultados =
    livrosDisponiveis.filter(
      (livro) => {
        const textoLivro =
          normalizarTexto(
            [
              livro.titulo || "",
              livro.autor || "",
              livro.genero || "",
              livro.sinopse || ""
            ].join(" ")
          );

        return (
          textoLivro.includes(
            termo
          ) ||
          livrosEncontradosPorCapitulo
            .has(
              livro.id
            )
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
  await carregarConteudo();

  await Promise.all([
    carregarFavoritos(
      usuarioAtual?.uid
    ),

    carregarProgressos(
      usuarioAtual?.uid
    )
  ]);
}


// ========================================
// VERIFICAR LOGIN
// ========================================

onAuthStateChanged(
  auth,
  async (usuario) => {
    usuarioAtual =
      usuario || null;

    await iniciarBiblioteca();
  }
);


// ========================================
// ATUALIZAR AO VOLTAR PARA A PÁGINA
// ========================================

window.addEventListener(
  "pageshow",
  async () => {
    if (
      livrosDisponiveis.length ===
      0
    ) {
      return;
    }

    await Promise.all([
      carregarFavoritos(
        auth.currentUser?.uid
      ),

      carregarProgressos(
        auth.currentUser?.uid
      )
    ]);
  }
);