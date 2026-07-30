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
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// CRIAR IDENTIFICAÇÃO DO FAVORITO
// ========================================

function criarFavoritoId(
  usuarioId,
  livroId
) {
  return `${usuarioId}_${livroId}`;
}


// ========================================
// VERIFICAR LOGIN
// ========================================

export function obterUsuarioAtual() {
  return new Promise((resolve) => {
    const cancelarObservacao =
      onAuthStateChanged(
        auth,
        (usuario) => {
          cancelarObservacao();
          resolve(usuario);
        }
      );
  });
}


// ========================================
// VERIFICAR SE O LIVRO É FAVORITO
// ========================================

export async function verificarFavorito(
  livroId
) {
  try {
    const usuario =
      await obterUsuarioAtual();

    if (!usuario || !livroId) {
      return false;
    }

    const favoritoId =
      criarFavoritoId(
        usuario.uid,
        livroId
      );

    const referenciaFavorito =
      doc(
        db,
        "favoritos",
        favoritoId
      );

    const resultado =
      await getDoc(
        referenciaFavorito
      );

    return resultado.exists();

  } catch (erro) {
    console.error(
      "Erro ao verificar favorito:",
      erro
    );

    return false;
  }
}


// ========================================
// ADICIONAR LIVRO AOS FAVORITOS
// ========================================

export async function adicionarFavorito({
  livroId,
  titulo,
  autor,
  capa
}) {
  const usuario =
    await obterUsuarioAtual();

  if (!usuario) {
    window.location.href =
      "entrar.html";

    return false;
  }

  if (!livroId) {
    throw new Error(
      "O livro não possui identificação."
    );
  }

  const favoritoId =
    criarFavoritoId(
      usuario.uid,
      livroId
    );

  const referenciaFavorito =
    doc(
      db,
      "favoritos",
      favoritoId
    );

  await setDoc(
    referenciaFavorito,
    {
      usuarioId:
        usuario.uid,

      livroId,

      titulo:
        titulo || "Livro",

      autor:
        autor || "Autor não informado",

      capa:
        capa || "",

      criadoEm:
        serverTimestamp()
    }
  );

  return true;
}


// ========================================
// REMOVER LIVRO DOS FAVORITOS
// ========================================

export async function removerFavorito(
  livroId
) {
  const usuario =
    await obterUsuarioAtual();

  if (!usuario) {
    window.location.href =
      "entrar.html";

    return false;
  }

  if (!livroId) {
    throw new Error(
      "O livro não possui identificação."
    );
  }

  const favoritoId =
    criarFavoritoId(
      usuario.uid,
      livroId
    );

  const referenciaFavorito =
    doc(
      db,
      "favoritos",
      favoritoId
    );

  await deleteDoc(
    referenciaFavorito
  );

  return true;
}


// ========================================
// ALTERNAR FAVORITO
// ========================================

export async function alternarFavorito({
  livroId,
  titulo,
  autor,
  capa
}) {
  const usuario =
    await obterUsuarioAtual();

  if (!usuario) {
    window.location.href =
      "entrar.html";

    return {
      favoritado: false,
      redirecionado: true
    };
  }

  const favoritoId =
    criarFavoritoId(
      usuario.uid,
      livroId
    );

  const referenciaFavorito =
    doc(
      db,
      "favoritos",
      favoritoId
    );

  const resultado =
    await getDoc(
      referenciaFavorito
    );

  if (resultado.exists()) {
    await deleteDoc(
      referenciaFavorito
    );

    return {
      favoritado: false,
      redirecionado: false
    };
  }

  await setDoc(
    referenciaFavorito,
    {
      usuarioId:
        usuario.uid,

      livroId,

      titulo:
        titulo || "Livro",

      autor:
        autor || "Autor não informado",

      capa:
        capa || "",

      criadoEm:
        serverTimestamp()
    }
  );

  return {
    favoritado: true,
    redirecionado: false
  };
}