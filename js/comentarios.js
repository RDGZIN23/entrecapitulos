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
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// CONFIGURAÇÕES
// ========================================

const ADMIN_UID =
  "VPjjYv2NOdXMTTTxynB1MHTrfx23";

const LIMITE_COMENTARIO =
  1000;

const parametros =
  new URLSearchParams(
    window.location.search
  );

const capituloId =
  parametros.get("id");

let usuarioAtual =
  null;

const cachePerfis =
  new Map();


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const areaFormularioComentario =
  document.getElementById(
    "areaFormularioComentario"
  );

const listaComentarios =
  document.getElementById(
    "listaComentarios"
  );

const quantidadeComentarios =
  document.getElementById(
    "quantidadeComentarios"
  );


// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function obterMilissegundos(data) {
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

  const dataConvertida =
    new Date(data);

  return Number.isNaN(
    dataConvertida.getTime()
  )
    ? 0
    : dataConvertida.getTime();
}


function formatarData(data) {
  if (!data) {
    return "Agora";
  }

  try {
    const dataConvertida =
      typeof data.toDate ===
      "function"
        ? data.toDate()
        : new Date(data);

    return dataConvertida
      .toLocaleDateString(
        "pt-BR",
        {
          day: "2-digit",
          month: "long",
          year: "numeric"
        }
      );

  } catch (erro) {
    console.error(
      "Erro ao formatar data:",
      erro
    );

    return "Data não disponível";
  }
}


function obterIniciais(
  nome = "Leitor"
) {
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
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    partes[0].charAt(0) +
    partes[
      partes.length - 1
    ].charAt(0)
  ).toUpperCase();
}


function atualizarQuantidade(
  total
) {
  if (!quantidadeComentarios) {
    return;
  }

  quantidadeComentarios.textContent =
    total === 1
      ? "1 comentário"
      : `${total} comentários`;
}


function mostrarListaVazia() {
  if (!listaComentarios) {
    return;
  }

  listaComentarios.innerHTML = `
    <div class="sem-comentarios">
      Ainda não há comentários neste capítulo.
      Seja a primeira pessoa a comentar.
    </div>
  `;

  atualizarQuantidade(0);
}


function mostrarMensagemFormulario(
  texto,
  tipo = ""
) {
  const mensagem =
    document.getElementById(
      "mensagemComentario"
    );

  if (!mensagem) {
    return;
  }

  mensagem.textContent =
    texto;

  mensagem.className =
    `mensagem-comentario ${tipo}`;
}


// ========================================
// OBTER DADOS DO USUÁRIO
// ========================================

async function obterDadosUsuario(
  usuarioOuId
) {
  const usuarioId =
    typeof usuarioOuId === "string"
      ? usuarioOuId
      : usuarioOuId?.uid;

  if (!usuarioId) {
    return {
      nomeUsuario: "Leitor",
      fotoUsuario: ""
    };
  }

  if (cachePerfis.has(usuarioId)) {
    return cachePerfis.get(
      usuarioId
    );
  }

  try {
    const referenciaUsuario =
      doc(
        db,
        "usuarios",
        usuarioId
      );

    const resultadoUsuario =
      await getDoc(
        referenciaUsuario
      );

    const usuarioAuth =
      typeof usuarioOuId === "object"
        ? usuarioOuId
        : null;

    const dados =
      resultadoUsuario.exists()
        ? resultadoUsuario.data()
        : {};

    const perfil = {
      nomeUsuario:
        dados.nome ||
        dados.nomeCompleto ||
        usuarioAuth?.displayName ||
        usuarioAuth?.email
          ?.split("@")[0] ||
        "Leitor",

      fotoUsuario:
        dados.fotoURL ||
        dados.foto ||
        usuarioAuth?.photoURL ||
        ""
    };

    cachePerfis.set(
      usuarioId,
      perfil
    );

    return perfil;

  } catch (erro) {
    console.error(
      "Erro ao carregar perfil do usuário:",
      erro
    );

    return {
      nomeUsuario:
        typeof usuarioOuId === "object"
          ? (
              usuarioOuId.displayName ||
              usuarioOuId.email
                ?.split("@")[0] ||
              "Leitor"
            )
          : "Leitor",

      fotoUsuario:
        typeof usuarioOuId === "object"
          ? usuarioOuId.photoURL || ""
          : ""
    };
  }
}


// ========================================
// MONTAR FORMULÁRIO
// ========================================

