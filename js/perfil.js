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
let progressosFirebase = [];
let ultimoProgressoAtual = null;
let quantidadeCapitulosAtual = 0;
let quantidadeLivrosAtual = 0;
let quantidadeConcluidosAtual = 0;

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
// PROGRESSO LOCAL COMO ALTERNATIVA
// ========================================

function obterProgressoLocal() {
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

  const ultimoProgresso =
    lerValorLocal(
      "ultimoCapituloLido",
      null
    );

  return {
    capitulosLidos,
    livrosIniciados,
    ultimoProgresso
  };
}


// ========================================
// CONVERTER DATA DO FIREBASE
// ========================================

function obterTempoFirebase(data) {
  if (!data) {
    return 0;
  }

  if (
    typeof data.toMillis ===
    "function"
  ) {
    return data.toMillis();
  }

  if (data.seconds) {
    return data.seconds * 1000;
  }

  const convertida =
    new Date(data);

  return Number.isNaN(
    convertida.getTime()
  )
    ? 0
    : convertida.getTime();
}


// ========================================
// ATUALIZAR ESTATÍSTICAS VISUAIS
// ========================================

function atualizarEstatisticasPerfil({
  capitulos,
  livros,
  concluidos
}) {
  quantidadeCapitulosAtual =
    Math.max(
      0,
      Number(capitulos) || 0
    );

  quantidadeLivrosAtual =
    Math.max(
      0,
      Number(livros) || 0
    );

  quantidadeConcluidosAtual =
    Math.max(
      0,
      Number(concluidos) || 0
    );

  if (totalCapitulos) {
    totalCapitulos.textContent =
      String(
        quantidadeCapitulosAtual
      );
  }

  if (totalLivros) {
    totalLivros.textContent =
      String(
        quantidadeLivrosAtual
      );
  }

  if (totalConcluidos) {
    totalConcluidos.textContent =
      String(
        quantidadeConcluidosAtual
      );
  }

  atualizarNivelLeitor(
    quantidadeCapitulosAtual
  );

  atualizarConquistas(
    quantidadeCapitulosAtual,
    quantidadeFavoritosAtual
  );
}


// ========================================
// VERIFICAR LIVRO CONCLUÍDO
// ========================================

async function verificarLivroConcluido(
  progresso
) {
  if (!progresso?.livroId) {
    return false;
  }

  try {
    const consultaCapitulos =
      query(
        collection(
          db,
          "capitulos"
        ),
        where(
          "livroId",
          "==",
          progresso.livroId
        ),
        where(
          "status",
          "==",
          "publicado"
        )
      );

    const resultadoCapitulos =
      await getDocs(
        consultaCapitulos
      );

    const idsPublicados =
      resultadoCapitulos.docs.map(
        (documento) =>
          documento.id
      );

    if (idsPublicados.length === 0) {
      return false;
    }

    const capitulosLidos =
      Array.isArray(
        progresso.capitulosLidos
      )
        ? progresso.capitulosLidos
        : [];

    return idsPublicados.every(
      (id) =>
        capitulosLidos.includes(id)
    );

  } catch (erro) {
    console.error(
      "Erro ao verificar livro concluído:",
      erro
    );

    return false;
  }
}


// ========================================
// SALVAR CÓPIA LOCAL DO FIREBASE
// ========================================

function atualizarProgressoLocal(
  progresso
) {
  if (
    !progresso ||
    !progresso.ultimoCapituloId
  ) {
    return;
  }

  const dadosLocais = {
    livroId:
      progresso.livroId,

    livroTitulo:
      progresso.livroTitulo ||
      "Livro",

    capa:
      progresso.capa || "",

    capituloId:
      progresso.ultimoCapituloId,

    numero:
      progresso.ultimoCapituloNumero ||
      0,

    capituloTitulo:
      progresso.ultimoCapituloTitulo ||
      "Capítulo",

    atualizadoEm:
      new Date(
        obterTempoFirebase(
          progresso.atualizadoEm
        ) || Date.now()
      ).toISOString()
  };

  localStorage.setItem(
    "ultimoCapituloLido",
    JSON.stringify(dadosLocais)
  );
}


// ========================================
// CARREGAR PROGRESSO DO FIREBASE
// ========================================

