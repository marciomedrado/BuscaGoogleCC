// Configurações - VOCÊ PRECISARÁ PREENCHER ESTAS DUAS VARIÁVEIS
const API_KEY = 'AIzaSyDcjPlLkhS_-MVawxBko237vfbIxzbBNSQ';
const SEARCH_ENGINE_ID = '727ab586a542842ea';

document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value;
    if (query) {
        performSearch(query);
    }
});

async function performSearch(query) {
    const resultsContainer = document.getElementById('results');

    if (API_KEY === 'SUA_API_KEY_AQUI' || SEARCH_ENGINE_ID === 'SEU_CX_ID_AQUI') {
        resultsContainer.innerHTML = '<div class="placeholder-msg" style="color: #f87171;">⚠️ Erro: Você precisa configurar sua API Key e o Search Engine ID no arquivo app.js</div>';
        return;
    }

    // Mostrar Skeletons enquanto carrega
    resultsContainer.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'image-card skeleton';
        skeletonCard.style.height = '350px';
        resultsContainer.appendChild(skeletonCard);
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&rights=cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log('Resultados da API do Google:', data);

        if (data.error) {
            console.error('Erro da API do Google:', data.error.message);
            resultsContainer.innerHTML = `<div class="placeholder-msg" style="color: #f87171;">❌ Erro da API: ${data.error.message}</div>`;
            return;
        }

        if (data.items && data.items.length > 0) {
            displayResults(data.items);
        } else {
            console.log('Nenhum item retornado. Verifique se o "Image Search" está ativado no painel do Programmable Search Engine.');
            resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem encontrada. Verifique se a "Pesquisa de Imagens" está ativada no seu painel do Google.</div>';
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = '<div class="placeholder-msg" style="color: #f87171;">❌ Erro ao conectar com a API do Google. Verifique o console.</div>';
    }
}

function displayResults(images) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    images.forEach(img => {
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
            <div class="image-container">
                <span class="cc-badge">CC</span>
                <img src="${img.link}" alt="${img.title}" loading="lazy">
            </div>
            <div class="card-info">
                <h3>${img.title}</h3>
                <a href="${img.link}" target="_blank" class="download-btn">Ver Original</a>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}
