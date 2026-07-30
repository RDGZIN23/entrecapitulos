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

const totalConcluidos =
  document.getElementById("totalConcluidos");

const listaFavoritos =
  document.getElementById("listaFavoritos");

const areaContinueLendo =
  document.getElementById("areaContinueLendo");

const nivelLeitor =
  document.getElementById("nivelLeitor");

const barraNivel =
  document.getElementById("barraNivel");

const textoNivel =
  document.getElementById("textoNivel");

const conquistaPrimeiroCapitulo =
  document.getElementById(
    "conquistaPrimeiroCapitulo"
  );

const conquistaPrimeiroFavorito =
  document.getElementById(
    "conquistaPrimeiroFavorito"
  );

const conquistaLeitorDedicado =
  document.getElementById(
    "conquistaLeitorDedicado"
  );


// ========================================
// CONFIGURAÇÕES
// ========================================

const capaPadrao =
  "images/depois-de-te-odiar.png";

let quantidadeFavoritosAtual = 0;


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


function lerValorLocal(
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


function lerListaLocal(chave) {
  const valor =
    lerValorLocal(chave, []);

  return transformarEmLista(valor);
}


function obterIdLivro(item) {
  if (typeof item === "string") {
    return item;
  }

  return (
    item?.livroId ||
    item?.idLivro ||
    item?.id ||
    null
  );
}


function removerDuplicados(lista) {
  return [
    ...new Set(
      lista.filter(Boolean)
    )
  ];
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
// CONQUISTAS
// ========================================

function atualizarConquista(
  elemento,
  desbloqueada
) {
  if (!elemento) {
    return;
  }

  const estado =
    elemento.querySelector(
      ".estado-conquista"
    );

  if (desbloqueada) {
    elemento.classList.add(
      "desbloqueada"
    );

    if (estado) {
      estado.textContent =
        "Desbloqueada";
    }

  } else {
    elemento.classList.remove(
      "desbloqueada"
    );

    if (estado) {
      estado.textContent =
        "Bloqueada";
    }
  }
}


function atualizarConquistas(
  capitulosLidos,
  favoritos
) {
  atualizarConquista(
    conquistaPrimeiroCapitulo,
    capitulosLidos >= 1
  );

  atualizarConquista(
    conquistaPrimeiroFavorito,
    favoritos >= 1
  );

  atualizarConquista(
    conquistaLeitorDedicado,
    capitulosLidos >= 10
  );
}


// ========================================
// NÍVEL DO LEITOR
// ========================================

function atualizarNivelLeitor(
  quantidadeCapitulos
) {
  let nivel =
    "Iniciante";

  let progresso =
    Math.min(
      20,
      quantidadeCapitulos * 4
    );

  let mensagem =
    `${quantidadeCapitulos} capítulos lidos até agora.`;

  if (quantidadeCapitulos >= 5) {
    nivel =
      "Leitor";

    progresso =
      35;
  }

  if (quantidadeCapitulos >= 15) {
    nivel =
      "Apaixonado por livros";

    progresso =
      60;
  }

  if (quantidadeCapitulos >= 30) {
    nivel =
      "Veterano";

    progresso =
      85;
  }

  if (quantidadeCapitulos >= 50) {
    nivel =
      "Lenda do Entre Capítulos";

    progresso =
      100;

    mensagem =
      "Você alcançou o nível máximo de leitura!";
  }

  if (nivelLeitor) {
    nivelLeitor.textContent =
      nivel;
  }

  if (barraNivel) {
    barraNivel.style.width =
      `${progresso}%`;
  }

  if (textoNivel) {
    textoNivel.textContent =
      mensagem;
  }
}


// ========================================
// LIVROS CONCLUÍDOS
// ========================================

function calcularLivrosConcluidos(
  capitulosLidos,
  livrosIniciados
) {
  const livrosMarcados =
    lerListaLocal("livrosConcluidos");

  if (livrosMarcados.length > 0) {
    return removerDuplicados(
      livrosMarcados.map(
        obterIdLivro
      )
    ).length;
  }

  const progresso =
    lerValorLocal(
      "ultimoCapituloLido",
      null
    );

  if (
    progresso &&
    Number(progresso.porcentagem) >= 100
  ) {
    return 1;
  }

  if (
    capitulosLidos.length > 0 &&
    livrosIniciados.length === 1
  ) {
    return 0;
  }

  return 0;
}


// ========================================
// ESTATÍSTICAS LOCAIS
// ========================================

function carregarEstatisticasLocais() {
  const capitulosLidos =
    removerDuplicados(
      lerListaLocal(
        "capitulosLidos"
      ).map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return (
          item?.capituloId ||
          item?.id ||
          null
        );
      })
    );

  const livrosIniciados =
    removerDuplicados(
      lerListaLocal(
        "livrosIniciados"
      ).map(obterIdLivro)
    );

  const livrosConcluidos =
    calcularLivrosConcluidos(
      capitulosLidos,
      livrosIniciados
    );

  if (totalCapitulos) {
    totalCapitulos.textContent =
      String(capitulosLidos.length);
  }

  if (totalLivros) {
    totalLivros.textContent =
      String(livrosIniciados.length);
  }

  if (totalConcluidos) {
    totalConcluidos.textContent =
      String(livrosConcluidos);
  }

  atualizarNivelLeitor(
    capitulosLidos.length
  );

  atualizarConquistas(
    capitulosLidos.length,
    quantidadeFavoritosAtual
  );
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

    quantidadeFavoritosAtual =
      Math.max(
        0,
        quantidadeFavoritosAtual - 1
      );

    if (totalFavoritos) {
      totalFavoritos.textContent =
        String(
          quantidadeFavoritosAtual
        );
    }

    atualizarConquista(
      conquistaPrimeiroFavorito,
      quantidadeFavoritosAtual >= 1
    );

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
    },
    { once: true }
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
      : "biblioteca.html";

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

    quantidadeFavoritosAtual =
      resultadoFavoritos.size;

    if (totalFavoritos) {
      totalFavoritos.textContent =
        String(
          quantidadeFavoritosAtual
        );
    }

    atualizarConquista(
      conquistaPrimeiroFavorito,
      quantidadeFavoritosAtual >= 1
    );

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

    quantidadeFavoritosAtual = 0;

    if (totalFavoritos) {
      totalFavoritos.textContent =
        "0";
    }

    atualizarConquista(
      conquistaPrimeiroFavorito,
      false
    );

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

  const progresso =
    lerValorLocal(
      "ultimoCapituloLido",
      null
    );

  if (
    !progresso ||
    !progresso.capituloId
  ) {
    areaContinueLendo.textContent =
      "Você ainda não começou nenhuma leitura.";

    return;
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

    await carregarFavoritos(
      usuario.uid
    );

    carregarEstatisticasLocais();

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
// ATUALIZAR AO VOLTAR PARA A PÁGINA
// ========================================

window.addEventListener(
  "pageshow",
  () => {
    if (
      conteudoPerfil &&
      !conteudoPerfil.hidden
    ) {
      carregarEstatisticasLocais();
      carregarContinueLendo();
    }
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