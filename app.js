// A API do Wikimedia Commons não precisa de chaves, é 100% gratuita.
// E todas as imagens obrigatoriamente possuem licenças Creative Commons ou Domínio Público.

let currentQuery = '';
let currentOffset = 0;
let imageQueue = [];

// Event Listeners
document.getElementById('searchBtn').addEventListener('click', startSearch);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') startSearch();
});

document.getElementById('loadMoreBtn').addEventListener('click', () => {
    if (currentQuery) {
        currentOffset += 16;
        performSearch(currentQuery, currentOffset, true);
    }
});

document.getElementById('fileInput').addEventListener('change', handleFileUpload);
document.getElementById('downloadZipBtn').addEventListener('click', downloadQueueAsZip);

function startSearch() {
    const query = document.getElementById('searchInput').value;
    if (query) {
        currentQuery = query;
        currentOffset = 0;
        document.getElementById('loadMoreContainer').style.display = 'none';
        performSearch(query, currentOffset);
    }
}

// Busca e Renderização
async function performSearch(query, offset = 0, isLoadMore = false) {
    const resultsContainer = document.getElementById('results');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (isLoadMore) {
        loadMoreBtn.innerText = 'Carregando...';
        loadMoreBtn.disabled = true;
    } else {
        resultsContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const skeletonCard = document.createElement('div');
            skeletonCard.className = 'image-card skeleton';
            skeletonCard.style.height = (250 + Math.random() * 200) + 'px';
            resultsContainer.appendChild(skeletonCard);
        }
    }

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=16&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata&format=json&origin=*`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);
            const images = pages.map(page => {
                const info = page.imageinfo ? page.imageinfo[0] : {};
                const license = info.extmetadata?.LicenseShortName?.value || 'CC BY-SA';
                const cleanTitle = page.title.replace(/^File:/, '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
                return { link: info.url, title: cleanTitle, license: license };
            }).filter(img => img.link && !img.link.endsWith('.ogg') && !img.link.endsWith('.webm'));

            if (images.length > 0) {
                displayResults(images, isLoadMore);
                document.getElementById('loadMoreContainer').style.display = 'block';
            } else if (!isLoadMore) {
                resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem adequada encontrada.</div>';
            }
        } else if (!isLoadMore) {
            resultsContainer.innerHTML = '<div class="placeholder-msg">Nenhuma imagem encontrada.</div>';
            document.getElementById('loadMoreContainer').style.display = 'none';
        }
    } catch (error) {
        if (!isLoadMore) {
            resultsContainer.innerHTML = '<div class="placeholder-msg" style="color: #f87171;">Erro na conexão com a API.</div>';
        }
    }

    if (isLoadMore) {
        loadMoreBtn.innerText = '+ Imagens';
        loadMoreBtn.disabled = false;
    }
}

function displayResults(images, append = false) {
    const resultsContainer = document.getElementById('results');
    if (!append) resultsContainer.innerHTML = '';

    images.forEach(img => {
        const isAdded = imageQueue.some(item => item.link === img.link);
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
                    <button class="queue-btn ${isAdded ? 'added' : ''}" onclick="toggleQueue(this, '${img.link}', '${img.title.replace(/'/g, "\\'")}')">
                        ${isAdded ? 'No Carrinho' : 'Adicionar à Fila'}
                    </button>
                    <button class="direct-download-btn" onclick="downloadImage('${img.link}', '${img.title.replace(/'/g, "\\'")}')" title="Baixar Imagem">
                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                </div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}

// Gerenciamento da Fila
function toggleQueue(btn, link, title) {
    const index = imageQueue.findIndex(item => item.link === link);
    if (index === -1) {
        imageQueue.push({ link, title });
        btn.classList.add('added');
        btn.innerText = 'No Carrinho';
    } else {
        imageQueue.splice(index, 1);
        btn.classList.remove('added');
        btn.innerText = 'Adicionar à Fila';
    }
    updateQueueUI();
}

function updateQueueUI() {
    const queueItems = document.getElementById('queueItems');
    const queueCount = document.getElementById('queueCount');
    const zipBtn = document.getElementById('downloadZipBtn');

    queueCount.innerText = imageQueue.length;
    zipBtn.disabled = imageQueue.length === 0;

    queueItems.innerHTML = '';
    imageQueue.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
            <img src="${img.link}" alt="${img.title}">
            <button class="remove-from-queue" onclick="removeFromQueue(${index})">×</button>
        `;
        queueItems.appendChild(item);
    });
}

function removeFromQueue(index) {
    const link = imageQueue[index].link;
    imageQueue.splice(index, 1);
    updateQueueUI();

    // Atualizar botões na grade se visíveis
    document.querySelectorAll('.queue-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(link)) {
            btn.classList.remove('added');
            btn.innerText = 'Adicionar à Fila';
        }
    });
}

// Download de Imagens e ZIP
async function downloadImage(url, title) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.jpg`;
        a.click();
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) { alert('Erro no download direto.'); }
}

async function downloadQueueAsZip() {
    const zip = new JSZip();
    const btn = document.getElementById('downloadZipBtn');
    const originalText = btn.innerText;
    btn.innerText = 'Gerando ZIP...';
    btn.disabled = true;

    try {
        for (let i = 0; i < imageQueue.length; i++) {
            const img = imageQueue[i];
            const name = `${img.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase()}.jpg`;
            const response = await fetch(img.link);
            const blob = await response.blob();
            zip.file(name, blob);
        }
        const content = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `busca_google_cc_${new Date().getTime()}.zip`;
        a.click();
    } catch (e) { alert('Erro ao gerar o ZIP.'); }

    btn.innerText = originalText;
    btn.disabled = false;
}

// Importação de Termos
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const extension = file.name.split('.').pop().toLowerCase();
    const reader = new FileReader();

    reader.onload = function (event) {
        if (extension === 'xlsx') {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            processTerms(json.flat().filter(t => t));
        } else if (extension === 'docx' || extension === 'doc') {
            mammoth.extractRawText({ arrayBuffer: event.target.result })
                .then(result => processTerms(result.value.split('\n')));
        } else {
            // txt, md, csv
            const text = event.target.result;
            processTerms(text.split(/\r?\n|;/));
        }
    };

    if (extension === 'xlsx' || extension === 'docx' || extension === 'doc') {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

function processTerms(terms) {
    const termList = document.getElementById('termList');
    termList.innerHTML = '';

    const uniqueTerms = [...new Set(terms.map(t => t.toString().trim()).filter(t => t))];

    uniqueTerms.forEach(term => {
        const item = document.createElement('div');
        item.className = 'term-item';
        item.innerHTML = `
            <span>${term}</span>
            <button class="compact-btn" onclick="executeTermSearch('${term.replace(/'/g, "\\'")}')">Buscar</button>
        `;
        termList.appendChild(item);
    });
}

function executeTermSearch(term) {
    document.getElementById('searchInput').value = term;
    startSearch();
}

// Botão Voltar ao Topo
const backToTopBtn = document.getElementById('backToTop');
window.onscroll = function () {
    if (document.documentElement.scrollTop > 500) {
        backToTopBtn.style.display = "flex";
    } else {
        backToTopBtn.style.display = "none";
    }
};
backToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
