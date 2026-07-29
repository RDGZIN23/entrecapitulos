import { auth } from "./firebase-config.js";

import {
    signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const form = document.getElementById("loginForm");
const botaoEntrar = form.querySelector('button[type="submit"]');

form.addEventListener("submit", async function (evento) {
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
        await signInWithEmailAndPassword(auth, email, senha);

        window.location.href = "painel.html";
    } catch (erro) {
        console.error("Erro completo do Firebase:", erro);

        alert(
            "Erro: " +
            erro.code +
            "\n\n" +
            erro.message
        );
    } finally {
        botaoEntrar.disabled = false;
        botaoEntrar.textContent = "Entrar";
    }
});