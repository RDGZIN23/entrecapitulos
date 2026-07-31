// ==============================
// IMPORTAÇÕES DO FIREBASE
// ==============================

import {
    auth,
    db
} from "./firebase-config.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";


import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";


// ==============================
// CONFIGURAÇÕES
// ==============================

const capaPadrao =
    "images/depois-de-te-odiar.png";

const CLOUDINARY_CLOUD_NAME =
    "dzsf7cwf";

const CLOUDINARY_UPLOAD_PRESET =
    "entre_capitulos";

const CLOUDINARY_UPLOAD_URL =
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

let livrosCarregados = [];
let capitulosCarregados = [];
let favoritosCarregados = [];
let avaliacoesCarregadas = [];

let livroEmEdicaoId = null;
let capaAtualLivroEmEdicao = capaPadrao;


// ==============================
// ELEMENTOS DAS ESTATÍSTICAS
// ==============================

const totalLivros =
    document.getElementById("totalLivros");

const totalCapitulos =
    document.getElementById("totalCapitulos");

const totalRascunhos =
    document.getElementById("totalRascunhos");

const totalFavoritosPainel =
    document.getElementById(
        "totalFavoritosPainel"
    );

const totalAvaliacoesPainel =
    document.getElementById(
        "totalAvaliacoesPainel"
    );

const mediaAvaliacoesPainel =
    document.getElementById(
        "mediaAvaliacoesPainel"
    );

const desempenhoLivros =
    document.getElementById(
        "desempenhoLivros"
    );

const atividadesRecentes =
    document.getElementById(
        "atividadesRecentes"
    );


// ==============================
// FUNÇÕES AUXILIARES
// ==============================

function escaparHTML(valor = "") {
    return String(valor)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


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
    const milissegundos =
        obterMilissegundos(data);

    if (!milissegundos) {
        return "Data não informada";
    }

    return new Date(
        milissegundos
    ).toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );
}


function criarEstrelas(nota = 0) {
    const valor =
        Math.min(
            5,
            Math.max(
                0,
                Math.round(
                    Number(nota) || 0
                )
            )
        );

    return (
        "★".repeat(valor) +
        "☆".repeat(5 - valor)
    );
}


// ==============================
// MENSAGENS DO PAINEL
// ==============================

function mostrarMensagem(
    texto,
    tipo = "sucesso"
) {
    const mensagem =
        document.getElementById(
            "mensagemPainel"
        );

    if (!mensagem) {
        alert(texto);
        return;
    }

    mensagem.textContent =
        texto;

    mensagem.className =
        `mensagem-painel visivel ${tipo}`;

    setTimeout(() => {
        mensagem.className =
            "mensagem-painel";
    }, 4000);
}


// ==============================
// BUSCAR UMA COLEÇÃO
// ==============================

async function buscarColecao(
    nomeColecao
) {
    try {
        const resultado =
            await getDocs(
                collection(
                    db,
                    nomeColecao
                )
            );

        return resultado.docs.map(
            (documento) => ({
                id: documento.id,
                ...documento.data()
            })
        );

    } catch (erro) {
        console.error(
            `Erro ao carregar ${nomeColecao}:`,
            erro
        );

        return [];
    }
}


// ==============================
// ATUALIZAR NÚMEROS DO PAINEL
// ==============================

