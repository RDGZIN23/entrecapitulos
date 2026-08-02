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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const bannerCapa =
  document.getElementById("bannerCapa");

const bannerGenero =
  document.getElementById("bannerGenero");

const bannerTitulo =
  document.getElementById("bannerTitulo");

const bannerAutor =
  document.getElementById("bannerAutor");

const bannerSinopse =
  document.getElementById("bannerSinopse");

const bannerBotao =
  document.getElementById("bannerBotao");

const campoPesquisa =
  document.getElementById(
    "campoPesquisa"
  ) ||
  document.querySelector(
    ".pesquisa input"
  ) ||
  document.querySelector(
    'input[type="search"]'
  );

const livrosDestaque =
  document.getElementById("livrosDestaque");

const listaLivros =
  document.getElementById("listaLivros");

const quantidadeLivros =
  document.getElementById("quantidadeLivros");

const mensagemSemLivros =
  document.getElementById("mensagemSemLivros");

const secaoContinueLendo =
  document.getElementById("secaoContinueLendo");

const continueCapa =
  document.getElementById("continueCapa");

const continueTitulo =
  document.getElementById("continueTitulo");

const continueCapitulo =
  document.getElementById("continueCapitulo");

const continueBotao =
  document.getElementById("continueBotao");

const botaoAreaAutor =
  document.getElementById(
    "botaoAreaAutor"
  );


// ========================================
// CONFIGURAÇÕES
// ========================================

const capaPadrao =
  "images/depois-de-te-odiar.png";

const ADMIN_UID =
  "VPjjYv2NOdXMTTTxynB1MHTrfx23";

let todosOsLivros = [];
let todosOsCapitulos = [];


// ========================================
// PROTEGER TEXTOS NO HTML
// ========================================

