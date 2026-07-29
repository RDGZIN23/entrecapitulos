import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const botaoEntrar = form.querySelector('button[type="submit"]');

onAuthStateChanged(auth, (usuario) => {
    if (usuario) {
        window.location.href = "painel.html";
    }
});

form.addEventListener("submit", async (evento) => {
    evento.preventDefault();

    const email = document
        .getElementById("email")
        .value
        .trim();

    const senha = document
        .getElementById("senha")
        .value;

    botaoEntrar.disabled = true;
    botaoEntrar.textContent = "Entrando...";

    try {
        await signInWithEmailAndPassword(
            auth,
            email,
            senha
        );

        window.location.href = "painel.html";
    } catch (erro) {
    console.error("Erro completo:", erro);

    alert(
        "Erro: " + erro.code +
        "\n\nMensagem: " + erro.message
    );

        if (
            erro.code === "auth/invalid-credential" ||
            erro.code === "auth/wrong-password" ||
            erro.code === "auth/user-not-found"
        ) {
            mensagem = "E-mail ou senha incorretos.";
        }

        if (erro.code === "auth/invalid-email") {
            mensagem = "Digite um endereço de e-mail válido.";
        }

        if (erro.code === "auth/too-many-requests") {
            mensagem =
                "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
        }

        alert(mensagem);
    } finally {
        botaoEntrar.disabled = false;
        botaoEntrar.textContent = "Entrar";
    }
});