function atualizarEstatisticas() {
    const capitulosPublicados =
        capitulosCarregados.filter(
            (capitulo) =>
                String(
                    capitulo.status || ""
                ).toLowerCase() ===
                "publicado"
        );

    const rascunhosLivros =
        livrosCarregados.filter(
            (livro) =>
                String(
                    livro.status || ""
                ).toLowerCase() ===
                "rascunho"
        ).length;

    const rascunhosCapitulos =
        capitulosCarregados.filter(
            (capitulo) =>
                String(
                    capitulo.status || ""
                ).toLowerCase() ===
                "rascunho"
        ).length;

    const quantidadeRascunhos =
        rascunhosLivros +
        rascunhosCapitulos;

    const notasValidas =
        avaliacoesCarregadas
            .map(
                (avaliacao) =>
                    Number(
                        avaliacao.nota
                    )
            )
            .filter(
                (nota) =>
                    nota >= 1 &&
                    nota <= 5
            );

    const somaNotas =
        notasValidas.reduce(
            (soma, nota) =>
                soma + nota,
            0
        );

    const media =
        notasValidas.length > 0
            ? somaNotas /
              notasValidas.length
            : 0;

    if (totalLivros) {
        totalLivros.textContent =
            String(
                livrosCarregados.length
            );
    }

    if (totalCapitulos) {
        totalCapitulos.textContent =
            String(
                capitulosPublicados.length
            );
    }

    if (totalRascunhos) {
        totalRascunhos.textContent =
            String(
                quantidadeRascunhos
            );
    }

    if (totalFavoritosPainel) {
        totalFavoritosPainel.textContent =
            String(
                favoritosCarregados.length
            );
    }

    if (totalAvaliacoesPainel) {
        totalAvaliacoesPainel.textContent =
            String(
                avaliacoesCarregadas.length
            );
    }

    if (mediaAvaliacoesPainel) {
        mediaAvaliacoesPainel.textContent =
            media
                .toFixed(1)
                .replace(".", ",");
    }
}


// ==============================
// CONTAR DADOS DE UM LIVRO
// ==============================

function obterDesempenhoLivro(
    livro
) {
    const capitulosDoLivro =
        capitulosCarregados.filter(
            (capitulo) =>
                capitulo.livroId ===
                livro.id
        );

    const capitulosPublicados =
        capitulosDoLivro.filter(
            (capitulo) =>
                String(
                    capitulo.status || ""
                ).toLowerCase() ===
                "publicado"
        );

    const favoritosDoLivro =
        favoritosCarregados.filter(
            (favorito) =>
                favorito.livroId ===
                livro.id
        );

    const avaliacoesDoLivro =
        avaliacoesCarregadas.filter(
            (avaliacao) =>
                avaliacao.livroId ===
                livro.id
        );

    const notas =
        avaliacoesDoLivro
            .map(
                (avaliacao) =>
                    Number(
                        avaliacao.nota
                    )
            )
            .filter(
                (nota) =>
                    nota >= 1 &&
                    nota <= 5
            );

    const media =
        notas.length > 0
            ? notas.reduce(
                (soma, nota) =>
                    soma + nota,
                0
            ) / notas.length
            : 0;

    return {
        capitulos:
            capitulosPublicados.length,

        favoritos:
            favoritosDoLivro.length,

        avaliacoes:
            avaliacoesDoLivro.length,

        media
    };
}


// ==============================
// MOSTRAR DESEMPENHO DOS LIVROS
// ==============================

function mostrarDesempenhoLivros() {
    if (!desempenhoLivros) {
        return;
    }

    desempenhoLivros.innerHTML = "";

    if (livrosCarregados.length === 0) {
        desempenhoLivros.innerHTML = `
            <p>
                Nenhum livro cadastrado ainda.
            </p>
        `;

        return;
    }

    livrosCarregados.forEach(
        (livro) => {
            const dados =
                obterDesempenhoLivro(
                    livro
                );

            const card =
                document.createElement(
                    "article"
                );

            card.className =
                "livro-painel-card desempenho-card";

            card.innerHTML = `
                <div class="livro-painel-capa">
                    <img
                        src="${
                            escaparHTML(
                                livro.capa ||
                                capaPadrao
                            )
                        }"
                        alt="Capa de ${
                            escaparHTML(
                                livro.titulo ||
                                "Livro"
                            )
                        }"
                    >
                </div>

                <div class="livro-painel-info">

                    <span class="status-publicado">
                        ${
                            escaparHTML(
                                livro.status ||
                                "rascunho"
                            )
                        }
                    </span>

                    <h2>
                        ${
                            escaparHTML(
                                livro.titulo ||
                                "Livro sem título"
                            )
                        }
                    </h2>

                    <p>
                        ${
                            escaparHTML(
                                livro.autor ||
                                "Autor não informado"
                            )
                        }
                    </p>

                    <small>
                        📄 ${dados.capitulos}
                        ${
                            dados.capitulos === 1
                                ? "capítulo"
                                : "capítulos"
                        }
                        •
                        ❤️ ${dados.favoritos}
                        •
                        ⭐ ${dados.avaliacoes}
                    </small>

                    <small>
                        ${criarEstrelas(
                            dados.media
                        )}
                        ${dados.media
                            .toFixed(1)
                            .replace(".", ",")}
                    </small>

                </div>

                <div class="livro-painel-acoes">

                    <a
                        href="livro.html?id=${livro.id}"
                        class="botao-secundario"
                    >
                        Visualizar
                    </a>

                </div>
            `;

            const imagem =
                card.querySelector("img");

            if (imagem) {
                imagem.addEventListener(
                    "error",
                    () => {
                        imagem.src =
                            capaPadrao;
                    },
                    { once: true }
                );
            }

            desempenhoLivros.appendChild(
                card
            );
        }
    );
}


