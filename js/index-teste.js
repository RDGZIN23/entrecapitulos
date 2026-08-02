// ========================================
// IMPORTAÇÕES
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
  doc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// ELEMENTOS
// ========================================

const campoPesquisa =
  document.getElementById(
    "campoPesquisaTeste"
  );

const botaoLimparPesquisa =
  document.getElementById(
    "botaoLimparPesquisa"
  );

const saudacaoLeitor =
  document.getElementById(
    "saudacaoLeitor"
  );

const generoDestaque =
  document.getElementById(
    "generoDestaque"
  );

const tituloDestaque =
  document.getElementById(
    "tituloDestaque"
  );

const autorDestaque =
  document.getElementById(
    "autorDestaque"
  );

const sinopseDestaque =
  document.getElementById(
    "sinopseDestaque"
  );

const fundoDestaque =
  document.getElementById(
    "fundoDestaque"
  );

const botaoLerDestaque =
  document.getElementById(
    "botaoLerDestaque"
  );

const secaoContinue =
  document.getElementById(
    "secaoContinueTeste"
  );

const continueCapa =
  document.getElementById(
    "continueCapaTeste"
  );

const continueTitulo =
  document.getElementById(
    "continueTituloTeste"
  );

const continueCapitulo =
  document.getElementById(
    "continueCapituloTeste"
  );

const continueBotao =
  document.getElementById(
    "continueBotaoTeste"
  );

const barraContinue =
  document.getElementById(
    "barraContinuePreenchida"
  );

const listaDestaques =
  document.getElementById(
    "listaDestaquesTeste"
  );

const listaLancamentos =
  document.getElementById(
    "listaLancamentosTeste"
  );

const listaGeneros =
  document.getElementById(
    "listaGenerosTeste"
  );

const secoesGeneros =
  document.getElementById(
    "secoesGenerosTeste"
  );

const gradeLivros =
  document.getElementById(
    "gradeLivrosTeste"
  );

const quantidadeLivros =
  document.getElementById(
    "quantidadeLivrosTeste"
  );

const secaoResultados =
  document.getElementById(
    "secaoResultados"
  );

const listaResultados =
  document.getElementById(
    "listaResultados"
  );

const contadorResultados =
  document.getElementById(
    "contadorResultados"
  );

const botaoAreaAutor =
  document.getElementById(
    "botaoAreaAutorTeste"
  );


// ========================================
// CONFIGURAÇÕES
// ========================================

const capaPadrao =
  "images/depois-de-te-odiar.png";

const ADMIN_UID =
  "VPjjYv2NOdXMTTTxynB1MHTrfx23";

let livros = [];
let capitulos = [];


// ========================================
// AUXILIARES
// ========================================

function normalizarTexto(
  valor = ""
) {
  return String(valor)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}


