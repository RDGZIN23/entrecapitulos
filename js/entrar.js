// ========================================
// IMPORTAÇÕES DO FIREBASE
// ========================================

import {
  auth,
  db
} from "./firebase-config.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ========================================
// ELEMENTOS DA PÁGINA
// ========================================

const abaEntrar =
  document.getElementById("abaEntrar");

const abaCadastrar =
  document.getElementById("abaCadastrar");

const formularioEntrar =
  document.getElementById("formularioEntrar");

const formularioCadastrar =
  document.getElementById("formularioCadastrar");

const tituloFormulario =
  document.getElementById("tituloFormulario");

const subtituloFormulario =
  document.getElementById("subtituloFormulario");

const mensagemAutenticacao =
  document.getElementById("mensagemAutenticacao");

const botaoEntrar =
  document.getElementById("botaoEntrar");

const botaoCadastrar =
  document.getElementById("botaoCadastrar");

const emailEntrar =
  document.getElementById("emailEntrar");

const senhaEntrar =
  document.getElementById("senhaEntrar");

const nomeCadastrar =
  document.getElementById("nomeCadastrar");

const emailCadastrar =
  document.getElementById("emailCadastrar");

const senhaCadastrar =
  document.getElementById("senhaCadastrar");

const confirmarSenha =
  document.getElementById("confirmarSenha");


// ========================================
// CONTROLAR ABAS
// ========================================

function abrirAbaEntrar() {
  formularioEntrar.hidden = false;
  formularioCadastrar.hidden = true;

  abaEntrar.classList.add("ativa");
  abaCadastrar.classList.remove("ativa");

  tituloFormulario.textContent =
    "Entrar";

  subtituloFormulario.textContent =
    "Acesse sua conta e continue suas histórias.";

  limparMensagem();
}


function abrirAbaCadastrar() {
  formularioEntrar.hidden = true;
  formularioCadastrar.hidden = false;

  abaEntrar.classList.remove("ativa");
  abaCadastrar.classList.add("ativa");

  tituloFormulario.textContent =
    "Criar conta";

  subtituloFormulario.textContent =
    "Crie seu perfil de leitor no Entre Capítulos.";

  limparMensagem();
}


abaEntrar.addEventListener(
  "click",
  abrirAbaEntrar
);

abaCadastrar.addEventListener(
  "click",
  abrirAbaCadastrar
);


// ========================================
// EXIBIR MENSAGENS
// ========================================

function mostrarMensagem(
  mensagem,
  tipo = "erro"
) {
  mensagemAutenticacao.textContent =
    mensagem;

  mensagemAutenticacao.classList.remove(
    "erro",
    "sucesso"
  );

  mensagemAutenticacao.classList.add(
    tipo
  );
}


function limparMensagem() {
  mensagemAutenticacao.textContent = "";

  mensagemAutenticacao.classList.remove(
    "erro",
    "sucesso"
  );
}


// ========================================
// CONTROLAR BOTÕES
// ========================================

function alterarEstadoBotao(
  botao,
  carregando,
  textoNormal,
  textoCarregando
) {
  botao.disabled =
    carregando;

  botao.textContent =
    carregando
      ? textoCarregando
      : textoNormal;
}


// ========================================
// TRADUZIR ERROS DO FIREBASE
// ========================================

function traduzirErroFirebase(erro) {
  const codigo =
    erro?.code || "";

  const mensagens = {
    "auth/email-already-in-use":
      "Este e-mail já está sendo usado por outra conta.",

    "auth/invalid-email":
      "Digite um endereço de e-mail válido.",

    "auth/weak-password":
      "A senha precisa ter pelo menos 6 caracteres.",

    "auth/invalid-credential":
      "E-mail ou senha incorretos.",

    "auth/user-not-found":
      "Não encontramos uma conta com esse e-mail.",

    "auth/wrong-password":
      "A senha informada está incorreta.",

    "auth/too-many-requests":
      "Muitas tentativas foram feitas. Aguarde um pouco e tente novamente.",

    "auth/network-request-failed":
      "Não foi possível conectar. Verifique sua internet.",

    "auth/operation-not-allowed":
      "O login por e-mail e senha não está ativado no Firebase."
  };

  return (
    mensagens[codigo] ||
    "Ocorreu um erro. Tente novamente."
  );
}