// ==============================
// MOSTRAR ATIVIDADES RECENTES
// ==============================

function mostrarAtividadesRecentes() {
    if (!atividadesRecentes) {
        return;
    }

    const atividades = [];

    capitulosCarregados.forEach(
        (capitulo) => {
            atividades.push({
                tipo: "capitulo",
                data:
                    capitulo.criadoEm ||
                    capitulo.atualizadoEm,
                titulo:
                    capitulo.titulo ||
                    "Capítulo sem título",
                descricao:
                    `Capítulo ${capitulo.numero || ""} de ${
                        capitulo.livroTitulo ||
                        "um livro"
                    }`
            });
        }
    );

    avaliacoesCarregadas.forEach(
        (avaliacao) => {
            atividades.push({
                tipo: "avaliacao",
                data:
                    avaliacao.atualizadoEm ||
                    avaliacao.criadoEm,
                titulo:
                    `${
                        avaliacao.usuarioNome ||
                        avaliacao.nomeUsuario ||
                        "Um leitor"
                    } avaliou um livro`,
                descricao:
                    `${criarEstrelas(
                        avaliacao.nota
                    )} ${
                        avaliacao.livroTitulo ||
                        ""
                    }`
            });
        }
    );

    favoritosCarregados.forEach(
        (favorito) => {
            atividades.push({
                tipo: "favorito",
                data: favorito.criadoEm,
                titulo:
                    "Um livro foi favoritado",
                descricao:
                    favorito.titulo ||
                    "Livro do Entre Capítulos"
            });
        }
    );

    atividades.sort(
        (a, b) =>
            obterMilissegundos(b.data) -
            obterMilissegundos(a.data)
    );

    const recentes =
        atividades.slice(0, 8);

    atividadesRecentes.innerHTML =
        "";

    if (recentes.length === 0) {
        atividadesRecentes.innerHTML = `
            <p>
                Nenhuma atividade recente.
            </p>
        `;

        return;
    }

    recentes.forEach(
        (atividade) => {
            const icone =
                atividade.tipo ===
                "avaliacao"
                    ? "⭐"
                    : atividade.tipo ===
                      "favorito"
                        ? "❤️"
                        : "📄";

            const item =
                document.createElement(
                    "article"
                );

            item.className =
                "atividade-painel-card";

            item.innerHTML = `
                <span class="atividade-icone">
                    ${icone}
                </span>

                <div>
                    <strong>
                        ${
                            escaparHTML(
                                atividade.titulo
                            )
                        }
                    </strong>

                    <p>
                        ${
                            escaparHTML(
                                atividade.descricao
                            )
                        }
                    </p>

                    <small>
                        ${
                            formatarData(
                                atividade.data
                            )
                        }
                    </small>
                </div>
            `;

            atividadesRecentes.appendChild(
                item
            );
        }
    );
}


// ==============================
// CARREGAR DADOS DO PAINEL
// ==============================

async function carregarDadosPainel() {
    const resultados =
        await Promise.all([
            buscarColecao("livros"),
            buscarColecao("capitulos"),
            buscarColecao("favoritos"),
            buscarColecao("avaliacoes")
        ]);

    livrosCarregados =
        resultados[0];

    capitulosCarregados =
        resultados[1];

    favoritosCarregados =
        resultados[2];

    avaliacoesCarregadas =
        resultados[3];

    livrosCarregados.sort(
        (a, b) =>
            obterMilissegundos(
                b.criadoEm
            ) -
            obterMilissegundos(
                a.criadoEm
            )
    );

    atualizarEstatisticas();
    mostrarDesempenhoLivros();
    mostrarAtividadesRecentes();
}

