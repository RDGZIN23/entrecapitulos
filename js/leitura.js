// ========================================
// IMPORTAÇÕES DO FIREBASE
// ========================================

import {
  auth,
  db
} from "./firebase-config.js";

import {
  onAuthStateChanged,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  arrayUnion,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const parametros =
  new URLSearchParams(
    window.location.search
  );

const capituloId =
  parametros.get("id");

const nomeLivro =
  document.getElementById(
    "nomeLivro"
  );

const numeroCapitulo =
  document.getElementById(
    "numeroCapitulo"
  );

const tituloCapitulo =
  document.getElementById(
    "tituloCapitulo"
  );

const textoCapitulo =
  document.getElementById(
    "textoCapitulo"
  );

const capituloAnterior =
  document.getElementById(
    "capituloAnterior"
  );

const proximoCapitulo =
  document.getElementById(
    "proximoCapitulo"
  );

let totalVisualizacoesAtual = 0;

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

  desativarBotao(
    capituloAnterior
  );

  desativarBotao(
    proximoCapitulo
  );
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

  /*
    Os capítulos antigos foram salvos
    como texto simples.

    Os novos capítulos criados pelo
    editor Quill são salvos como HTML.
  */

  const possuiHTML =
    /<\/?[a-z][\s\S]*>/i.test(
      textoLimpo
    );

  if (possuiHTML) {
    textoCapitulo.innerHTML =
      textoLimpo;

    return;
  }

  const paragrafos =
    textoLimpo.split(
      /\n\s*\n/
    );

  paragrafos.forEach(
    (paragrafo) => {
      const elemento =
        document.createElement("p");

      elemento.textContent =
        paragrafo
          .replace(/\n/g, " ")
          .trim();

      textoCapitulo.appendChild(
        elemento
      );
    }
  );
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
// OBTER USUÁRIO CONECTADO
// ========================================

function obterUsuarioAtual() {
  if (auth.currentUser) {
    return Promise.resolve(
      auth.currentUser
    );
  }

  return new Promise(
    (resolve) => {
      const cancelarObservacao =
        onAuthStateChanged(
          auth,
          (usuario) => {
            cancelarObservacao();

            resolve(
              usuario || null
            );
          },
          (erro) => {
            console.error(
              "Erro ao verificar login:",
              erro
            );

            cancelarObservacao();

            resolve(null);
          }
        );
    }
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
// SALVAR PROGRESSO LOCAL
// ========================================

function salvarProgressoLocal({
  livroId,
  livroTitulo,
  livroCapa,
  capituloId,
  capituloNumero,
  capituloTitulo
}) {
  const agora =
    new Date().toISOString();

  const progresso = {
    livroId,

    livroTitulo:
      livroTitulo || "Livro",

    capa:
      livroCapa || "",

    capituloId,

    numero:
      capituloNumero || 0,

    capituloTitulo:
      capituloTitulo ||
      "Capítulo",

    atualizadoEm:
      agora
  };

  localStorage.setItem(
    "ultimoCapituloLido",
    JSON.stringify(progresso)
  );


  // Registrar capítulo lido

  const capitulosLidos =
    lerListaLocal(
      "capitulosLidos"
    );

  const posicaoCapitulo =
    capitulosLidos.findIndex(
      (item) => {
        if (
          typeof item === "string"
        ) {
          return item === capituloId;
        }

        return (
          item?.capituloId ===
          capituloId
        );
      }
    );

  const dadosCapitulo = {
    capituloId,
    livroId,

    livroTitulo:
      livroTitulo || "Livro",

    numero:
      capituloNumero || 0,

    titulo:
      capituloTitulo ||
      "Capítulo",

    lidoEm:
      agora
  };

  if (posicaoCapitulo >= 0) {
    capitulosLidos[
      posicaoCapitulo
    ] = dadosCapitulo;

  } else {
    capitulosLidos.push(
      dadosCapitulo
    );
  }

  localStorage.setItem(
    "capitulosLidos",
    JSON.stringify(
      capitulosLidos
    )
  );


  // Registrar livro iniciado

  const livrosIniciados =
    lerListaLocal(
      "livrosIniciados"
    );

  const posicaoLivro =
    livrosIniciados.findIndex(
      (item) => {
        if (
          typeof item === "string"
        ) {
          return item === livroId;
        }

        return (
          item?.livroId === livroId
        );
      }
    );

  const dadosLivro = {
    livroId,

    titulo:
      livroTitulo || "Livro",

    capa:
      livroCapa || "",

    atualizadoEm:
      agora
  };

  if (posicaoLivro >= 0) {
    livrosIniciados[
      posicaoLivro
    ] = {
      ...livrosIniciados[
        posicaoLivro
      ],

      ...dadosLivro
    };

  } else {
    livrosIniciados.push({
      ...dadosLivro,
      iniciadoEm: agora
    });
  }

  localStorage.setItem(
    "livrosIniciados",
    JSON.stringify(
      livrosIniciados
    )
  );
}


// ========================================
// SALVAR PROGRESSO NO FIREBASE
// ========================================

async function salvarProgressoFirebase({
  usuarioId,
  livroId,
  livroTitulo,
  livroCapa,
  capituloId,
  capituloNumero,
  capituloTitulo
}) {
  if (
    !usuarioId ||
    !livroId ||
    !capituloId
  ) {
    return;
  }

  /*
    Um documento para cada combinação
    de usuário e livro.
  */

  const progressoId =
    `${usuarioId}_${livroId}`;

  const referenciaProgresso =
    doc(
      db,
      "progressoLeitura",
      progressoId
    );

  await setDoc(
    referenciaProgresso,
    {
      usuarioId,
      livroId,

      livroTitulo:
        livroTitulo || "Livro",

      capa:
        livroCapa || "",

      ultimoCapituloId:
        capituloId,

      ultimoCapituloNumero:
        capituloNumero || 0,

      ultimoCapituloTitulo:
        capituloTitulo ||
        "Capítulo",

      capitulosLidos:
        arrayUnion(
          capituloId
        ),

      atualizadoEm:
        serverTimestamp()
    },
    {
      merge: true
    }
  );
}


// ========================================
// SALVAR PROGRESSO COMPLETO
// ========================================

async function salvarProgressoLeitura(
  dados
) {
  try {
    if (
      !dados.livroId ||
      !dados.capituloId
    ) {
      return;
    }

    /*
      O progresso local é salvo para todos,
      inclusive leitores sem conta.
    */

    salvarProgressoLocal(
      dados
    );

    /*
      Se o leitor estiver conectado,
      também salvamos no Firestore.
    */

    const usuario =
      await obterUsuarioAtual();

    if (usuario) {
      await salvarProgressoFirebase({
        ...dados,
        usuarioId:
          usuario.uid
      });

      console.log(
        "Progresso sincronizado com o Firebase."
      );

    } else {
      console.log(
        "Progresso salvo apenas neste aparelho."
      );
    }

  } catch (erro) {
    /*
      Uma falha na sincronização não deve
      impedir o leitor de abrir o capítulo.
    */

    console.error(
      "Erro ao salvar progresso:",
      erro
    );
  }
}


// ========================================
// GARANTIR IDENTIFICAÇÃO DO VISITANTE
// ========================================

async function garantirUsuarioVisualizacao() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  try {
    const resultado =
      await signInAnonymously(auth);

    return resultado.user;

  } catch (erro) {
    console.error(
      "Erro ao identificar visitante:",
      erro
    );

    return null;
  }
}


// ========================================
// MOSTRAR TOTAL DE VISUALIZAÇÕES
// ========================================

function mostrarTotalVisualizacoes(
  quantidade
) {
  totalVisualizacoesAtual =
    Math.max(
      0,
      Number(quantidade) || 0
    );

  let elemento =
    document.getElementById(
      "visualizacoesCapitulo"
    );

  if (!elemento) {
    elemento =
      document.createElement(
        "p"
      );

    elemento.id =
      "visualizacoesCapitulo";

    elemento.className =
      "visualizacoes-capitulo";

    const cabecalho =
      document.querySelector(
        ".cabecalho-leitura"
      );

    const linha =
      cabecalho?.querySelector(
        ".linha-leitura"
      );

    if (cabecalho && linha) {
      cabecalho.insertBefore(
        elemento,
        linha
      );
    }
  }

  if (!elemento) {
    return;
  }

  elemento.textContent =
    totalVisualizacoesAtual === 1
      ? "👁️ 1 visualização"
      : `👁️ ${totalVisualizacoesAtual} visualizações`;
}


// ========================================
// BUSCAR TOTAL DE VISUALIZAÇÕES
// ========================================

async function carregarTotalVisualizacoes() {
  if (!capituloId) {
    mostrarTotalVisualizacoes(0);
    return;
  }

  try {
    const consultaVisualizacoes =
      query(
        collection(
          db,
          "visualizacoesCapitulos"
        ),
        where(
          "capituloId",
          "==",
          capituloId
        )
      );

    const resultado =
      await getCountFromServer(
        consultaVisualizacoes
      );

    mostrarTotalVisualizacoes(
      resultado.data().count
    );

  } catch (erro) {
    console.error(
      "Erro ao contar visualizações:",
      erro
    );

    mostrarTotalVisualizacoes(0);
  }
}


// ========================================
// REGISTRAR VISUALIZAÇÃO ÚNICA
// ========================================

async function registrarVisualizacao({
  livroId,
  capituloNumero,
  capituloTitulo
}) {
  if (!capituloId) {
    return;
  }

  try {
    const usuario =
      await garantirUsuarioVisualizacao();

    if (!usuario) {
      await carregarTotalVisualizacoes();
      return;
    }

    /*
      O ID combina capítulo e usuário.
      Assim, cada conta ou visitante
      anônimo gera somente uma visualização.
    */

    const visualizacaoId =
      `${capituloId}_${usuario.uid}`;

    const referenciaVisualizacao =
      doc(
        db,
        "visualizacoesCapitulos",
        visualizacaoId
      );

    const visualizacaoExistente =
      await getDoc(
        referenciaVisualizacao
      );

    if (!visualizacaoExistente.exists()) {
      await setDoc(
        referenciaVisualizacao,
        {
          usuarioId:
            usuario.uid,

          usuarioAnonimo:
            usuario.isAnonymous === true,

          livroId:
            livroId || "",

          capituloId,

          capituloNumero:
            Number(
              capituloNumero
            ) || 0,

          capituloTitulo:
            capituloTitulo ||
            "Capítulo",

          criadoEm:
            serverTimestamp()
        }
      );
    }

    await carregarTotalVisualizacoes();

  } catch (erro) {
    console.error(
      "Erro ao registrar visualização:",
      erro
    );

    await carregarTotalVisualizacoes();
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
      collection(
        db,
        "capitulos"
      ),

      where(
        "livroId",
        "==",
        livroId
      ),

      where(
        "status",
        "==",
        "publicado"
      )
    );

    const resultado =
      await getDocs(
        consulta
      );

    const capitulos = [];

    resultado.forEach(
      (documento) => {
        capitulos.push({
          id: documento.id,
          ...documento.data()
        });
      }
    );

    capitulos.sort(
      (a, b) => {
        const numeroA =
          Number(a.numero) || 0;

        const numeroB =
          Number(b.numero) || 0;

        return (
          numeroA - numeroB
        );
      }
    );

    const posicaoAtual =
      capitulos.findIndex(
        (capitulo) =>
          capitulo.id ===
          idAtual
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
      capitulos[
        posicaoAtual - 1
      ];

    const proximo =
      capitulos[
        posicaoAtual + 1
      ];

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
// CARREGAR DADOS DO LIVRO
// ========================================

async function carregarDadosLivro(
  livroId,
  tituloSalvo
) {
  const dadosPadrao = {
    titulo:
      tituloSalvo || "Livro",

    capa: ""
  };

  if (
    tituloSalvo &&
    nomeLivro
  ) {
    nomeLivro.textContent =
      tituloSalvo;
  }

  if (!livroId) {
    return dadosPadrao;
  }

  try {
    const referenciaLivro =
      doc(
        db,
        "livros",
        livroId
      );

    const resultadoLivro =
      await getDoc(
        referenciaLivro
      );

    if (!resultadoLivro.exists()) {
      return dadosPadrao;
    }

    const livro =
      resultadoLivro.data();

    const dadosLivro = {
      titulo:
        livro.titulo ||
        tituloSalvo ||
        "Livro",

      capa:
        livro.capa || ""
    };

    if (nomeLivro) {
      nomeLivro.textContent =
        dadosLivro.titulo;
    }

    return dadosLivro;

  } catch (erro) {
    console.error(
      "Erro ao carregar dados do livro:",
      erro
    );

    return dadosPadrao;
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
      capitulo.status !==
        "publicado"
    ) {
      mostrarErro(
        "Este capítulo ainda não foi publicado."
      );

      return;
    }

    const numero =
      Number(
        capitulo.numero
      ) || 0;

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

    const dadosLivro =
      await carregarDadosLivro(
        capitulo.livroId,
        capitulo.livroTitulo
      );

    /*
      O progresso é salvo após carregar
      o título e a capa verdadeiros.
    */

    await salvarProgressoLeitura({
      livroId:
        capitulo.livroId,

      livroTitulo:
        dadosLivro.titulo,

      livroCapa:
        dadosLivro.capa,

      capituloId,

      capituloNumero:
        numero,

      capituloTitulo:
        titulo
    });

await registrarVisualizacao({
  livroId:
    capitulo.livroId,

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