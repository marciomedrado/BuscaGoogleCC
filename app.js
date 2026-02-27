// A API do Wikimedia Commons não precisa de chaves, é 100% gratuita.
// E todas as imagens obrigatoriamente possuem licenças Creative Commons ou Domínio Público.

document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value;
    if (query) {
        performSearch(query);
    }
});

async function performSearch(query) {
    const resultsContainer = document.getElementById('results');

    // Mostrar Skeletons enquanto carrega
    resultsContainer.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const skeletonCard = document.createElement('div');
        skeletonCard.className = 'image-card skeleton';
        skeletonCard.style.height = '350px';
        resultsContainer.appendChild(skeletonCard);
    }

    // Usando Wikimedia Commons API: Busca em um repositório gigantesco e exclusivo de imagens livres (CC e Domínio Público)
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log('Resultados da API do Wikimedia:', data);

        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);

            // Formatando os resultados para o nosso layout
            const images = pages.map(page => {
                const info = page.imageinfo ? page.imageinfo[0] : {};
                const license = info.extmetadata?.LicenseShortName?.value || 'CC BY-SA';
                // Limpar o título (Tirar 'File:' e a extensão)
                const cleanTitle = page.title.replace(/^File:/, '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');

                return {
                    link: info.url,
                    title: cleanTitle,
                    license: license
                };
            }).filter(img => img.link && !img.link.endsWith('.ogg') && !img.link.endsWith('.webm')); // Filtrar áudio/vídeo

            if (images.length > 0) {
                displayResults(images);
            } else {
                resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem adequada encontrada para este termo.</div>';
            }
        } else {
            console.log('Nenhum item retornado.');
            resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem encontrada. Tente usar outras palavras-chave, como termos em inglês (ex: "nature", "city").</div>';
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        resultsContainer.innerHTML = '<div class="placeholder-msg" style="color: #f87171;">❌ Erro ao conectar com a API. Verifique sua conexão.</div>';
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
                <span class="cc-badge" title="${img.license}">${img.license.length > 12 ? 'CC' : img.license}</span>
                <img src="${img.link}" alt="${img.title}" loading="lazy">
            </div>
            <div class="card-info">
                <h3 title="${img.title}">${img.title}</h3>
                <a href="${img.link}" target="_blank" class="download-btn">Ver / Baixar Original</a>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}
