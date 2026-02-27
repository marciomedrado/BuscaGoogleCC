// A API do Wikimedia Commons não precisa de chaves, é 100% gratuita.
// E todas as imagens obrigatoriamente possuem licenças Creative Commons ou Domínio Público.

let currentQuery = '';
let currentOffset = 0;
let imageQueue = [];
let importedTerms = []; // Structure: { text: "term", status: "idle" | "searched" | "queued" }

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

// Clear buttons
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const clearTermsBtn = document.getElementById('clearTermsBtn');
const clearQueueBtn = document.getElementById('clearQueueBtn');

searchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
});

clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentQuery = '';
    document.getElementById('results').innerHTML = '<div class="placeholder-msg">Busca limpa. Busque algo ou importe uma lista de termos.</div>';
    document.getElementById('loadMoreContainer').style.display = 'none';
});

clearTermsBtn.addEventListener('click', () => {
    if (confirm("Deseja listar todos os termos importados?")) {
        importedTerms = [];
        renderTerms();
    }
});

clearQueueBtn.addEventListener('click', () => {
    if (confirm("Deseja esvaziar a fila de download?")) {
        imageQueue = [];
        importedTerms.forEach(t => t.status = t.status === 'queued' ? 'searched' : t.status);
        renderTerms();
        updateQueueUI();

        // Reset added buttons in the grid if any
        document.querySelectorAll('.queue-btn.added').forEach(btn => {
            btn.classList.remove('added');
            btn.innerText = 'Adicionar à Fila';
        });
    }
});

function startSearch() {
    const query = document.getElementById('searchInput').value;
    if (query) {
        currentQuery = query;
        currentOffset = 0;
        document.getElementById('loadMoreContainer').style.display = 'none';

        // Match term from imported list if it exists and update status
        const termIndex = importedTerms.findIndex(t => t.text.toLowerCase() === query.toLowerCase());
        if (termIndex !== -1 && importedTerms[termIndex].status === 'idle') {
            importedTerms[termIndex].status = 'searched';
            renderTerms();
        }

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

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=16&gsroffset=${offset}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=400&format=json&origin=*`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);
            const images = pages.map(page => {
                const info = page.imageinfo ? page.imageinfo[0] : {};
                const license = info.extmetadata?.LicenseShortName?.value || 'CC BY-SA';
                const cleanTitle = page.title.replace(/^File:/, '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
                return { link: info.url, thumb: info.thumburl || info.url, title: cleanTitle, license: license };
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
        const safeTitle = img.title.replace(/'/g, "\\'");
        const safeQuery = currentQuery.replace(/'/g, "\\'");
        card.className = 'image-card';
        card.innerHTML = `
            <div class="image-container">
                <span class="cc-badge" title="${img.license}">${img.license.length > 12 ? 'CC' : img.license}</span>
                <img src="${img.thumb}" alt="${img.title}" loading="lazy">
            </div>
            <div class="card-info">
                <h3 title="${img.title}">${img.title}</h3>
                <div class="actions-container">
                    <button class="queue-btn ${isAdded ? 'added' : ''}" onclick="toggleQueue(this, '${img.link}', '${img.thumb}', '${safeTitle}', '${safeQuery}')">
                        ${isAdded ? 'No Carrinho' : 'Adicionar à Fila'}
                    </button>
                    <button class="direct-download-btn" onclick="downloadImage('${img.link}', '${safeTitle}')" title="Baixar Imagem">
                        <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                    </button>
                </div>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}

// Gerenciamento da Fila
function toggleQueue(btn, link, thumb, title, term) {
    const index = imageQueue.findIndex(item => item.link === link);
    if (index === -1) {
        imageQueue.push({ link, thumb, title, term });
        btn.classList.add('added');
        btn.innerText = 'No Carrinho';

        // Mark term as queued
        const termIndex = importedTerms.findIndex(t => t.text.toLowerCase() === term.toLowerCase());
        if (termIndex !== -1) {
            importedTerms[termIndex].status = 'queued';
            renderTerms();
        }
    } else {
        imageQueue.splice(index, 1);
        btn.classList.remove('added');
        btn.innerText = 'Adicionar à Fila';

        checkTermQueueStatus(term);
    }
    updateQueueUI();
}

function checkTermQueueStatus(term) {
    const termIndex = importedTerms.findIndex(t => t.text.toLowerCase() === term.toLowerCase());
    if (termIndex !== -1) {
        const stillHasImagesQueued = imageQueue.some(img => img.term.toLowerCase() === term.toLowerCase());
        importedTerms[termIndex].status = stillHasImagesQueued ? 'queued' : 'searched';
        renderTerms();
    }
}

function updateQueueUI() {
    const queueItems = document.getElementById('queueItems');
    const queueCount = document.getElementById('queueCount');
    const zipBtn = document.getElementById('downloadZipBtn');

    queueCount.innerText = imageQueue.length;
    zipBtn.disabled = imageQueue.length === 0;
    clearQueueBtn.style.display = imageQueue.length > 0 ? 'block' : 'none';

    queueItems.innerHTML = '';
    imageQueue.forEach((img, index) => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
            <img src="${img.thumb}" alt="${img.title}">
            <div class="queue-info">
                <div class="queue-title">${img.title}</div>
                <div class="queue-term">Termo: ${img.term}</div>
            </div>
            <button class="remove-from-queue" onclick="removeFromQueue(${index})">×</button>
        `;
        queueItems.appendChild(item);
    });
}

function removeFromQueue(index) {
    const item = imageQueue[index];
    const link = item.link;
    const term = item.term;
    imageQueue.splice(index, 1);

    checkTermQueueStatus(term);
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
            const originalName = img.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            const prefix = (i + 1).toString().padStart(3, '0');
            const name = `${prefix}_${originalName}.jpg`;
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
    const uniqueTerms = [...new Set(terms.map(t => t.toString().trim()).filter(t => t))];

    uniqueTerms.forEach(termText => {
        if (!importedTerms.some(t => t.text === termText)) {
            importedTerms.push({ text: termText, status: 'idle' });
        }
    });

    renderTerms();
}

function renderTerms() {
    const termList = document.getElementById('termList');
    termList.innerHTML = '';

    clearTermsBtn.style.display = importedTerms.length > 0 ? 'inline-block' : 'none';

    importedTerms.forEach((termObj, index) => {
        const item = document.createElement('div');
        item.className = `term-item status-${termObj.status}`;
        item.innerHTML = `
            <span contenteditable="true" onblur="updateTermText(${index}, this.innerText)" spellcheck="false" title="Clique para editar">${termObj.text}</span>
            <div class="term-actions">
                <button class="compact-btn" onclick="executeTermSearch(${index})">Buscar</button>
                <button class="remove-term-btn" onclick="removeTerm(${index})">×</button>
            </div>
        `;
        termList.appendChild(item);
    });
}

function updateTermText(index, newText) {
    newText = newText.trim();
    if (newText) {
        importedTerms[index].text = newText;
    } else {
        removeTerm(index);
    }
}

function removeTerm(index) {
    importedTerms.splice(index, 1);
    renderTerms();
}

function executeTermSearch(index) {
    const termObj = importedTerms[index];
    if (termObj.status === 'idle') {
        termObj.status = 'searched';
    }
    renderTerms();
    document.getElementById('searchInput').value = termObj.text;
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