function escaparHTML(
  valor = ""
) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function obterTempo(
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


function obterGeneros(
  livro
) {
  if (
    Array.isArray(livro.generos)
  ) {
    return livro.generos
      .map(String)
      .map((genero) =>
        genero.trim()
      )
      .filter(Boolean);
  }

  if (livro.genero) {
    return String(livro.genero)
      .split(",")
      .map((genero) =>
        genero.trim()
      )
      .filter(Boolean);
  }

  return [
    "Outros"
  ];
}


function obterGeneroPrincipal(
  livro
) {
  return (
    obterGeneros(livro)[0] ||
    "Livro"
  );
}


function configurarImagem(
  imagem,
  capa
) {
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

  imagem.src =
    capa || capaPadrao;
}


// ========================================
// SAUDAÇÃO
// ========================================

async function atualizarSaudacao(
  usuario
) {
  let nome = "";

  if (usuario) {
    nome =
      usuario.displayName ||
      "";

    try {
      const resultado =
        await getDoc(
          doc(
            db,
            "usuarios",
            usuario.uid
          )
        );

      if (resultado.exists()) {
        nome =
          resultado.data().nome ||
          nome;
      }

    } catch (erro) {
      console.error(
        "Erro ao carregar nome:",
        erro
      );
    }
  }

  const primeiroNome =
    nome
      .trim()
      .split(/\s+/)[0] ||
    "";

  if (saudacaoLeitor) {
    saudacaoLeitor.textContent =
      primeiroNome
        ? `O que vamos ler hoje, ${primeiroNome}?`
        : "O que vamos ler hoje?";
  }
}


// ========================================
// CARD DE LIVRO
// ========================================

function criarCardLivro(
  livro
) {
  const card =
    document.createElement(
      "article"
    );

  card.className =
    "cartao-livro-teste";

  const titulo =
    escaparHTML(
      livro.titulo ||
      "Livro sem título"
    );

  const autor =
    escaparHTML(
      livro.autor ||
      "Autor não informado"
    );

  const genero =
    escaparHTML(
      obterGeneroPrincipal(
        livro
      )
    );

  const capa =
    escaparHTML(
      livro.capa ||
      capaPadrao
    );

  card.innerHTML = `
    <a
      href="livro.html?id=${livro.id}"
      class="link-livro-teste"
    >
      <img
        src="${capa}"
        alt="Capa de ${titulo}"
        class="capa-livro-teste"
      >

      <div class="info-livro-teste">

        <span class="genero-livro-teste">
          ${genero}
        </span>

        <h3>${titulo}</h3>

        <p>${autor}</p>

      </div>
    </a>
  `;

  const imagem =
    card.querySelector("img");

  if (imagem) {
    configurarImagem(
      imagem,
      livro.capa
    );
  }

  return card;
}


// ========================================
// RENDERIZAR LISTA
// ========================================

function renderizarLivros(
  elemento,
  lista
) {
  if (!elemento) {
    return;
  }

  elemento.innerHTML = "";

  if (lista.length === 0) {
    const mensagem =
      document.createElement(
        "div"
      );

    mensagem.className =
      "mensagem-vazia-teste";

    mensagem.textContent =
      "Nenhum livro encontrado.";

    elemento.appendChild(
      mensagem
    );

    return;
  }

  lista.forEach(
    (livro) => {
      elemento.appendChild(
        criarCardLivro(livro)
      );
    }
  );
}


// ========================================
// DESTAQUE PRINCIPAL
// ========================================

function mostrarDestaque(
  livro
) {
  if (!livro) {
    return;
  }

  if (generoDestaque) {
    generoDestaque.textContent =
      obterGeneros(livro)
        .slice(0, 3)
        .join(" • ");
  }

  if (tituloDestaque) {
    tituloDestaque.textContent =
      livro.titulo ||
      "Livro sem título";
  }

  if (autorDestaque) {
    autorDestaque.textContent =
      livro.autor
        ? `Por ${livro.autor}`
        : "Autor não informado";
  }

  if (sinopseDestaque) {
    sinopseDestaque.textContent =
      livro.sinopse ||
      "Descubra esta história no Entre Capítulos.";
  }

  if (fundoDestaque) {
    fundoDestaque.style
      .backgroundImage =
        `url("${
          livro.capa ||
          capaPadrao
        }")`;
  }

  if (botaoLerDestaque) {
    botaoLerDestaque.href =
      `livro.html?id=${livro.id}`;
  }
}


// ========================================
// CONTINUAR LENDO
// ========================================

function carregarContinueLendo() {
  if (!secaoContinue) {
    return;
  }

  try {
    const valor =
      localStorage.getItem(
        "ultimoCapituloLido"
      );

    if (!valor) {
      secaoContinue.hidden =
        true;

      return;
    }

    const progresso =
      JSON.parse(valor);

    if (
      !progresso?.capituloId
    ) {
      secaoContinue.hidden =
        true;

      return;
    }

    const livroRelacionado =
      livros.find(
        (livro) =>
          livro.id ===
          progresso.livroId
      );

    if (continueCapa) {
      configurarImagem(
        continueCapa,
        progresso.capa ||
          livroRelacionado?.capa
      );
    }

    if (continueTitulo) {
      continueTitulo.textContent =
        progresso.livroTitulo ||
        livroRelacionado?.titulo ||
        "Livro";
    }

    if (continueCapitulo) {
      const numero =
        progresso.numero
          ? `Capítulo ${progresso.numero}`
          : "Capítulo";

      const titulo =
        progresso.capituloTitulo
          ? ` • ${progresso.capituloTitulo}`
          : "";

      continueCapitulo.textContent =
        `${numero}${titulo}`;
    }

    if (continueBotao) {
      continueBotao.href =
        `leitura.html?id=${progresso.capituloId}`;
    }

    if (barraContinue) {
      barraContinue.style.width =
        progresso.porcentagem
          ? `${Math.min(
              100,
              Math.max(
                5,
                Number(
                  progresso.porcentagem
                )
              )
            )}%`
          : "18%";
    }

    secaoContinue.hidden =
      false;

  } catch (erro) {
    console.error(
      "Erro ao carregar progresso:",
      erro
    );

    secaoContinue.hidden =
      true;
  }
}


// ========================================
// GÊNEROS
// ========================================

function obterTodosGeneros() {
  const generos =
    livros.flatMap(
      obterGeneros
    );

  return [
    ...new Set(generos)
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        "pt-BR"
      )
  );
}


