// ========================================
// IMPORTAÇÕES DO FIREBASE
// ========================================

import { db } from "./firebase-config.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const parametros =
  new URLSearchParams(window.location.search);

const capituloId =
  parametros.get("id");

const nomeLivro =
  document.getElementById("nomeLivro");

const numeroCapitulo =
  document.getElementById("numeroCapitulo");

const tituloCapitulo =
  document.getElementById("tituloCapitulo");

const textoCapitulo =
  document.getElementById("textoCapitulo");

const capituloAnterior =
  document.getElementById("capituloAnterior");

const proximoCapitulo =
  document.getElementById("proximoCapitulo");


// ========================================
// MOSTRAR MENSAGEM DE ERRO
// ========================================

function mostrarErro(mensagem) {
  if (nomeLivro) {
    nomeLivro.textContent =
      "Entre Capítulos";
  }

  if (numeroCapitulo) {
    numeroCapitulo.textContent =
      "Capítulo indisponível";
  }

  if (tituloCapitulo) {
    tituloCapitulo.textContent =
      "Não foi possível abrir";
  }

  if (textoCapitulo) {
    textoCapitulo.innerHTML = "";

    const mensagemErro =
      document.createElement("div");

    mensagemErro.className =
      "mensagem-leitura";

    mensagemErro.textContent =
      mensagem;

    textoCapitulo.appendChild(
      mensagemErro
    );
  }

  desativarBotao(capituloAnterior);
  desativarBotao(proximoCapitulo);
}


// ========================================
// FORMATAR TEXTO DO CAPÍTULO
// ========================================

function mostrarTexto(texto = "") {
  if (!textoCapitulo) {
    return;
  }

  textoCapitulo.innerHTML = "";

  const textoLimpo =
    String(texto).trim();

  if (!textoLimpo) {
    const mensagem =
      document.createElement("div");

    mensagem.className =
      "mensagem-leitura";

    mensagem.textContent =
      "Este capítulo ainda não possui texto.";

    textoCapitulo.appendChild(
      mensagem
    );

    return;
  }

  const paragrafos =
    textoLimpo.split(/\n\s*\n/);

  paragrafos.forEach((paragrafo) => {
    const elemento =
      document.createElement("p");

    elemento.textContent =
      paragrafo
        .replace(/\n/g, " ")
        .trim();

    textoCapitulo.appendChild(
      elemento
    );
  });
}


// ========================================
// CONTROLAR BOTÕES DE NAVEGAÇÃO
// ========================================

function ativarBotao(
  botao,
  idDoCapitulo
) {
  if (!botao || !idDoCapitulo) {
    return;
  }

  botao.href =
    `leitura.html?id=${idDoCapitulo}`;

  botao.classList.remove(
    "botao-desativado"
  );
}


function desativarBotao(botao) {
  if (!botao) {
    return;
  }

  botao.href = "#";

  botao.classList.add(
    "botao-desativado"
  );
}


// ========================================
// LER LISTAS SALVAS
// ========================================

function lerListaLocal(chave) {
  try {
    const valorSalvo =
      localStorage.getItem(chave);

    if (!valorSalvo) {
      return [];
    }

    const lista =
      JSON.parse(valorSalvo);

    return Array.isArray(lista)
      ? lista
      : [];

  } catch (erro) {
    console.error(
      `Erro ao ler ${chave}:`,
      erro
    );

    return [];
  }
}


// ========================================
// SALVAR PROGRESSO DE LEITURA
// ========================================

function salvarProgressoLeitura({
  livroId,
  livroTitulo,
  capituloId,
  capituloNumero,
  capituloTitulo
}) {
  try {
    if (!livroId || !capituloId) {
      return;
    }

    const progresso = {
      livroId,
      livroTitulo:
        livroTitulo || "Livro",
      capituloId,
      numero:
        capituloNumero || 0,
      capituloTitulo:
        capituloTitulo || "Capítulo",
      atualizadoEm:
        new Date().toISOString()
    };

    /*
      Salva o último capítulo aberto.
      O perfil usa este item para mostrar
      a área "Continuar lendo".
    */

    localStorage.setItem(
      "ultimoCapituloLido",
      JSON.stringify(progresso)
    );


    /*
      Registra os capítulos lidos.
    */

    const capitulosLidos =
      lerListaLocal("capitulosLidos");

    const capituloJaExiste =
      capitulosLidos.some(
        (item) => {
          if (typeof item === "string") {
            return item === capituloId;
          }

          return item.capituloId === capituloId;
        }
      );

    if (!capituloJaExiste) {
      capitulosLidos.push({
        capituloId,
        livroId,
        numero:
          capituloNumero || 0,
        titulo:
          capituloTitulo || "Capítulo",
        lidoEm:
          new Date().toISOString()
      });

      localStorage.setItem(
        "capitulosLidos",
        JSON.stringify(capitulosLidos)
      );
    }


    /*
      Registra os livros iniciados.
    */

    const livrosIniciados =
      lerListaLocal("livrosIniciados");

    const livroJaExiste =
      livrosIniciados.some(
        (item) => {
          if (typeof item === "string") {
            return item === livroId;
          }

          return item.livroId === livroId;
        }
      );

    if (!livroJaExiste) {
      livrosIniciados.push({
        livroId,
        titulo:
          livroTitulo || "Livro",
        iniciadoEm:
          new Date().toISOString()
      });

      localStorage.setItem(
        "livrosIniciados",
        JSON.stringify(livrosIniciados)
      );
    }

    console.log(
      "Progresso de leitura salvo."
    );

  } catch (erro) {
    console.error(
      "Erro ao salvar progresso:",
      erro
    );
  }
}