// ==============================
// ENVIAR CAPA PARA O CLOUDINARY
// ==============================

async function enviarCapaCloudinary(
    arquivo
) {
    if (!arquivo) {
        return capaPadrao;
    }

    const formatosPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    if (
        !formatosPermitidos.includes(
            arquivo.type
        )
    ) {
        throw new Error(
            "Escolha uma imagem JPG, PNG ou WEBP."
        );
    }

    const tamanhoMaximo =
        8 * 1024 * 1024;

    if (
        arquivo.size >
        tamanhoMaximo
    ) {
        throw new Error(
            "A imagem deve ter no máximo 8 MB."
        );
    }

    const dados =
        new FormData();

    dados.append(
        "file",
        arquivo
    );

    dados.append(
        "upload_preset",
        CLOUDINARY_UPLOAD_PRESET
    );

    const resposta =
        await fetch(
            CLOUDINARY_UPLOAD_URL,
            {
                method: "POST",
                body: dados
            }
        );

    const resultado =
        await resposta.json();

    if (
        !resposta.ok ||
        !resultado.secure_url
    ) {
        console.error(
            "Erro retornado pelo Cloudinary:",
            resultado
        );

        throw new Error(
            resultado.error?.message ||
            "Não foi possível enviar a capa."
        );
    }

    return resultado.secure_url;
}


// ==============================
// CARREGAR LIVROS NO PAINEL
// ==============================

