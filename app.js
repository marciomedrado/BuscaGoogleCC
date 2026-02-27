// Configurações - VOCÊ PRECISARÁ PREENCHER ESTAS DUAS VARIÁVEIS
const API_KEY = 'AIzaSyDYOWNSNZbon21wkDvUyb2qRHaSZOrKkBQ';
const SEARCH_ENGINE_ID = 'd0ff45975366f4284';

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

    resultsContainer.innerHTML = '<div class="placeholder-msg">Buscando imagens Creative Commons para: "' + query + '"...</div>';

    const url = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query)}&searchType=image&rights=cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
            displayResults(data.items);
        } else {
            resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem encontrada com licença CC para este termo.</div>';
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
            <img src="${img.link}" alt="${img.title}" loading="lazy">
            <div class="card-info">
                <h3>${img.title.substring(0, 30)}${img.title.length > 30 ? '...' : ''}</h3>
                <a href="${img.link}" target="_blank" class="download-btn">Ver Original</a>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}
