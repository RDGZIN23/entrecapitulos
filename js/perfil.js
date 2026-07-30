// ========================================
// IMPORTAÇÕES DO FIREBASE
// ========================================

import {
  auth,
  db
} from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

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

const botaoSair =
  document.getElementById("botaoSair");

const mensagemCarregando =
  document.getElementById("mensagemCarregando");

const conteudoPerfil =
  document.getElementById("conteudoPerfil");

const avatarPerfil =
  document.getElementById("avatarPerfil");

const nomePerfil =
  document.getElementById("nomePerfil");

const emailPerfil =
  document.getElementById("emailPerfil");

const totalFavoritos =
  document.getElementById("totalFavoritos");

const totalCapitulos =
  document.getElementById("totalCapitulos");

const totalLivros =
  document.getElementById("totalLivros");

const areaContinueLendo =
  document.getElementById("areaContinueLendo");


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function obterIniciais(nome = "Leitor") {
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
      .charAt(0)
      .toUpperCase();
  }

  return (
    partes[0].charAt(0) +
    partes[partes.length - 1].charAt(0)
  ).toUpperCase();
}


function lerListaLocal(chave) {
  try {
    const valor =
      localStorage.getItem(chave);

    if (!valor) {
      return [];
    }

    const lista =
      JSON.parse(valor);

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


function mostrarErro(mensagem) {
  if (mensagemCarregando) {
    mensagemCarregando.hidden =
      false;

    mensagemCarregando.textContent =
      mensagem;
  }

  if (conteudoPerfil) {
    conteudoPerfil.hidden =
      true;
  }
}


// ========================================
// ESTATÍSTICAS LOCAIS
// ========================================

function carregarEstatisticasLocais() {
  const capitulosLidos =
    lerListaLocal("capitulosLidos");

  const livrosIniciados =
    lerListaLocal("livrosIniciados");

  if (totalCapitulos) {
    totalCapitulos.textContent =
      String(capitulosLidos.length);
  }

  if (totalLivros) {
    totalLivros.textContent =
      String(livrosIniciados.length);
  }
}


// ========================================
// FAVORITOS DO FIREBASE
// ========================================

async function carregarFavoritos(
  usuarioId
) {
  try {
    const consultaFavoritos =
      query(
        collection(db, "favoritos"),
        where(
          "usuarioId",
          "==",
          usuarioId
        )
      );

    const resultadoFavoritos =
      await getDocs(
        consultaFavoritos
      );

    if (totalFavoritos) {
      totalFavoritos.textContent =
        String(resultadoFavoritos.size);
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar favoritos:",
      erro
    );

    if (totalFavoritos) {
      totalFavoritos.textContent =
        "0";
    }
  }
}


// ========================================
// CONTINUAR LENDO
// ========================================

function carregarContinueLendo() {
  if (!areaContinueLendo) {
    return;
  }

  const progressoSalvo =
    localStorage.getItem(
      "ultimoCapituloLido"
    );

  if (!progressoSalvo) {
    areaContinueLendo.textContent =
      "Você ainda não começou nenhuma leitura.";

    return;
  }

  try {
    const progresso =
      JSON.parse(progressoSalvo);

    if (
      !progresso ||
      !progresso.capituloId
    ) {
      throw new Error(
        "Progresso inválido"
      );
    }

    areaContinueLendo.innerHTML = "";

    const tituloLivro =
      document.createElement("h3");

    tituloLivro.textContent =
      progresso.livroTitulo ||
      "Livro";

    tituloLivro.style.margin =
      "0 0 8px";

    const capitulo =
      document.createElement("p");

    const numero =
      progresso.numero
        ? `Capítulo ${progresso.numero}`
        : "Capítulo";

    const titulo =
      progresso.capituloTitulo
        ? ` • ${progresso.capituloTitulo}`
        : "";

    capitulo.textContent =
      `${numero}${titulo}`;

    capitulo.style.margin =
      "0 0 16px";

    const botao =
      document.createElement("a");

    botao.href =
      `leitura.html?id=${progresso.capituloId}`;

    botao.className =
      "acao-perfil";

    botao.textContent =
      "📖 Continuar leitura";

    areaContinueLendo.append(
      tituloLivro,
      capitulo,
      botao
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar progresso:",
      erro
    );

    areaContinueLendo.textContent =
      "Não foi possível carregar seu progresso de leitura.";
  }
}


// ========================================
// CARREGAR PERFIL DO FIRESTORE
// ========================================

async function carregarPerfil(usuario) {
  try {
    const referenciaUsuario =
      doc(
        db,
        "usuarios",
        usuario.uid
      );

    const resultadoUsuario =
      await getDoc(
        referenciaUsuario
      );

    const dados =
      resultadoUsuario.exists()
        ? resultadoUsuario.data()
        : {};

    const nome =
      dados.nome ||
      usuario.displayName ||
      "Leitor";

    const email =
      dados.email ||
      usuario.email ||
      "E-mail não informado";

    if (nomePerfil) {
      nomePerfil.textContent =
        nome;
    }

    if (emailPerfil) {
      emailPerfil.textContent =
        email;
    }

    if (avatarPerfil) {
      avatarPerfil.textContent =
        obterIniciais(nome);
    }

    carregarEstatisticasLocais();

    await carregarFavoritos(
      usuario.uid
    );

    carregarContinueLendo();

    if (mensagemCarregando) {
      mensagemCarregando.hidden =
        true;
    }

    if (conteudoPerfil) {
      conteudoPerfil.hidden =
        false;
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar perfil:",
      erro
    );

    mostrarErro(
      "Não foi possível carregar seu perfil."
    );
  }
}


// ========================================
// VERIFICAR LOGIN
// ========================================

onAuthStateChanged(
  auth,
  (usuario) => {
    if (!usuario) {
      window.location.href =
        "entrar.html";

      return;
    }

    carregarPerfil(usuario);
  }
);


// ========================================
// SAIR DA CONTA
// ========================================

if (botaoSair) {
  botaoSair.addEventListener(
    "click",
    async () => {
      botaoSair.disabled = true;
      botaoSair.textContent =
        "Saindo...";

      try {
        await signOut(auth);

        window.location.href =
          "index.html";

      } catch (erro) {
        console.error(
          "Erro ao sair:",
          erro
        );

        botaoSair.disabled = false;
        botaoSair.textContent =
          "Sair";

        alert(
          "Não foi possível sair da conta."
        );
      }
    }
  );
}