async function carregarLivros() {
    const listaLivros =
        document.getElementById(
            "listaLivros"
        );

    const seletorLivros =
        document.getElementById(
            "livroCapitulo"
        );

    if (listaLivros) {
        listaLivros.innerHTML = `
            <p>Carregando livros...</p>
        `;
    }

    if (seletorLivros) {
        seletorLivros.innerHTML = `
            <option value="">
                Carregando livros...
            </option>
        `;
    }

    try {
        const consulta = query(
            collection(db, "livros"),
            orderBy("criadoEm", "desc")
        );

        const resultado =
            await getDocs(consulta);

        if (resultado.empty) {
            if (listaLivros) {
                listaLivros.innerHTML = `
                    <p>
                        Nenhum livro cadastrado ainda.
                    </p>
                `;
            }

            if (seletorLivros) {
                seletorLivros.innerHTML = `
                    <option value="">
                        Nenhum livro cadastrado
                    </option>
                `;
            }

            return;
        }

        if (listaLivros) {
            listaLivros.innerHTML = "";
        }

        if (seletorLivros) {
            seletorLivros.innerHTML = `
                <option value="">
                    Selecione um livro
                </option>
            `;
        }

        resultado.forEach(
            (documento) => {
                const livro =
                    documento.data();

                const livroId =
                    documento.id;

                if (listaLivros) {
                    const card =
                        document.createElement(
                            "article"
                        );

                    card.className =
                        "livro-painel-card";

                    card.innerHTML = `
                        <div class="livro-painel-capa">
                            <img
                                src="${
                                    escaparHTML(
                                        livro.capa ||
                                        capaPadrao
                                    )
                                }"
                                alt="Capa de ${
                                    escaparHTML(
                                        livro.titulo ||
                                        "Livro"
                                    )
                                }"
                            >
                        </div>

                        <div class="livro-painel-info">
                            <span class="status-publicado">
                                ${
                                    escaparHTML(
                                        livro.status ||
                                        "rascunho"
                                    )
                                }
                            </span>

                            <h2>
                                ${
                                    escaparHTML(
                                        livro.titulo ||
                                        "Livro sem título"
                                    )
                                }
                            </h2>

                            <p>
                                ${
                                    escaparHTML(
                                        livro.autor ||
                                        "Autor não informado"
                                    )
                                }
                            </p>

                            <small>
                                ${
                                    escaparHTML(
                                        livro.genero ||
                                        "Sem gênero definido"
                                    )
                                }
                            </small>
                        </div>

                        <div class="livro-painel-acoes">

                            <a
                                href="livro.html?id=${livroId}"
                                class="botao-secundario"
                            >
                                Visualizar
                            </a>

                            <button
                                type="button"
                                class="botao-editar"
                                data-id="${livroId}"
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="botao-excluir"
                                data-id="${livroId}"
                            >
                                Excluir
                            </button>

                        </div>
                    `;

                    const imagem =
                        card.querySelector(
                            "img"
                        );

                    if (imagem) {
                        imagem.addEventListener(
                            "error",
                            () => {
                                imagem.src =
                                    capaPadrao;
                            },
                            { once: true }
                        );
                    }

                    const botaoEditar =
                        card.querySelector(
                            ".botao-editar"
                        );

                    if (botaoEditar) {
                        botaoEditar.addEventListener(
                            "click",
                            () => {
                                livroEmEdicaoId =
                                    livroId;

                                capaAtualLivroEmEdicao =
                                    livro.capa ||
                                    capaPadrao;

                                const campoTitulo =
                                    document.getElementById(
                                        "tituloLivro"
                                    );

                                const campoAutor =
                                    document.getElementById(
                                        "autorLivro"
                                    );

                                const campoSinopse =
                                    document.getElementById(
                                        "sinopseLivro"
                                    );

                                const campoGenero =
                                    document.getElementById(
                                        "generoLivro"
                                    );

                                const campoStatus =
                                    document.getElementById(
                                        "statusLivro"
                                    );

                                if (campoTitulo) {
                                    campoTitulo.value =
                                        livro.titulo ||
                                        "";
                                }

                                if (campoAutor) {
                                    campoAutor.value =
                                        livro.autor ||
                                        "";
                                }

                                if (campoSinopse) {
                                    campoSinopse.value =
                                        livro.sinopse ||
                                        "";
                                }

                                if (campoGenero) {
                                    campoGenero.value =
                                        livro.genero ||
                                        "";
                                }

                                if (campoStatus) {
                                    campoStatus.value =
                                        livro.status ||
                                        "rascunho";
                                }

                                abrirSecao(
                                    "novoLivro"
                                );

                                mostrarMensagem(
                                    "Modo de edição ativado."
                                );

                                window.scrollTo({
                                    top: 0,
                                    behavior: "smooth"
                                });
                            }
                        );
                    }

                    const botaoExcluir =
                        card.querySelector(
                            ".botao-excluir"
                        );

                    if (botaoExcluir) {
                        botaoExcluir.addEventListener(
                            "click",
                            async () => {
                                const tituloLivro =
                                    livro.titulo ||
                                    "Livro sem título";

                                const confirmar =
                                    window.confirm(
                                        `Deseja excluir o livro "${tituloLivro}"? Essa ação não pode ser desfeita.`
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
                                            "livros",
                                            livroId
                                        )
                                    );

                                    if (
                                        livroEmEdicaoId ===
                                        livroId
                                    ) {
                                        livroEmEdicaoId =
                                            null;

                                        capaAtualLivroEmEdicao =
                                            capaPadrao;

                                        formLivro?.reset();
                                    }

                                    mostrarMensagem(
                                        "Livro excluído com sucesso!"
                                    );

                                    await carregarLivros();

                                    await carregarDadosPainel();

                                } catch (erro) {
                                    console.error(
                                        "Erro ao excluir livro:",
                                        erro
                                    );

                                    mostrarMensagem(
                                        "Não foi possível excluir o livro.",
                                        "erro"
                                    );

                                    botaoExcluir.disabled =
                                        false;

                                    botaoExcluir.textContent =
                                        "Excluir";
                                }
                            }
                        );
                    }

                    listaLivros.appendChild(
                        card
                    );
                }

                if (seletorLivros) {
                    const opcao =
                        document.createElement(
                            "option"
                        );

                    opcao.value =
                        livroId;

                    opcao.textContent =
                        livro.titulo ||
                        "Livro sem título";

                    seletorLivros.appendChild(
                        opcao
                    );
                }
            }
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar livros:",
            erro
        );

        if (listaLivros) {
            listaLivros.innerHTML = `
                <p>
                    Não foi possível carregar os livros.
                </p>
            `;
        }

        if (seletorLivros) {
            seletorLivros.innerHTML = `
                <option value="">
                    Erro ao carregar livros
                </option>
            `;
        }
    }
}