function montarFormularioComentario() {
  if (!areaFormularioComentario) {
    return;
  }

  if (!capituloId) {
    areaFormularioComentario.innerHTML = `
      <div class="aviso-login-comentario">
        Não foi possível identificar este capítulo.
      </div>
    `;

    return;
  }

  if (!usuarioAtual) {
    areaFormularioComentario.innerHTML = `
      <div class="aviso-login-comentario">
        Para publicar um comentário,
        <a href="entrar.html">
          entre na sua conta
        </a>.
      </div>
    `;

    return;
  }

  areaFormularioComentario.innerHTML = `
    <form
      class="formulario-comentario"
      id="formularioComentario"
    >

      <textarea
        class="campo-comentario"
        id="campoComentario"
        maxlength="${LIMITE_COMENTARIO}"
        placeholder="Escreva o que você achou deste capítulo..."
        required
      ></textarea>

      <div class="rodape-formulario-comentario">

        <span
          class="contador-comentario"
          id="contadorComentario"
        >
          0/${LIMITE_COMENTARIO}
        </span>

        <button
          type="submit"
          class="botao-publicar-comentario"
          id="botaoPublicarComentario"
        >
          Publicar comentário
        </button>

      </div>

      <p
        class="mensagem-comentario"
        id="mensagemComentario"
      ></p>

    </form>
  `;

  configurarFormularioComentario();
}


// ========================================
// CONFIGURAR FORMULÁRIO
// ========================================

function configurarFormularioComentario() {
  const formulario =
    document.getElementById(
      "formularioComentario"
    );

  const campo =
    document.getElementById(
      "campoComentario"
    );

  const contador =
    document.getElementById(
      "contadorComentario"
    );

  const botaoPublicar =
    document.getElementById(
      "botaoPublicarComentario"
    );

  if (
    !formulario ||
    !campo
  ) {
    return;
  }

  campo.addEventListener(
    "input",
    () => {
      if (contador) {
        contador.textContent =
          `${campo.value.length}/${LIMITE_COMENTARIO}`;
      }

      mostrarMensagemFormulario(
        ""
      );
    }
  );

  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();

      const comentario =
        campo.value.trim();

      if (!usuarioAtual) {
        mostrarMensagemFormulario(
          "Entre na sua conta para comentar.",
          "erro"
        );

        return;
      }

      if (!capituloId) {
        mostrarMensagemFormulario(
          "Não foi possível identificar o capítulo.",
          "erro"
        );

        return;
      }

      if (comentario.length < 2) {
        mostrarMensagemFormulario(
          "Escreva pelo menos 2 caracteres.",
          "erro"
        );

        return;
      }

      if (
        comentario.length >
        LIMITE_COMENTARIO
      ) {
        mostrarMensagemFormulario(
          `O comentário deve ter no máximo ${LIMITE_COMENTARIO} caracteres.`,
          "erro"
        );

        return;
      }

      if (botaoPublicar) {
        botaoPublicar.disabled =
          true;

        botaoPublicar.textContent =
          "Publicando...";
      }

      try {
        const dadosUsuario =
  await obterDadosUsuario(
    usuarioAtual
  );

        await addDoc(
          collection(
            db,
            "comentarios"
          ),
          {
            usuarioId:
              usuarioAtual.uid,

            nomeUsuario:
  dadosUsuario.nomeUsuario,

fotoUsuario:
  dadosUsuario.fotoUsuario,

            capituloId,

            comentario,

            criadoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp()
          }
        );

        formulario.reset();

        if (contador) {
          contador.textContent =
            `0/${LIMITE_COMENTARIO}`;
        }

        mostrarMensagemFormulario(
          "Comentário publicado com sucesso!",
          "sucesso"
        );

        await carregarComentarios();

      } catch (erro) {
        console.error(
          "Erro ao publicar comentário:",
          erro
        );

        mostrarMensagemFormulario(
          "Não foi possível publicar o comentário.",
          "erro"
        );

      } finally {
        if (botaoPublicar) {
          botaoPublicar.disabled =
            false;

          botaoPublicar.textContent =
            "Publicar comentário";
        }
      }
    }
  );
}


// ========================================
// EDITAR COMENTÁRIO
// ========================================