function escaparHTML(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========================================
// NORMALIZAR TEXTO PARA PESQUISA
// ========================================

function normalizarTexto(valor = "") {
  return String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


// ========================================
// ORGANIZAR LIVROS
// ========================================

function ordenarLivros(livros) {
  return [...livros].sort((a, b) => {
    const dataA =
      a.criadoEm?.seconds ||
      a.dataCriacao?.seconds ||
      0;

    const dataB =
      b.criadoEm?.seconds ||
      b.dataCriacao?.seconds ||
      0;

    return dataB - dataA;
  });
}


// ========================================
// CONFIGURAR BANNER PRINCIPAL
// ========================================

function mostrarLivroNoBanner(livro) {
  if (!livro) {
    if (bannerGenero) {
      bannerGenero.textContent =
        "Entre Capítulos";
    }

    if (bannerTitulo) {
      bannerTitulo.textContent =
        "Nenhum livro disponível";
    }

    if (bannerAutor) {
      bannerAutor.textContent =
        "Cadastre um livro na Área do Autor";
    }

    if (bannerSinopse) {
      bannerSinopse.textContent =
        "Os livros publicados aparecerão automaticamente aqui.";
    }

    if (bannerBotao) {
      bannerBotao.href = "#";
      bannerBotao.style.pointerEvents =
        "none";
      bannerBotao.style.opacity =
        "0.6";
    }

    return;
  }

  if (bannerCapa) {
    bannerCapa.src =
      livro.capa || capaPadrao;

    bannerCapa.alt =
      `Capa do livro ${
        livro.titulo || "sem título"
      }`;

    bannerCapa.onerror = () => {
      bannerCapa.src = capaPadrao;
    };
  }

  if (bannerGenero) {
    bannerGenero.textContent =
      livro.genero ||
      "Livro em destaque";
  }

  if (bannerTitulo) {
    bannerTitulo.textContent =
      livro.titulo ||
      "Livro sem título";
  }

  if (bannerAutor) {
    bannerAutor.textContent =
      livro.autor
        ? `Por ${livro.autor}`
        : "Autor não informado";
  }

  if (bannerSinopse) {
    bannerSinopse.textContent =
      livro.sinopse ||
      "Sinopse não disponível.";
  }

  if (bannerBotao) {
    bannerBotao.href =
      `livro.html?id=${livro.id}`;

    bannerBotao.style.pointerEvents =
      "auto";

    bannerBotao.style.opacity =
      "1";
  }
}


// ========================================
// CRIAR CARD DE LIVRO
// ========================================

function criarCardLivro(livro) {
  const card =
    document.createElement("article");

  card.className =
    "card card-livro";

  const titulo =
    escaparHTML(
      livro.titulo ||
      "Livro sem título"
    );

  const autor =
    escaparHTML(
      livro.autor ||
      "Autor desconhecido"
    );

  const genero =
    escaparHTML(
      livro.genero ||
      "Gênero não informado"
    );

  const capa =
    escaparHTML(
      livro.capa ||
      capaPadrao
    );

  card.innerHTML = `
    <a
      href="livro.html?id=${livro.id}"
      class="link-card-livro"
    >
      <img
        src="${capa}"
        alt="Capa de ${titulo}"
        class="capa-card-livro"
      >

      <div class="conteudo-card-livro">

        <span class="categoria-card-livro">
          ${genero}
        </span>

        <h3>${titulo}</h3>

        <p>${autor}</p>

        <span class="btn">
          📖 Ler agora
        </span>

      </div>
    </a>
  `;

  const imagem =
    card.querySelector("img");

  if (imagem) {
    imagem.addEventListener(
      "error",
      () => {
        imagem.src = capaPadrao;
      }
    );
  }

  return card;
}


// ========================================
// EXIBIR LIVROS NA BIBLIOTECA
// ========================================

function mostrarBiblioteca(livros) {
  if (!listaLivros) {
    return;
  }

  listaLivros.innerHTML = "";

  if (mensagemSemLivros) {
    mensagemSemLivros.hidden =
      livros.length !== 0;
  }

  if (quantidadeLivros) {
    const total =
      livros.length;

    quantidadeLivros.textContent =
      total === 1
        ? "1 livro disponível"
        : `${total} livros disponíveis`;
  }

  if (livros.length === 0) {
    listaLivros.innerHTML = `
      <p>Nenhum livro encontrado.</p>
    `;

    return;
  }

  livros.forEach((livro) => {
    listaLivros.appendChild(
      criarCardLivro(livro)
    );
  });
}


// ========================================
// EXIBIR LIVROS EM DESTAQUE
// ========================================

function mostrarDestaques(livros) {
  if (!livrosDestaque) {
    return;
  }

  livrosDestaque.innerHTML = "";

  const destaques =
    livros.filter((livro) => {
      return (
        livro.destaque === true ||
        livro.emDestaque === true
      );
    });

  const livrosParaMostrar =
    destaques.length > 0
      ? destaques.slice(0, 4)
      : livros.slice(0, 4);

  if (livrosParaMostrar.length === 0) {
    livrosDestaque.innerHTML = `
      <p>Nenhum livro em destaque.</p>
    `;

    return;
  }

  livrosParaMostrar.forEach((livro) => {
    livrosDestaque.appendChild(
      criarCardLivro(livro)
    );
  });
}


// ========================================
// PESQUISAR LIVROS E CAPÍTULOS
// ========================================

function configurarPesquisa() {
  if (!campoPesquisa) {
    console.error(
      "Campo de pesquisa não encontrado."
    );

    return;
  }

  campoPesquisa.addEventListener(
    "input",
    () => {
      const termo =
        normalizarTexto(
          campoPesquisa.value
        );

      if (secaoContinueLendo) {
  secaoContinueLendo.hidden =
    Boolean(termo);
}

      if (!termo) {
       carregarContinueLendo();

 mostrarDestaques(
          todosOsLivros
        );

        mostrarBiblioteca(
          todosOsLivros
        );

        if (quantidadeLivros) {
          quantidadeLivros.textContent =
            todosOsLivros.length === 1
              ? "1 livro disponível"
              : `${todosOsLivros.length} livros disponíveis`;
        }

        return;
      }

      const idsLivrosDosCapitulos =
        new Set();

      todosOsCapitulos.forEach(
        (capitulo) => {
          const textoDoCapitulo =
            normalizarTexto(
              [
                capitulo.titulo || "",
                capitulo.resumo || "",
                `capítulo ${capitulo.numero || ""}`,
                `capitulo ${capitulo.numero || ""}`,
                capitulo.livroTitulo || ""
              ].join(" ")
            );

          if (
            textoDoCapitulo.includes(
              termo
            ) &&
            capitulo.livroId
          ) {
            idsLivrosDosCapitulos.add(
              capitulo.livroId
            );
          }
        }
      );

      const resultados =
        todosOsLivros.filter(
          (livro) => {
            const textoDoLivro =
              normalizarTexto(
                [
                  livro.titulo || "",
                  livro.autor || "",
                  livro.genero || "",
                  livro.sinopse || ""
                ].join(" ")
              );

            return (
              textoDoLivro.includes(
                termo
              ) ||
              idsLivrosDosCapitulos.has(
                livro.id
              )
            );
          }
        );

      /*
        Mostra o resultado nas duas áreas,
        deixando a resposta visível logo
        abaixo do campo de pesquisa.
      */

      mostrarDestaques(
        resultados
      );

      mostrarBiblioteca(
        resultados
      );

      if (quantidadeLivros) {
        quantidadeLivros.textContent =
          resultados.length === 1
            ? "1 resultado encontrado"
            : `${resultados.length} resultados encontrados`;
      }

      console.log(
        "Termo pesquisado:",
        termo
      );

      console.log(
        "Resultados:",
        resultados.length
      );
    }
  );
}


// ========================================
// CONTINUAR LENDO
// ========================================

function carregarContinueLendo() {
  if (!secaoContinueLendo) {
    return;
  }

  const progressoSalvo =
    localStorage.getItem(
      "ultimoCapituloLido"
    );

  if (!progressoSalvo) {
    secaoContinueLendo.hidden =
      true;

    return;
  }

  try {
    const progresso =
      JSON.parse(progressoSalvo);

    if (
      !progresso ||
      !progresso.capituloId
    ) {
      secaoContinueLendo.hidden =
        true;

      return;
    }

    if (continueCapa) {
      continueCapa.src =
        progresso.capa ||
        capaPadrao;

      continueCapa.onerror = () => {
        continueCapa.src =
          capaPadrao;
      };
    }

    if (continueTitulo) {
      continueTitulo.textContent =
        progresso.livroTitulo ||
        "Continue lendo";
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

    secaoContinueLendo.hidden =
      false;

  } catch (erro) {
    console.error(
      "Erro ao carregar progresso:",
      erro
    );

    secaoContinueLendo.hidden =
      true;
  }
}


// ========================================
// MOSTRAR ERRO
// ========================================

function mostrarErro(mensagem) {
  if (listaLivros) {
    listaLivros.innerHTML = `
      <p>${escaparHTML(mensagem)}</p>
    `;
  }

  if (livrosDestaque) {
    livrosDestaque.innerHTML = `
      <p>${escaparHTML(mensagem)}</p>
    `;
  }

  if (quantidadeLivros) {
    quantidadeLivros.textContent =
      "0 livros disponíveis";
  }

  mostrarLivroNoBanner(null);
}


// ========================================
// CARREGAR CAPÍTULOS PARA A PESQUISA
// ========================================

async function carregarCapitulosPesquisa() {
  try {
    const resultado =
      await getDocs(
        collection(
          db,
          "capitulos"
        )
      );

    todosOsCapitulos =
      resultado.docs
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

  } catch (erro) {
    console.error(
      "Erro ao carregar capítulos para pesquisa:",
      erro
    );

    todosOsCapitulos = [];
  }
}


// ========================================
// CARREGAR LIVROS DO FIREBASE
// ========================================

async function carregarLivros() {
  try {
    const resultado =
      await getDocs(
        collection(db, "livros")
      );

    const livros = [];

    resultado.forEach((documento) => {
      const dados =
        documento.data();

      /*
        Livros sem status ou com status
        publicado aparecem no site.

        Livros marcados como rascunho
        ficam ocultos.
      */

      const status =
        String(
          dados.status || ""
        ).toLowerCase();

      const podeAparecer =
        !status ||
        status === "publicado";

      if (podeAparecer) {
        livros.push({
          id: documento.id,
          ...dados
        });
      }
    });

    todosOsLivros =
      ordenarLivros(livros);

    mostrarLivroNoBanner(
      todosOsLivros[0]
    );

    mostrarDestaques(
      todosOsLivros
    );

    mostrarBiblioteca(
      todosOsLivros
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar livros:",
      erro
    );

    mostrarErro(
      "Não foi possível carregar os livros."
    );
  }
}

// ========================================
// CONTROLAR ÁREA DO AUTOR
// ========================================

function configurarAreaAutor() {
  if (!botaoAreaAutor) {
    return;
  }

  onAuthStateChanged(
    auth,
    (usuario) => {
      const eAdministrador =
        usuario &&
        usuario.uid === ADMIN_UID;

      botaoAreaAutor.hidden =
        !eAdministrador;

      if (eAdministrador) {
        botaoAreaAutor.href =
          "painel.html";
      }
    },
    (erro) => {
      console.error(
        "Erro ao verificar administrador:",
        erro
      );

      botaoAreaAutor.hidden = true;
    }
  );
}



// ========================================
// INICIAR A PÁGINA
// ========================================

async function iniciarPagina() {
  configurarAreaAutor();
  carregarContinueLendo();

  try {
    await Promise.all([
      carregarLivros(),
      carregarCapitulosPesquisa()
    ]);

    configurarPesquisa();

    console.log(
      "Livros carregados:",
      todosOsLivros.length
    );

    console.log(
      "Capítulos carregados:",
      todosOsCapitulos.length
    );

  } catch (erro) {
    console.error(
      "Erro ao iniciar a página:",
      erro
    );

    mostrarErro(
      "Não foi possível iniciar a página."
    );
  }
}

iniciarPagina();