// ==============================
// MENU DO PAINEL
// ==============================

const botoesMenu =
    document.querySelectorAll(
        ".menu-item"
    );

const secoes =
    document.querySelectorAll(
        ".painel-secao"
    );

function abrirSecao(id) {
    secoes.forEach((secao) => {
        secao.classList.remove(
            "ativa"
        );
    });

    botoesMenu.forEach((botao) => {
        botao.classList.remove(
            "ativo"
        );
    });

    const secaoEscolhida =
        document.getElementById(id);

    const botaoEscolhido =
        document.querySelector(
            `[data-secao="${id}"]`
        );

    if (secaoEscolhida) {
        secaoEscolhida.classList.add(
            "ativa"
        );
    }

    if (botaoEscolhido) {
        botaoEscolhido.classList.add(
            "ativo"
        );
    }
}


botoesMenu.forEach((botao) => {
    botao.addEventListener(
        "click",
        () => {
            abrirSecao(
                botao.dataset.secao
            );
        }
    );
});


document
    .querySelectorAll(
        "[data-abrir-secao]"
    )
    .forEach((botao) => {
        botao.addEventListener(
            "click",
            () => {
                abrirSecao(
                    botao.dataset
                        .abrirSecao
                );
            }
        );
    });


// ==============================
// CONTADOR DE PALAVRAS
// ==============================

const textoCapitulo =
    document.getElementById(
        "textoCapitulo"
    );

const contador =
    document.getElementById(
        "contadorPalavras"
    );

if (textoCapitulo && contador) {
    textoCapitulo.addEventListener(
        "input",
        () => {
            const texto =
                textoCapitulo.value
                    .trim();

            const quantidade =
                texto
                    ? texto.split(/\s+/)
                        .length
                    : 0;

            contador.textContent =
                `${quantidade} palavras`;
        }
    );
}


// ==============================
// FORMULÁRIO DE LIVRO
// ==============================