async function editarComentario(
  comentario,
  elementoTexto,
  elementoData,
  botaoEditar
) {
  if (
    !usuarioAtual ||
    usuarioAtual.uid !==
      comentario.usuarioId
  ) {
    return;
  }

  const novoTexto =
    window.prompt(
      "Edite seu comentário:",
      comentario.comentario || ""
    );

  if (novoTexto === null) {
    return;
  }

  const textoLimpo =
    novoTexto.trim();

  if (textoLimpo.length < 2) {
    window.alert(
      "O comentário precisa ter pelo menos 2 caracteres."
    );

    return;
  }

  if (
    textoLimpo.length >
    LIMITE_COMENTARIO
  ) {
    window.alert(
      `O comentário deve ter no máximo ${LIMITE_COMENTARIO} caracteres.`
    );

    return;
  }

  botaoEditar.disabled =
    true;

  botaoEditar.textContent =
    "Salvando...";

  try {
    await updateDoc(
      doc(
        db,
        "comentarios",
        comentario.id
      ),
      {
        comentario:
          textoLimpo,

        atualizadoEm:
          serverTimestamp()
      }
    );

    comentario.comentario =
      textoLimpo;

    elementoTexto.textContent =
      textoLimpo;

    if (elementoData) {
      elementoData.textContent =
        "Editado agora";
    }

  } catch (erro) {
    console.error(
      "Erro ao editar comentário:",
      erro
    );

    window.alert(
      "Não foi possível editar o comentário."
    );

  } finally {
    botaoEditar.disabled =
      false;

    botaoEditar.textContent =
      "Editar";
  }
}


// ========================================
// EXCLUIR COMENTÁRIO
// ========================================

async function excluirComentario(
  comentario,
  cartao,
  botaoExcluir
) {
  const podeExcluir =
    usuarioAtual &&
    (
      usuarioAtual.uid ===
        comentario.usuarioId ||
      usuarioAtual.uid ===
        ADMIN_UID
    );

  if (!podeExcluir) {
    return;
  }

  const confirmar =
    window.confirm(
      "Deseja excluir este comentário?"
    );

  if (!confirmar) {
    return;
  }

  botaoExcluir.disabled =
    true;

  botaoExcluir.textContent =
    "Excluindo...";

  try {
    await deleteDoc(
      doc(
        db,
        "comentarios",
        comentario.id
      )
    );

    cartao.remove();

    const totalRestante =
      listaComentarios
        ?.querySelectorAll(
          ".cartao-comentario"
        ).length || 0;

    atualizarQuantidade(
      totalRestante
    );

    if (totalRestante === 0) {
      mostrarListaVazia();
    }

  } catch (erro) {
    console.error(
      "Erro ao excluir comentário:",
      erro
    );

    botaoExcluir.disabled =
      false;

    botaoExcluir.textContent =
      "Excluir";

    window.alert(
      "Não foi possível excluir o comentário."
    );
  }
}


// ========================================
// CRIAR CARTÃO DO COMENTÁRIO
// ========================================

function criarCartaoComentario(
  comentario
) {
  const cartao =
    document.createElement(
      "article"
    );

  cartao.className =
    "cartao-comentario";


  // Cabeçalho principal

  const cabecalho =
    document.createElement(
      "div"
    );

  cabecalho.className =
    "cabecalho-cartao-comentario";


  // Dados do autor

  const dadosAutor =
    document.createElement(
      "div"
    );

  dadosAutor.className =
    "dados-autor-comentario";

  const avatar =
    document.createElement(
      "div"
    );

  avatar.className =
    "avatar-comentario";

const nomeDoAutor =
  comentario.nomeUsuario ||
  "Leitor";

const fotoDoAutor =
  comentario.fotoUsuario ||
  "";

if (fotoDoAutor) {
  avatar.textContent = "";

  avatar.style.backgroundImage =
    `url("${fotoDoAutor}")`;

  avatar.style.backgroundSize =
    "cover";

  avatar.style.backgroundPosition =
    "center";

  avatar.style.backgroundRepeat =
    "no-repeat";

  avatar.setAttribute(
    "aria-label",
    `Foto de ${nomeDoAutor}`
  );

} else {
  avatar.style.backgroundImage =
    "none";

  avatar.textContent =
    obterIniciais(
      nomeDoAutor
    );
}

  const informacoes =
    document.createElement(
      "div"
    );

  informacoes.className =
    "informacoes-autor-comentario";

  const nome =
    document.createElement(
      "strong"
    );

  nome.className =
    "nome-autor-comentario";

  nome.textContent =
    comentario.nomeUsuario ||
    "Leitor";

  const data =
    document.createElement(
      "span"
    );

  data.className =
    "data-comentario";

  data.textContent =
    formatarData(
      comentario.criadoEm
    );

  informacoes.append(
    nome,
    data
  );

  dadosAutor.append(
    avatar,
    informacoes
  );

  cabecalho.appendChild(
    dadosAutor
  );


  // Texto do comentário

  const texto =
    document.createElement(
      "p"
    );

  texto.className =
    "texto-comentario";

  texto.textContent =
    comentario.comentario ||
    "";


  // Área dos botões

  const areaAcoes =
    document.createElement(
      "div"
    );

  areaAcoes.className =
    "acoes-comentario";

  const eDono =
    usuarioAtual &&
    usuarioAtual.uid ===
      comentario.usuarioId;

  const eAdmin =
    usuarioAtual &&
    usuarioAtual.uid ===
      ADMIN_UID;


  // Botão Editar

  if (eDono) {
    const botaoEditar =
      document.createElement(
        "button"
      );

    botaoEditar.type =
      "button";

    botaoEditar.className =
      "botao-editar-comentario";

    botaoEditar.textContent =
      "Editar";

    botaoEditar.addEventListener(
      "click",
      () => {
        editarComentario(
          comentario,
          texto,
          data,
          botaoEditar
        );
      }
    );

    areaAcoes.appendChild(
      botaoEditar
    );
  }


  // Botão Excluir

  if (eDono || eAdmin) {
    const botaoExcluir =
      document.createElement(
        "button"
      );

    botaoExcluir.type =
      "button";

    botaoExcluir.className =
      "botao-excluir-comentario";

    botaoExcluir.textContent =
      "Excluir";

    botaoExcluir.addEventListener(
      "click",
      () => {
        excluirComentario(
          comentario,
          cartao,
          botaoExcluir
        );
      }
    );

    areaAcoes.appendChild(
      botaoExcluir
    );
  }

  if (
    areaAcoes.children.length > 0
  ) {
    cabecalho.appendChild(
      areaAcoes
    );
  }

  cartao.append(
    cabecalho,
    texto
  );

  return cartao;
}


