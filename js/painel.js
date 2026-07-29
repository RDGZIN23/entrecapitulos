// ==============================
// MENU DO PAINEL
// ==============================

const usuarioLogado = sessionStorage.getItem("autorLogado");

if (usuarioLogado !== "sim") {
    window.location.href = "login.html";
}

const botoesMenu = document.querySelectorAll(".menu-item");
const secoes = document.querySelectorAll(".painel-secao");

function abrirSecao(id) {

    secoes.forEach(secao => {
        secao.classList.remove("ativa");
    });

    botoesMenu.forEach(botao => {
        botao.classList.remove("ativo");
    });

    document.getElementById(id).classList.add("ativa");

    document
        .querySelector(`[data-secao="${id}"]`)
        .classList.add("ativo");

}

botoesMenu.forEach(botao => {

    botao.addEventListener("click", () => {

        abrirSecao(botao.dataset.secao);

    });

});

// ==============================
// BOTÕES DE AÇÃO RÁPIDA
// ==============================

document.querySelectorAll("[data-abrir-secao]").forEach(botao => {

    botao.addEventListener("click", () => {

        abrirSecao(botao.dataset.abrirSecao);

    });

});

// ==============================
// CONTADOR DE PALAVRAS
// ==============================

const textoCapitulo =
document.getElementById("textoCapitulo");

const contador =
document.getElementById("contadorPalavras");

if (textoCapitulo) {

    textoCapitulo.addEventListener("input", () => {

        const quantidade =
            textoCapitulo.value
            .trim()
            .split(/\s+/)
            .filter(p => p.length > 0)
            .length;

        contador.textContent =
            quantidade + " palavras";

    });

}

// ==============================
// MENSAGEM
// ==============================

const mensagem =
document.getElementById("mensagemPainel");

function mostrarMensagem(texto, tipo = "sucesso") {

    mensagem.textContent = texto;

    mensagem.className =
        "mensagem-painel visivel " + tipo;

    setTimeout(() => {

        mensagem.className =
            "mensagem-painel";

    }, 3000);

}

// ==============================
// FORM LIVRO
// ==============================

const formLivro =
document.getElementById("formLivro");

if (formLivro) {

    formLivro.addEventListener("submit", e => {

        e.preventDefault();

        mostrarMensagem(
            "Livro salvo com sucesso!"
        );

        formLivro.reset();

    });

}

// ==============================
// FORM CAPÍTULO
// ==============================

const formCapitulo =
document.getElementById("formCapitulo");

if (formCapitulo) {

    formCapitulo.addEventListener("submit", e => {

        e.preventDefault();

        mostrarMensagem(
            "Capítulo salvo com sucesso!"
        );

        formCapitulo.reset();

        contador.textContent =
            "0 palavras";

    });

}

// ==============================
// BOTÃO SAIR
// ==============================

const sair = document.getElementById("botaoSair");

if (sair) {
    sair.addEventListener("click", () => {
        const confirmarSaida = confirm(
            "Deseja realmente sair do painel?"
        );

        if (confirmarSaida) {
            sessionStorage.removeItem("autorLogado");
            window.location.href = "login.html";
        }
    });
}