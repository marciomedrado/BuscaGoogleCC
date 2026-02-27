// A API do Wikimedia Commons não precisa de chaves, é 100% gratuita.
// E todas as imagens obrigatoriamente possuem licenças Creative Commons ou Domínio Público.

let currentQuery = '';
let currentOffset = 0;

document.getElementById('searchBtn').addEventListener('click', startSearch);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startSearch();
});

function startSearch() {
    const query = document.getElementById('searchInput').value;
    if (query) {
        currentQuery = query;
        currentOffset = 0;
        document.getElementById('loadMoreContainer').style.display = 'none';
        performSearch(query, currentOffset);
    }
}

document.getElementById('loadMoreBtn').addEventListener('click', () => {
    if (currentQuery) {
        currentOffset += 16;
        performSearch(currentQuery, currentOffset, true);
    }
});

async function performSearch(query, offset = 0, isLoadMore = false) {
    const resultsContainer = document.getElementById('results');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (isLoadMore) {
        loadMoreBtn.innerText = 'Carregando...';
        loadMoreBtn.disabled = true;
    } else {
        resultsContainer.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'image-card skeleton';
            skeletonCard.style.height = '350px';
            resultsContainer.appendChild(skeletonCard);
        }
    }

    // Usando Wikimedia Commons API: Busca em um repositório gigantesco e exclusivo de imagens livres (CC e Domínio Público)
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=16&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

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
                displayResults(images, isLoadMore);
                document.getElementById('loadMoreContainer').style.display = 'block';
            } else {
                if (!isLoadMore) {
                    resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem adequada encontrada para este termo.</div>';
                }
                document.getElementById('loadMoreContainer').style.display = 'none';
            }
        } else {
            console.log('Nenhum item retornado.');
            if (!isLoadMore) {
                resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem encontrada. Tente usar outras palavras-chave, como termos em inglês (ex: "nature", "city").</div>';
            }
            document.getElementById('loadMoreContainer').style.display = 'none';
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        if (!isLoadMore) {
            resultsContainer.innerHTML = '<div class="placeholder-msg" style="color: #f87171;">❌ Erro ao conectar com a API. Verifique sua conexão.</div>';
        }
    }

    if (isLoadMore) {
        loadMoreBtn.innerText = '+ Imagens';
        loadMoreBtn.disabled = false;
    }
}

function displayResults(images, append = false) {
    const resultsContainer = document.getElementById('results');
    if (!append) {
        resultsContainer.innerHTML = '';
    }

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
                <div class="actions-container">
                    <a href="${img.link}" target="_blank" class="download-btn">Ver Original</a>
                    <button class="direct-download-btn" onclick="downloadImage('${img.link}', '${img.title.replace(/'/g, "\\'")}')" title="Baixar Imagem">
                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                </div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}

async function downloadImage(url, title) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        // Limpar título para usar como nome de arquivo
        const filename = title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        a.download = `${filename}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
    } catch (e) {
        console.error('Erro ao baixar:', e);
        alert('Não foi possível fazer o download direto. Use o botão "Ver Original".');
    }
}

// Botão Voltar ao Topo
const backToTopBtn = document.getElementById('backToTop');
window.onscroll = function () {
    if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
        backToTopBtn.style.display = "flex";
    } else {
        backToTopBtn.style.display = "none";
    }
};

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});
