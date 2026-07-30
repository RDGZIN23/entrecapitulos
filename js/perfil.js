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
  deleteDoc,
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

const listaFavoritos =
  document.getElementById("listaFavoritos");

const areaContinueLendo =
  document.getElementById("areaContinueLendo");


// ========================================
// CONFIGURAÇÕES
// ========================================

const capaPadrao =
  "images/depois-de-te-odiar.png";


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


function mostrarMensagemFavoritosVazios() {
  if (!listaFavoritos) {
    return;
  }

  listaFavoritos.innerHTML = "";

  const mensagem =
    document.createElement("div");

  mensagem.className =
    "cartao-vazio";

  mensagem.textContent =
    "Você ainda não adicionou nenhum livro aos favoritos.";

  listaFavoritos.appendChild(
    mensagem
  );
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
// REMOVER FAVORITO
// ========================================

async function removerFavorito(
  favorito,
  cartao,
  botaoRemover
) {
  if (!favorito.id) {
    alert(
      "Não foi possível identificar este favorito."
    );

    return;
  }

  const confirmar =
    window.confirm(
      `Remover "${
        favorito.titulo ||
        "este livro"
      }" dos favoritos?`
    );

  if (!confirmar) {
    return;
  }

  botaoRemover.disabled =
    true;

  botaoRemover.textContent =
    "Removendo...";

  try {
    await deleteDoc(
      doc(
        db,
        "favoritos",
        favorito.id
      )
    );

    cartao.remove();

    const quantidadeAtual =
      Number(
        totalFavoritos?.textContent ||
        0
      );

    const novaQuantidade =
      Math.max(
        0,
        quantidadeAtual - 1
      );

    if (totalFavoritos) {
      totalFavoritos.textContent =
        String(novaQuantidade);
    }

    const cartoesRestantes =
      listaFavoritos?.querySelectorAll(
        ".cartao-favorito"
      ).length || 0;

    if (cartoesRestantes === 0) {
      mostrarMensagemFavoritosVazios();
    }

  } catch (erro) {
    console.error(
      "Erro ao remover favorito:",
      erro
    );

    botaoRemover.disabled =
      false;

    botaoRemover.textContent =
      "♥ Remover";

    alert(
      "Não foi possível remover o livro dos favoritos."
    );
  }
}


// ========================================
// CRIAR CARTÃO DE FAVORITO
// ========================================

function criarCartaoFavorito(favorito) {
  const cartao =
    document.createElement("article");

  cartao.className =
    "cartao-favorito";

  const imagem =
    document.createElement("img");

  imagem.className =
    "capa-favorito";

  imagem.src =
    favorito.capa ||
    capaPadrao;

  imagem.alt =
    `Capa do livro ${
      favorito.titulo ||
      "favorito"
    }`;

  imagem.loading =
    "lazy";

  imagem.addEventListener(
    "error",
    () => {
      imagem.src =
        capaPadrao;
    }
  );

  const conteudo =
    document.createElement("div");

  conteudo.className =
    "conteudo-favorito";

  const titulo =
    document.createElement("h3");

  titulo.textContent =
    favorito.titulo ||
    "Livro sem título";

  const autor =
    document.createElement("p");

  autor.textContent =
    favorito.autor ||
    "Autor não informado";

  const areaBotoes =
    document.createElement("div");

  areaBotoes.className =
    "botoes-favorito";

  const botaoAbrir =
    document.createElement("a");

  botaoAbrir.className =
    "botao-abrir-favorito";

  botaoAbrir.href =
    favorito.livroId
      ? `livro.html?id=${favorito.livroId}`
      : "index.html#biblioteca";

  botaoAbrir.textContent =
    "📖 Abrir livro";

  const botaoRemover =
    document.createElement("button");

  botaoRemover.type =
    "button";

  botaoRemover.className =
    "botao-remover-favorito";

  botaoRemover.textContent =
    "♥ Remover";

  botaoRemover.setAttribute(
    "aria-label",
    `Remover ${
      favorito.titulo ||
      "livro"
    } dos favoritos`
  );

  botaoRemover.addEventListener(
    "click",
    () => {
      removerFavorito(
        favorito,
        cartao,
        botaoRemover
      );
    }
  );

  areaBotoes.append(
    botaoAbrir,
    botaoRemover
  );

  conteudo.append(
    titulo,
    autor,
    areaBotoes
  );

  cartao.append(
    imagem,
    conteudo
  );

  return cartao;
}


// ========================================
// FAVORITOS DO FIREBASE
// ========================================

async function carregarFavoritos(
  usuarioId
) {
  if (!usuarioId) {
    return;
  }

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

    if (!listaFavoritos) {
      return;
    }

    listaFavoritos.innerHTML = "";

    if (resultadoFavoritos.empty) {
      mostrarMensagemFavoritosVazios();
      return;
    }

    const favoritos = [];

    resultadoFavoritos.forEach(
      (documentoFavorito) => {
        favoritos.push({
          id: documentoFavorito.id,
          ...documentoFavorito.data()
        });
      }
    );

    favoritos.sort((a, b) => {
      const dataA =
        a.criadoEm?.seconds || 0;

      const dataB =
        b.criadoEm?.seconds || 0;

      return dataB - dataA;
    });

    favoritos.forEach((favorito) => {
      listaFavoritos.appendChild(
        criarCartaoFavorito(favorito)
      );
    });

  } catch (erro) {
    console.error(
      "Erro ao carregar favoritos:",
      erro
    );

    if (totalFavoritos) {
      totalFavoritos.textContent =
        "0";
    }

    if (listaFavoritos) {
      listaFavoritos.innerHTML = "";

      const mensagem =
        document.createElement("div");

      mensagem.className =
        "cartao-vazio";

      mensagem.textContent =
        "Não foi possível carregar seus favoritos.";

      listaFavoritos.appendChild(
        mensagem
      );
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
      botaoSair.disabled =
        true;

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

        botaoSair.disabled =
          false;

        botaoSair.textContent =
          "Sair";

        alert(
          "Não foi possível sair da conta."
        );
      }
    }
  );
}