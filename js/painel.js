// ==============================
// IMPORTAÇÕES DO FIREBASE
// ==============================

import { auth, db } from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
    addDoc,
    collection,
    getDocs,
    orderBy,
    query,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ==============================
// MENSAGENS DO PAINEL
// ==============================

function mostrarMensagem(texto, tipo = "sucesso") {
    const mensagem =
        document.getElementById("mensagemPainel");

    if (!mensagem) {
        alert(texto);
        return;
    }

    mensagem.textContent = texto;
    mensagem.className =
        `mensagem-painel visivel ${tipo}`;

    setTimeout(() => {
        mensagem.className = "mensagem-painel";
    }, 4000);
}


// ==============================
// CARREGAR LIVROS
// ==============================

async function carregarLivros() {
    const listaLivros =
        document.getElementById("listaLivros");

    if (!listaLivros) {
        return;
    }

    listaLivros.innerHTML = `
        <p>Carregando livros...</p>
    `;

    try {
        const consulta = query(
            collection(db, "livros"),
            orderBy("criadoEm", "desc")
        );

        const resultado = await getDocs(consulta);

        if (resultado.empty) {
            listaLivros.innerHTML = `
                <p>Nenhum livro cadastrado ainda.</p>
            `;

            return;
        }

        listaLivros.innerHTML = "";

        resultado.forEach((documento) => {
            const livro = documento.data();

            const card =
                document.createElement("article");

            card.className = "livro-painel-card";

            card.innerHTML = `
                <div class="livro-painel-capa">
                    <img
                        src="${
                            livro.capa ||
                            "images/depois-de-te-odiar.png"
                        }"
                        alt="Capa de ${livro.titulo}"
                    >
                </div>

                <div class="livro-painel-info">
                    <span class="status-publicado">
                        ${livro.status || "rascunho"}
                    </span>

                    <h2>${livro.titulo}</h2>

                    <p>${livro.autor}</p>

                    <small>
                        ${
                            livro.genero ||
                            "Sem gênero definido"
                        }
                    </small>
                </div>

                <div class="livro-painel-acoes">
                    <button
                        type="button"
                        class="botao-editar"
                        data-id="${documento.id}"
                    >
                        Editar
                    </button>
                </div>
            `;

            listaLivros.appendChild(card);
        });

    } catch (erro) {
        console.error(
            "Erro ao carregar livros:",
            erro
        );

        listaLivros.innerHTML = `
            <p>
                Não foi possível carregar os livros.
            </p>
        `;
    }
}


// ==============================
// MENU DO PAINEL
// ==============================

const botoesMenu =
    document.querySelectorAll(".menu-item");

const secoes =
    document.querySelectorAll(".painel-secao");

function abrirSecao(id) {
    secoes.forEach((secao) => {
        secao.classList.remove("ativa");
    });

    botoesMenu.forEach((botao) => {
        botao.classList.remove("ativo");
    });

    const secaoEscolhida =
        document.getElementById(id);

    const botaoEscolhido =
        document.querySelector(
            `[data-secao="${id}"]`
        );

    if (secaoEscolhida) {
        secaoEscolhida.classList.add("ativa");
    }

    if (botaoEscolhido) {
        botaoEscolhido.classList.add("ativo");
    }
}


// Ativar botões do menu lateral

botoesMenu.forEach((botao) => {
    botao.addEventListener("click", () => {
        abrirSecao(botao.dataset.secao);
    });
});


// Ativar botões de ações rápidas

document
    .querySelectorAll("[data-abrir-secao]")
    .forEach((botao) => {
        botao.addEventListener("click", () => {
            abrirSecao(
                botao.dataset.abrirSecao
            );
        });
    });


// ==============================
// VERIFICAR LOGIN
// ==============================

onAuthStateChanged(auth, (usuario) => {
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    console.log(
        "Administrador conectado:",
        usuario.email
    );

    carregarLivros();
});


// ==============================
// CONTADOR DE PALAVRAS
// ==============================

const textoCapitulo =
    document.getElementById("textoCapitulo");

const contador =
    document.getElementById("contadorPalavras");

if (textoCapitulo && contador) {
    textoCapitulo.addEventListener("input", () => {
        const texto =
            textoCapitulo.value.trim();

        const quantidade = texto
            ? texto.split(/\s+/).length
            : 0;

        contador.textContent =
            `${quantidade} palavras`;
    });
}


// ==============================
// FORMULÁRIO DE LIVRO
// ==============================

const formLivro =
    document.getElementById("formLivro");

if (formLivro) {
    formLivro.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            const botaoSalvar =
                formLivro.querySelector(
                    'button[type="submit"]'
                );

            const titulo =
                document
                    .getElementById("tituloLivro")
                    .value
                    .trim();

            const autor =
                document
                    .getElementById("autorLivro")
                    .value
                    .trim();

            const sinopse =
                document
                    .getElementById("sinopseLivro")
                    .value
                    .trim();

            const genero =
                document
                    .getElementById("generoLivro")
                    .value;

            const status =
                document
                    .getElementById("statusLivro")
                    .value;

            if (
                !titulo ||
                !autor ||
                !sinopse ||
                !genero
            ) {
                mostrarMensagem(
                    "Preencha todos os campos obrigatórios.",
                    "erro"
                );

                return;
            }

            if (!auth.currentUser) {
                mostrarMensagem(
                    "Você precisa entrar novamente.",
                    "erro"
                );

                return;
            }

            botaoSalvar.disabled = true;
            botaoSalvar.textContent =
                "Salvando...";

            try {
                await addDoc(
                    collection(db, "livros"),
                    {
                        titulo,
                        autor,
                        sinopse,
                        genero,
                        status,

                        capa:
                            "images/depois-de-te-odiar.png",

                        criadoPor:
                            auth.currentUser.uid,

                        criadoEm:
                            serverTimestamp(),

                        atualizadoEm:
                            serverTimestamp()
                    }
                );

                mostrarMensagem(
                    "Livro salvo no Firebase com sucesso!"
                );

                await carregarLivros();

                formLivro.reset();

                document
                    .getElementById("autorLivro")
                    .value = "Rd Sebastião";

                abrirSecao("livros");

            } catch (erro) {
                console.error(
                    "Erro ao salvar livro:",
                    erro
                );

                mostrarMensagem(
                    "Não foi possível salvar o livro.",
                    "erro"
                );

            } finally {
                botaoSalvar.disabled = false;
                botaoSalvar.textContent =
                    "Salvar livro";
            }
        }
    );
}


// ==============================
// FORMULÁRIO DE CAPÍTULO
// ==============================

const formCapitulo =
    document.getElementById("formCapitulo");

if (formCapitulo) {
    formCapitulo.addEventListener(
        "submit",
        (evento) => {
            evento.preventDefault();

            mostrarMensagem(
                "Capítulo salvo com sucesso!"
            );

            formCapitulo.reset();

            if (contador) {
                contador.textContent =
                    "0 palavras";
            }
        }
    );
}


// ==============================
// BOTÃO SAIR
// ==============================

const botaoSair =
    document.getElementById("botaoSair");

if (botaoSair) {
    botaoSair.addEventListener(
        "click",
        async () => {
            const confirmarSaida = confirm(
                "Deseja realmente sair do painel?"
            );

            if (!confirmarSaida) {
                return;
            }

            try {
                await signOut(auth);

                window.location.href =
                    "login.html";

            } catch (erro) {
                console.error(
                    "Erro ao sair:",
                    erro
                );

                mostrarMensagem(
                    "Não foi possível sair. Tente novamente.",
                    "erro"
                );
            }
        }
    );
}