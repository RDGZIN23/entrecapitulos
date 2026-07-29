const form = document.getElementById("loginForm");

form.addEventListener("submit", function(e){

    e.preventDefault();

    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;

    if(email === "admin@entrecapitulos.com" && senha === "123456"){

        window.location.href = "painel.html";

    }else{

        alert("E-mail ou senha inválidos.");

    }

});