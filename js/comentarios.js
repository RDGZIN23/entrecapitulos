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

let usuarioAtual = null;


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
// FORMATAR DATA
// ========================================

function formatarData(data) {
  if (!data) {
    return "Agora";
  }

  try {
    const dataConvertida =
      typeof data.toDate === "function"
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
    return "Data não disponível";
  }
}


// ========================================
// OBTER MILISSEGUNDOS
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

  const convertida =
    new Date(data);

  return Number.isNaN(
    convertida.getTime()
  )
    ? 0
    : convertida.getTime();
}


// ========================================
// OBTER INICIAIS
// ========================================

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
    partes[0][0] +
    partes[
      partes.length - 1
    ][0]
  ).toUpperCase();
}


// ========================================
// OBTER NOME DO USUÁRIO
// ========================================

async function obterNomeUsuario(
  usuario
) {
  if (!usuario) {
    return "Leitor";
  }

  if (usuario.displayName) {
    return usuario.displayName;
  }

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

    if (resultadoUsuario.exists()) {
      const dados =
        resultadoUsuario.data();

      return (
        dados.nome ||
        dados.nomeCompleto ||
        dados.usuario ||
        usuario.email
          ?.split("@")[0] ||
        "Leitor"
      );
    }

  } catch (erro) {
    console.error(
      "Erro ao carregar nome do usuário:",
      erro
    );
  }

  return (
    usuario.email
      ?.split("@")[0] ||
    "Leitor"
  );
}


// ========================================
// ATUALIZAR QUANTIDADE
// ========================================

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


// ========================================
// MOSTRAR LISTA VAZIA
// ========================================

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


// ========================================
// MOSTRAR MENSAGEM DO FORMULÁRIO
// ========================================

function mostrarMensagemFormulario(
  texto,
  tipo = ""
) {
  const elemento =
    document.getElementById(
      "mensagemComentario"
    );

  if (!elemento) {
    return;
  }

  elemento.textContent =
    texto;

  elemento.className =
    `mensagem-comentario ${tipo}`;
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

  if (!formulario || !campo) {
    return;
  }

  campo.addEventListener(
    "input",
    () => {
      if (contador) {
        contador.textContent =
          `${campo.value.length}/${LIMITE_COMENTARIO}`;
      }
    }
  );

  formulario.addEventListener(
    "submit",
    async (evento) => {
      evento.preventDefault();

      const comentario =
        campo.value.trim();

      const botaoPublicar =
        document.getElementById(
          "botaoPublicarComentario"
        );

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
        const nomeUsuario =
          await obterNomeUsuario(
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

            nomeUsuario,

            capituloId,

            comentario,

            criadoEm:
              serverTimestamp(),

            atualizadoEm:
              serverTimestamp()
          }
        );

        campo.value = "";

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
          "Não foi possível publicar o comentário. Verifique as regras do Firebase.",
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
  textoElemento,
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

  botaoEditar.disabled = true;
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

    textoElemento.textContent =
      textoLimpo;

    botaoEditar.textContent =
      "Editar";

  } catch (erro) {
    console.error(
      "Erro ao editar comentário:",
      erro
    );

    window.alert(
      "Não foi possível editar o comentário."
    );

    botaoEditar.textContent =
      "Editar";

  } finally {
    botaoEditar.disabled =
      false;
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

  const cabecalho =
    document.createElement(
      "div"
    );

  cabecalho.className =
    "cabecalho-cartao-comentario";

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

  avatar.textContent =
    obterIniciais(
      comentario.nomeUsuario ||
      "Leitor"
    );

  const informacoes =
    document.createElement(
      "div"
    );

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

  const texto =
  document.createElement("p");

texto.className =
  "texto-comentario";

texto.textContent =
  comentario.comentario ||
  "";
  
  const podeExcluir =
    usuarioAtual &&
    (