function livroPossuiGenero(
  livro,
  genero
) {
  const generoNormalizado =
    normalizarTexto(genero);

  return obterGeneros(livro)
    .some(
      (item) =>
        normalizarTexto(item) ===
        generoNormalizado
    );
}


function mostrarGeneros() {
  if (!listaGeneros) {
    return;
  }

  const generos =
    obterTodosGeneros();

  listaGeneros.innerHTML = "";

  if (generos.length === 0) {
    listaGeneros.innerHTML = `
      <div class="mensagem-vazia-teste">
        Nenhum gênero cadastrado.
      </div>
    `;

    return;
  }

  generos.forEach(
    (genero) => {
      const botao =
        document.createElement(
          "button"
        );

      botao.type =
        "button";

      botao.className =
        "botao-genero";

      botao.textContent =
        genero;

      botao.addEventListener(
        "click",
        () => {
          const resultados =
            livros.filter(
              (livro) =>
                livroPossuiGenero(
                  livro,
                  genero
                )
            );

          campoPesquisa.value =
            genero;

          pesquisarLivros();

          window.scrollTo({
            top: 0,
            behavior: "smooth"
          });
        }
      );

      listaGeneros.appendChild(
        botao
      );
    }
  );
}


// ========================================
// FILEIRAS POR GÊNERO
// ========================================