// ========================================
// SINCRONIZAR PERFIL DO COMENTÁRIO
// ========================================

async function sincronizarPerfilComentario(
  comentario
) {
  if (!comentario.usuarioId) {
    return comentario;
  }

  const perfil =
    await obterDadosUsuario(
      comentario.usuarioId
    );

  return {
    ...comentario,

    nomeUsuario:
      perfil.nomeUsuario ||
      comentario.nomeUsuario ||
      "Leitor",

    fotoUsuario:
      perfil.fotoUsuario ||
      comentario.fotoUsuario ||
      ""
  };
}


// ========================================
// CARREGAR COMENTÁRIOS
// ========================================

async function carregarComentarios() {
  if (!listaComentarios) {
    return;
  }

  if (!capituloId) {
    listaComentarios.innerHTML = `
      <div class="sem-comentarios">
        Não foi possível identificar este capítulo.
      </div>
    `;

    atualizarQuantidade(0);

    return;
  }

  listaComentarios.innerHTML = `
    <div class="sem-comentarios">
      Carregando comentários...
    </div>
  `;

  try {
    const consultaComentarios =
      query(
        collection(
          db,
          "comentarios"
        ),
        where(
          "capituloId",
          "==",
          capituloId
        )
      );

    const resultado =
      await getDocs(
        consultaComentarios
      );

    if (resultado.empty) {
      mostrarListaVazia();

      return;
    }

const comentariosOriginais =
  resultado.docs.map(
    (documentoComentario) => ({
      id:
        documentoComentario.id,

      ...documentoComentario.data()
    })
  );

const comentarios =
  await Promise.all(
    comentariosOriginais.map(
      sincronizarPerfilComentario
    )
  );

    comentarios.sort(
      (a, b) =>
        obterMilissegundos(
          b.criadoEm
        ) -
        obterMilissegundos(
          a.criadoEm
        )
    );

    listaComentarios.innerHTML =
      "";

    comentarios.forEach(
      (comentario) => {
        listaComentarios.appendChild(
          criarCartaoComentario(
            comentario
          )
        );
      }
    );

    atualizarQuantidade(
      comentarios.length
    );

  } catch (erro) {
    console.error(
      "Erro ao carregar comentários:",
      erro
    );

    listaComentarios.innerHTML = `
      <div class="sem-comentarios">
        Não foi possível carregar os comentários.
      </div>
    `;

    atualizarQuantidade(0);
  }
}


// ========================================
// VERIFICAR LOGIN E INICIAR
// ========================================

onAuthStateChanged(
  auth,
  async (usuario) => {
    usuarioAtual =
      usuario || null;

    montarFormularioComentario();

    await carregarComentarios();
  }
);