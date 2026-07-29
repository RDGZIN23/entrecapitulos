// ==============================
// IMPORTAÇÕES DO FIREBASE
// ==============================

import { db } from "./firebase-config.js";

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
// ELEMENTOS DA PÁGINA
// ==============================

const parametros =
  new URLSearchParams(window.location.search);

const livroId =
  parametros.get("id");

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
      <p>${escaparHTML(mensagem)}</p>
    `;
  }

  if (quantidadeCapitulos) {
    quantidadeCapitulos.textContent =
      "0 capítulos";
  }

  if (botaoComecarLeitura) {
    botaoComecarLeitura.href = "#";
    botaoComecarLeitura.style.pointerEvents =
      "none";
    botaoComecarLeitura.style.opacity =
      "0.6";
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

    const livro =
      resultadoLivro.data();

    if (tituloLivro) {
      tituloLivro.textContent =
        livro.titulo || "Livro sem título";
    }

    if (autorLivro) {
      autorLivro.textContent =
        livro.autor || "Autor desconhecido";
    }

    if (generoLivro) {
      generoLivro.textContent =
        livro.genero || "Gênero não definido";
    }

    if (sinopseLivro) {
      sinopseLivro.textContent =
        livro.sinopse ||
        "Sinopse não disponível.";
    }

    if (capaLivro) {
      capaLivro.src =
        livro.capa ||
        "images/depois-de-te-odiar.png";

      capaLivro.alt =
        `Capa do livro ${
          livro.titulo || ""
        }`;
    }

    document.title =
      `${
        livro.titulo || "Livro"
      } | Entre Capítulos`;

    configurarFavorito(
      livro.titulo || "Livro"
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
    <p>Carregando capítulos...</p>
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
      listaCapitulos.innerHTML = `
        <p>
          Nenhum capítulo publicado ainda.
        </p>
      `;

      if (quantidadeCapitulos) {
        quantidadeCapitulos.textContent =
          "0 capítulos";
      }

      if (botaoComecarLeitura) {
        botaoComecarLeitura.href = "#";

        botaoComecarLeitura.style.pointerEvents =
          "none";

        botaoComecarLeitura.style.opacity =
          "0.6";

        botaoComecarLeitura.textContent =
          "Nenhum capítulo disponível";
      }

      return;
    }

    listaCapitulos.innerHTML = "";

    const capitulos = [];

    resultado.forEach((documento) => {
      capitulos.push({
        id: documento.id,
        ...documento.data()
      });
    });

    if (quantidadeCapitulos) {
      const total =
        capitulos.length;

      quantidadeCapitulos.textContent =
        total === 1
          ? "1 capítulo"
          : `${total} capítulos`;
    }

    capitulos.forEach((capitulo) => {
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

      const cartao =
        document.createElement("a");

      cartao.href =
        `leitura.html?id=${capitulo.id}`;

      cartao.className =
        "cartao-capitulo";

      cartao.innerHTML = `
        <div class="numero-capitulo">
          ${numeroFormatado}
        </div>

        <div class="dados-capitulo">
          <span>
            Capítulo ${numero}
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

      listaCapitulos.appendChild(cartao);
    });

    const primeiroCapitulo =
      capitulos[0];

    if (
      primeiroCapitulo &&
      botaoComecarLeitura
    ) {
      botaoComecarLeitura.href =
        `leitura.html?id=${primeiroCapitulo.id}`;

      botaoComecarLeitura.style.pointerEvents =
        "auto";

      botaoComecarLeitura.style.opacity =
        "1";

      botaoComecarLeitura.textContent =
        "Começar a ler";
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar capítulos:",
      erro
    );

    listaCapitulos.innerHTML = `
      <p>
        Não foi possível carregar os capítulos.
      </p>
    `;

    if (quantidadeCapitulos) {
      quantidadeCapitulos.textContent =
        "0 capítulos";
    }

    if (botaoComecarLeitura) {
      botaoComecarLeitura.href = "#";

      botaoComecarLeitura.style.pointerEvents =
        "none";

      botaoComecarLeitura.style.opacity =
        "0.6";
    }
  }
}


// ==============================
// SISTEMA DE FAVORITOS
// ==============================

function configurarFavorito(titulo) {
  if (!botaoFavorito || !livroId) {
    return;
  }

  const chaveFavorito =
    `livroFavorito_${livroId}`;

  function atualizarBotao() {
    const favorito =
      localStorage.getItem(
        chaveFavorito
      ) === "true";

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

  atualizarBotao();

  botaoFavorito.addEventListener(
    "click",
    () => {
      const favoritoAtual =
        localStorage.getItem(
          chaveFavorito
        ) === "true";

      const novoEstado =
        !favoritoAtual;

      localStorage.setItem(
        chaveFavorito,
        String(novoEstado)
      );

      localStorage.setItem(
        `${chaveFavorito}_titulo`,
        titulo
      );

      atualizarBotao();
    }
  );
}


// ==============================
// INICIAR PÁGINA
// ==============================

carregarLivro();