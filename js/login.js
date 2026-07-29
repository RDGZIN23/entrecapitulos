const form = document.getElementById("loginForm");

form.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;

    if (
        email === "admin@entrecapitulos.com" &&
        senha === "123456"
    ) {
        sessionStorage.setItem("autorLogado", "sim");
        window.location.href = "painel.html";
    } else {
        alert("E-mail ou senha inválidos.");
    }
});