// ========================================
// CRIAR DOCUMENTO DO LEITOR
// ========================================

async function salvarLeitorNoFirestore(
  usuario,
  nome
) {
  const referenciaLeitor =
    doc(
      db,
      "usuarios",
      usuario.uid
    );

  await setDoc(
    referenciaLeitor,
    {
      uid: usuario.uid,
      nome: nome,
      email: usuario.email,
      tipo: "leitor",
      foto: "",
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp()
    },
    {
      merge: true
    }
  );
}


// ========================================
// CADASTRAR LEITOR
// ========================================

formularioCadastrar.addEventListener(
  "submit",
  async (evento) => {
    evento.preventDefault();

    limparMensagem();

    const nome =
      nomeCadastrar.value.trim();

    const email =
      emailCadastrar.value
        .trim()
        .toLowerCase();

    const senha =
      senhaCadastrar.value;

    const confirmacao =
      confirmarSenha.value;

    if (nome.length < 2) {
      mostrarMensagem(
        "Digite um nome com pelo menos 2 caracteres."
      );

      return;
    }

    if (senha.length < 6) {
      mostrarMensagem(
        "A senha precisa ter pelo menos 6 caracteres."
      );

      return;
    }

    if (senha !== confirmacao) {
      mostrarMensagem(
        "As duas senhas não são iguais."
      );

      return;
    }

    alterarEstadoBotao(
      botaoCadastrar,
      true,
      "Criar minha conta",
      "Criando conta..."
    );

    try {
      const credencial =
        await createUserWithEmailAndPassword(
          auth,
          email,
          senha
        );

      await updateProfile(
        credencial.user,
        {
          displayName: nome
        }
      );

      await salvarLeitorNoFirestore(
        credencial.user,
        nome
      );

      mostrarMensagem(
        "Conta criada com sucesso!",
        "sucesso"
      );

      setTimeout(() => {
        window.location.href =
          "perfil.html";
      }, 900);

    } catch (erro) {
      console.error(
        "Erro ao criar conta:",
        erro
      );

      mostrarMensagem(
  erro.code + " - " + erro.message,
  "erro"
);

      alterarEstadoBotao(
        botaoCadastrar,
        false,
        "Criar minha conta",
        "Criando conta..."
      );
    }
  }
);


// ========================================
// ENTRAR NA CONTA
// ========================================

formularioEntrar.addEventListener(
  "submit",
  async (evento) => {
    evento.preventDefault();

    limparMensagem();

    const email =
      emailEntrar.value
        .trim()
        .toLowerCase();

    const senha =
      senhaEntrar.value;

    alterarEstadoBotao(
      botaoEntrar,
      true,
      "Entrar na conta",
      "Entrando..."
    );

    try {
      const credencial =
        await signInWithEmailAndPassword(
          auth,
          email,
          senha
        );

      const referenciaLeitor =
        doc(
          db,
          "usuarios",
          credencial.user.uid
        );

      const resultadoLeitor =
        await getDoc(
          referenciaLeitor
        );

      if (!resultadoLeitor.exists()) {
        await salvarLeitorNoFirestore(
          credencial.user,
          credencial.user.displayName ||
          "Leitor"
        );
      }

      mostrarMensagem(
        "Login realizado com sucesso!",
        "sucesso"
      );

      setTimeout(() => {
        window.location.href =
          "perfil.html";
      }, 700);

    } catch (erro) {
      console.error(
        "Erro ao entrar:",
        erro
      );

      mostrarMensagem(
        traduzirErroFirebase(erro)
      );

      alterarEstadoBotao(
        botaoEntrar,
        false,
        "Entrar na conta",
        "Entrando..."
      );
    }
  }
);


// ========================================
// VERIFICAR USUÁRIO JÁ CONECTADO
// ========================================

onAuthStateChanged(
  auth,
  (usuario) => {
    if (!usuario) {
      return;
    }

    /*
      Não redirecionamos imediatamente,
      pois o autor também utiliza o mesmo
      Firebase Authentication.

      O redirecionamento acontece apenas
      depois de um login ou cadastro feito
      nesta página.
    */
  }
);