function mostrarFileirasGeneros() {
  if (!secoesGeneros) {
    return;
  }

  secoesGeneros.innerHTML = "";

  const generos =
    obterTodosGeneros()
      .slice(0, 6);

  generos.forEach(
    (genero) => {
      const livrosGenero =
        livros.filter(
          (livro) =>
            livroPossuiGenero(
              livro,
              genero
            )
        );

      if (
        livrosGenero.length === 0
      ) {
        return;
      }

      const secao =
        document.createElement(
          "section"
        );

      secao.className =
        "secao-teste";

      const cabecalho =
        document.createElement(
          "div"
        );

      cabecalho.className =
        "cabecalho-secao-teste";

      cabecalho.innerHTML = `
        <div>
          <span class="rotulo-secao">
            Histórias para você
          </span>

          <h2>
            ${escaparHTML(genero)}
          </h2>
        </div>
      `;

      const carrossel =
        document.createElement(
          "div"
        );

      carrossel.className =
        "carrossel-livros";

      renderizarLivros(
        carrossel,
        livrosGenero.slice(0, 10)
      );

      secao.append(
        cabecalho,
        carrossel
      );

      secoesGeneros.appendChild(
        secao
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

  if (botaoLimparPesquisa) {
    botaoLimparPesquisa.hidden =
      !termo;
  }

  if (!termo) {
    secaoResultados.hidden =
      true;

    return;
  }

  const idsLivrosCapitulos =
    new Set();

  capitulos.forEach(
    (capitulo) => {
      const texto =
        normalizarTexto(
          [
            capitulo.titulo,
            capitulo.resumo,
            capitulo.livroTitulo,
            `capítulo ${
              capitulo.numero || ""
            }`
          ].join(" ")
        );

      if (
        texto.includes(termo) &&
        capitulo.livroId
      ) {
        idsLivrosCapitulos.add(
          capitulo.livroId
        );
      }
    }
  );

  const resultados =
    livros.filter(
      (livro) => {
        const textoLivro =
          normalizarTexto(
            [
              livro.titulo,
              livro.autor,
              livro.sinopse,
              ...obterGeneros(livro)
            ].join(" ")
          );

        return (
          textoLivro.includes(
            termo
          ) ||
          idsLivrosCapitulos.has(
            livro.id
          )
        );
      }
    );

  if (contadorResultados) {
    contadorResultados.textContent =
      String(resultados.length);
  }

  renderizarLivros(
    listaResultados,
    resultados
  );

  secaoResultados.hidden =
    false;
}


if (campoPesquisa) {
  campoPesquisa.addEventListener(
    "input",
    pesquisarLivros
  );
}


if (botaoLimparPesquisa) {
  botaoLimparPesquisa.addEventListener(
    "click",
    () => {
      campoPesquisa.value = "";

      pesquisarLivros();

      campoPesquisa.focus();
    }
  );
}


// ========================================
// CARREGAR FIREBASE
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

    livros =
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
                livro.status
              );

            return (
              !status ||
              status === "publicado"
            );
          }
        )
        .sort(
          (a, b) =>
            obterTempo(
              b.criadoEm
            ) -
            obterTempo(
              a.criadoEm
            )
        );

    capitulos =
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
                capitulo.status
              );

            return (
              !status ||
              status === "publicado"
            );
          }
        );

    const destaques =
      livros.filter(
        (livro) =>
          livro.destaque === true ||
          livro.emDestaque === true
      );

    const destaquePrincipal =
      destaques[0] ||
      livros[0];

    mostrarDestaque(
      destaquePrincipal
    );

    renderizarLivros(
      listaDestaques,
      (
        destaques.length > 0
          ? destaques
          : livros
      ).slice(0, 10)
    );

    renderizarLivros(
      listaLancamentos,
      livros.slice(0, 10)
    );

    renderizarLivros(
      gradeLivros,
      livros
    );

    if (quantidadeLivros) {
      quantidadeLivros.textContent =
        String(livros.length);
    }

    mostrarGeneros();
    mostrarFileirasGeneros();
    carregarContinueLendo();

  } catch (erro) {
    console.error(
      "Erro ao carregar a nova página:",
      erro
    );

    [
      listaDestaques,
      listaLancamentos,
      gradeLivros
    ].forEach(
      (elemento) => {
        if (elemento) {
          elemento.innerHTML = `
            <div class="mensagem-vazia-teste">
              Não foi possível carregar os livros.
            </div>
          `;
        }
      }
    );
  }
}


// ========================================
// LOGIN E ÁREA DO AUTOR
// ========================================

onAuthStateChanged(
  auth,
  async (usuario) => {
    await atualizarSaudacao(
      usuario
    );

    if (botaoAreaAutor) {
      const eAdministrador =
        usuario?.uid ===
        ADMIN_UID;

      botaoAreaAutor.hidden =
        !eAdministrador;
    }
  }
);


// ========================================
// INICIAR
// ========================================

carregarConteudo();