// ========================================
// CARREGAR CAPÍTULOS DO MESMO LIVRO
// ========================================

async function carregarNavegacao(
  livroId,
  idAtual
) {
  try {
    const consulta = query(
      collection(db, "capitulos"),
      where("livroId", "==", livroId),
      where("status", "==", "publicado")
    );

    const resultado =
      await getDocs(consulta);

    const capitulos = [];

    resultado.forEach((documento) => {
      capitulos.push({
        id: documento.id,
        ...documento.data()
      });
    });

    capitulos.sort((a, b) => {
      const numeroA =
        Number(a.numero) || 0;

      const numeroB =
        Number(b.numero) || 0;

      return numeroA - numeroB;
    });

    const posicaoAtual =
      capitulos.findIndex(
        (capitulo) =>
          capitulo.id === idAtual
      );

    if (posicaoAtual === -1) {
      desativarBotao(
        capituloAnterior
      );

      desativarBotao(
        proximoCapitulo
      );

      return;
    }

    const anterior =
      capitulos[posicaoAtual - 1];

    const proximo =
      capitulos[posicaoAtual + 1];

    if (anterior) {
      ativarBotao(
        capituloAnterior,
        anterior.id
      );
    } else {
      desativarBotao(
        capituloAnterior
      );
    }

    if (proximo) {
      ativarBotao(
        proximoCapitulo,
        proximo.id
      );
    } else {
      desativarBotao(
        proximoCapitulo
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar navegação:",
      erro
    );

    desativarBotao(
      capituloAnterior
    );

    desativarBotao(
      proximoCapitulo
    );
  }
}


// ========================================
// CARREGAR NOME DO LIVRO
// ========================================

async function carregarNomeLivro(
  livroId,
  tituloSalvo
) {
  let tituloFinal =
    tituloSalvo || "Livro";

  if (tituloSalvo && nomeLivro) {
    nomeLivro.textContent =
      tituloSalvo;
  }

  if (!livroId) {
    return tituloFinal;
  }

  try {
    const referenciaLivro =
      doc(db, "livros", livroId);

    const resultadoLivro =
      await getDoc(referenciaLivro);

    if (!resultadoLivro.exists()) {
      return tituloFinal;
    }

    const livro =
      resultadoLivro.data();

    tituloFinal =
      livro.titulo ||
      tituloSalvo ||
      "Livro";

    if (nomeLivro) {
      nomeLivro.textContent =
        tituloFinal;
    }

    return tituloFinal;

  } catch (erro) {
    console.error(
      "Erro ao carregar nome do livro:",
      erro
    );

    return tituloFinal;
  }
}


// ========================================
// CARREGAR CAPÍTULO
// ========================================

async function carregarCapitulo() {
  if (!capituloId) {
    mostrarErro(
      "O endereço deste capítulo está incompleto."
    );

    return;
  }

  try {
    const referenciaCapitulo =
      doc(
        db,
        "capitulos",
        capituloId
      );

    const resultadoCapitulo =
      await getDoc(
        referenciaCapitulo
      );

    if (!resultadoCapitulo.exists()) {
      mostrarErro(
        "Este capítulo não existe ou foi removido."
      );

      return;
    }

    const capitulo =
      resultadoCapitulo.data();

    if (
      capitulo.status &&
      capitulo.status !== "publicado"
    ) {
      mostrarErro(
        "Este capítulo ainda não foi publicado."
      );

      return;
    }

    const numero =
      Number(capitulo.numero) || 0;

    const titulo =
      capitulo.titulo ||
      "Capítulo sem título";

    if (numeroCapitulo) {
      numeroCapitulo.textContent =
        numero > 0
          ? `Capítulo ${numero}`
          : "Capítulo";
    }

    if (tituloCapitulo) {
      tituloCapitulo.textContent =
        titulo;
    }

    mostrarTexto(
      capitulo.texto || ""
    );

    document.title =
      `${
        numero > 0
          ? `Capítulo ${numero} — `
          : ""
      }${titulo} | Entre Capítulos`;

    const tituloDoLivro =
      await carregarNomeLivro(
        capitulo.livroId,
        capitulo.livroTitulo
      );

    /*
      O progresso é salvo depois que o título
      verdadeiro do livro é carregado.
    */

    salvarProgressoLeitura({
      livroId:
        capitulo.livroId,
      livroTitulo:
        tituloDoLivro,
      capituloId,
      capituloNumero:
        numero,
      capituloTitulo:
        titulo
    });

    if (capitulo.livroId) {
      await carregarNavegacao(
        capitulo.livroId,
        capituloId
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar capítulo:",
      erro
    );

    mostrarErro(
      "Não foi possível carregar este capítulo."
    );
  }
}


// ========================================
// INICIAR PÁGINA
// ========================================

carregarCapitulo();