const formLivro =
    document.getElementById(
        "formLivro"
    );

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
                    .getElementById(
                        "tituloLivro"
                    )
                    .value
                    .trim();

            const autor =
                document
                    .getElementById(
                        "autorLivro"
                    )
                    .value
                    .trim();

            const sinopse =
                document
                    .getElementById(
                        "sinopseLivro"
                    )
                    .value
                    .trim();

            const genero =
                document
                    .getElementById(
                        "generoLivro"
                    )
                    .value;

            const status =
                document
                    .getElementById(
                        "statusLivro"
                    )
                    .value;

            const campoCapa =
                document.getElementById(
                    "capaLivro"
                );

            const arquivoCapa =
                campoCapa?.files?.[0] ||
                null;

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

            botaoSalvar.disabled =
                true;

            botaoSalvar.textContent =
                arquivoCapa
                    ? "Enviando capa..."
                    : livroEmEdicaoId
                        ? "Atualizando livro..."
                        : "Salvando livro...";

            try {
                let urlCapa =
                    livroEmEdicaoId
                        ? capaAtualLivroEmEdicao
                        : capaPadrao;

                if (arquivoCapa) {
                    urlCapa =
                        await enviarCapaCloudinary(
                            arquivoCapa
                        );

                    botaoSalvar.textContent =
                        livroEmEdicaoId
                            ? "Atualizando livro..."
                            : "Salvando livro...";
                }

                const dadosLivro = {
                    titulo,
                    autor,
                    sinopse,
                    genero,
                    status,
                    capa: urlCapa,

                    atualizadoEm:
                        serverTimestamp()
                };

                if (livroEmEdicaoId) {
                    await updateDoc(
                        doc(
                            db,
                            "livros",
                            livroEmEdicaoId
                        ),
                        dadosLivro
                    );

                    mostrarMensagem(
                        "Livro atualizado com sucesso!"
                    );

                } else {
                    await addDoc(
                        collection(
                            db,
                            "livros"
                        ),
                        {
                            ...dadosLivro,

                            criadoPor:
                                auth.currentUser
                                    .uid,

                            criadoEm:
                                serverTimestamp()
                        }
                    );

                    mostrarMensagem(
                        "Livro e capa salvos com sucesso!"
                    );
                }

                formLivro.reset();

                const campoAutor =
                    document.getElementById(
                        "autorLivro"
                    );

                if (campoAutor) {
                    campoAutor.value =
                        "Rd Sebastião";
                }

                livroEmEdicaoId =
                    null;

                capaAtualLivroEmEdicao =
                    capaPadrao;

                await carregarLivros();

                await carregarDadosPainel();

                abrirSecao("livros");

            } catch (erro) {
                console.error(
                    "Erro ao salvar livro:",
                    erro
                );

                mostrarMensagem(
                    erro.message ||
                    "Não foi possível salvar o livro.",
                    "erro"
                );

            } finally {
                botaoSalvar.disabled =
                    false;

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
    document.getElementById(
        "formCapitulo"
    );

if (formCapitulo) {
    formCapitulo.addEventListener(
        "submit",
        async (evento) => {
            evento.preventDefault();

            const botaoSalvar =
                formCapitulo.querySelector(
                    'button[type="submit"]'
                );

            const seletorLivro =
                document.getElementById(
                    "livroCapitulo"
                );

            const livroId =
                seletorLivro.value;

            const livroTitulo =
                seletorLivro.options[
                    seletorLivro
                        .selectedIndex
                ]?.textContent.trim();

            const numero =
                Number(
                    document
                        .getElementById(
                            "numeroCapitulo"
                        )
                        .value
                );

            const titulo =
                document
                    .getElementById(
                        "tituloCapitulo"
                    )
                    .value
                    .trim();

            const resumo =
                document
                    .getElementById(
                        "resumoCapitulo"
                    )
                    .value
                    .trim();

            const texto =
                document
                    .getElementById(
                        "textoCapitulo"
                    )
                    .value
                    .trim();

            const status =
                document
                    .getElementById(
                        "statusCapitulo"
                    )
                    .value;

            if (
                !livroId ||
                !numero ||
                numero < 1 ||
                !titulo ||
                !texto
            ) {
                mostrarMensagem(
                    "Preencha todos os campos obrigatórios.",
                    "erro"
                );

                return;
            }

            if (!auth.currentUser) {
                mostrarMensagem(
                    "Sua sessão expirou. Entre novamente.",
                    "erro"
                );

                return;
            }

            botaoSalvar.disabled = true;

            botaoSalvar.textContent =
                "Salvando capítulo...";

            try {
                await addDoc(
                    collection(
                        db,
                        "capitulos"
                    ),
                    {
                        livroId,
                        livroTitulo,
                        numero,
                        titulo,
                        resumo,
                        texto,
                        status,

                        criadoPor:
                            auth.currentUser
                                .uid,

                        criadoEm:
                            serverTimestamp(),

                        atualizadoEm:
                            serverTimestamp()
                    }
                );

                mostrarMensagem(
                    "Capítulo salvo no Firebase com sucesso!"
                );

                formCapitulo.reset();

                if (contador) {
                    contador.textContent =
                        "0 palavras";
                }

                await carregarDadosPainel();

            } catch (erro) {
                console.error(
                    "Erro ao salvar capítulo:",
                    erro
                );

                mostrarMensagem(
                    "Não foi possível salvar o capítulo.",
                    "erro"
                );

            } finally {
                botaoSalvar.disabled =
                    false;

                botaoSalvar.textContent =
                    "Salvar capítulo";
            }
        }
    );
}


// ==============================
// VERIFICAR LOGIN
// ==============================

onAuthStateChanged(
    auth,
    async (usuario) => {
        if (!usuario) {
            window.location.href =
                "login.html";

            return;
        }

        console.log(
            "Administrador conectado:",
            usuario.email
        );

        await Promise.all([
            carregarLivros(),
            carregarDadosPainel()
        ]);
    }
);


// ==============================
// BOTÃO SAIR
// ==============================

const botaoSair =
    document.getElementById(
        "botaoSair"
    );

if (botaoSair) {
    botaoSair.addEventListener(
        "click",
        async () => {
            const confirmarSaida =
                confirm(
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