async function carregarProgressoFirebase(
  usuarioId
) {
  if (!usuarioId) {
    return false;
  }

  try {
    const consultaProgresso =
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
        consultaProgresso
      );

    if (resultado.empty) {
      progressosFirebase = [];
      ultimoProgressoAtual = null;

      return false;
    }

    progressosFirebase =
      resultado.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data()
        })
      );

    progressosFirebase.sort(
      (a, b) =>
        obterTempoFirebase(
          b.atualizadoEm
        ) -
        obterTempoFirebase(
          a.atualizadoEm
        )
    );

    ultimoProgressoAtual =
      progressosFirebase[0] ||
      null;

    if (ultimoProgressoAtual) {
      atualizarProgressoLocal(
        ultimoProgressoAtual
      );
    }

    const idsCapitulosLidos =
      removerDuplicados(
        progressosFirebase.flatMap(
          (progresso) =>
            Array.isArray(
              progresso.capitulosLidos
            )
              ? progresso.capitulosLidos
              : []
        )
      );

    const resultadosConcluidos =
      await Promise.all(
        progressosFirebase.map(
          verificarLivroConcluido
        )
      );

    const livrosConcluidos =
      resultadosConcluidos.filter(
        Boolean
      ).length;

    atualizarEstatisticasPerfil({
      capitulos:
        idsCapitulosLidos.length,

      livros:
        progressosFirebase.length,

      concluidos:
        livrosConcluidos
    });

    return true;

  } catch (erro) {
    console.error(
      "Erro ao carregar progresso do Firebase:",
      erro
    );

    return false;
  }
}


// ========================================
// CARREGAR ESTATÍSTICAS LOCAIS
// ========================================

function carregarEstatisticasLocais() {
  const local =
    obterProgressoLocal();

  atualizarEstatisticasPerfil({
    capitulos:
      local.capitulosLidos.length,

    livros:
      local.livrosIniciados.length,

    concluidos: 0
  });

  ultimoProgressoAtual =
    local.ultimoProgresso;
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

function carregarContinueLendo(
  progressoRecebido = null
) {
  if (!areaContinueLendo) {
    return;
  }

  const progressoFirebase =
    progressoRecebido ||
    ultimoProgressoAtual;

  const progressoLocal =
    lerValorLocal(
      "ultimoCapituloLido",
      null
    );

  const progresso =
    progressoFirebase ||
    progressoLocal;

  const capituloIdAtual =
    progresso?.ultimoCapituloId ||
    progresso?.capituloId;

  if (
    !progresso ||
    !capituloIdAtual
  ) {
    areaContinueLendo.innerHTML = `
      <div class="cartao-vazio">
        Você ainda não começou nenhuma leitura.
      </div>
    `;

    return;
  }

  const livroTitulo =
    progresso.livroTitulo ||
    "Livro";

  const numeroAtual =
    progresso.ultimoCapituloNumero ??
    progresso.numero ??
    0;

  const tituloAtual =
    progresso.ultimoCapituloTitulo ||
    progresso.capituloTitulo ||
    "Capítulo";

  const capaAtual =
    progresso.capa ||
    capaPadrao;

  areaContinueLendo.innerHTML = "";

  const cartao =
    document.createElement(
      "article"
    );

  cartao.className =
    "cartao-continuar-perfil";

  const imagem =
    document.createElement(
      "img"
    );

  imagem.src =
    capaAtual;

  imagem.alt =
    `Capa de ${livroTitulo}`;

  imagem.className =
    "capa-continuar-perfil";

  imagem.addEventListener(
    "error",
    () => {
      imagem.src =
        capaPadrao;
    },
    { once: true }
  );

  const conteudo =
    document.createElement(
      "div"
    );

  conteudo.className =
    "conteudo-continuar-perfil";

  const tituloLivro =
    document.createElement("h3");

  tituloLivro.textContent =
    livroTitulo;

  const capitulo =
    document.createElement("p");

  capitulo.textContent =
    `${
      numeroAtual
        ? `Capítulo ${numeroAtual}`
        : "Capítulo"
    } • ${tituloAtual}`;

  const botao =
    document.createElement("a");

  botao.href =
    `leitura.html?id=${capituloIdAtual}`;

  botao.className =
    "acao-perfil";

  botao.textContent =
    "📖 Continuar leitura";

  conteudo.append(
    tituloLivro,
    capitulo,
    botao
  );

  cartao.append(
    imagem,
    conteudo
  );

  areaContinueLendo.appendChild(
    cartao
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

const progressoFirebaseCarregado =
  await carregarProgressoFirebase(
    usuario.uid
  );

if (!progressoFirebaseCarregado) {
  carregarEstatisticasLocais();
}

carregarContinueLendo(
  ultimoProgressoAtual
);

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
  async () => {

    if (
      !conteudoPerfil ||
      conteudoPerfil.hidden
    ) {
      return;
    }

    const usuario =
      auth.currentUser;

    if (!usuario) {
      carregarEstatisticasLocais();
      carregarContinueLendo();

      return;
    }

    const carregouFirebase =
      await carregarProgressoFirebase(
        usuario.uid
      );

    if (!carregouFirebase) {
      carregarEstatisticasLocais();
    }

    carregarContinueLendo(
      ultimoProgressoAtual
    );
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
