// A API do Wikimedia Commons não precisa de chaves, é 100% gratuita.
// E todas as imagens obrigatoriamente possuem licenças Creative Commons ou Domínio Público.

let currentQuery = '';
let currentOffset = 0;
let imageQueue = [];
let importedTerms = []; // Structure: { text: "term", status: "idle" | "searched" | "queued" }
let sourceTermIndex = -1; // Rastreia qual termo importado originou a busca atual

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
document.getElementById('startNumInput').addEventListener('input', () => {
    updateQueueUI();
});

// Backup e Restauração
document.getElementById('exportBackupBtn').addEventListener('click', exportBackup);
document.getElementById('importBackupBtn').addEventListener('click', () => {
    document.getElementById('backupInput').click();
});
document.getElementById('backupInput').addEventListener('change', handleBackupImport);

// Clear buttons
document.getElementById('toggleReviewModeBtn').addEventListener('click', enterReviewMode);
document.getElementById('addTermTopBtn').addEventListener('click', () => addTermAtPosition(0));
document.getElementById('startTermNumInput').addEventListener('input', renderTerms);

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
    sourceTermIndex = -1;
    document.getElementById('results').innerHTML = '<div class="placeholder-msg">Busca limpa. Busque algo ou importe uma lista de termos.</div>';
    document.getElementById('loadMoreContainer').style.display = 'none';
    renderTerms();
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
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
        currentQuery = query;
        currentOffset = 0;
        document.getElementById('loadMoreContainer').style.display = 'none';

        // Se houver vínculo de origem, mantemos ele independentemente do texto de busca
        // A menos que o campo de busca seja limpo manualmente via botão X (já tratado no clearSearchBtn)

        // Se não houver vínculo, tentamos encontrar um novo match exato na lista
        if (sourceTermIndex === -1) {
            const termIdx = importedTerms.findIndex(t => t.text.toLowerCase() === query.toLowerCase());
            if (termIdx !== -1) {
                sourceTermIndex = termIdx;
            }
        }

        // Atualiza status se encontrarmos um termo correspondente
        if (sourceTermIndex !== -1 && importedTerms[sourceTermIndex].status === 'idle') {
            importedTerms[sourceTermIndex].status = 'searched';
        }

        renderTerms();
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

    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=16&gsroffset=${offset}&prop=imageinfo&iiprop=url|descriptionurl|extmetadata&iiurlwidth=400&format=json&origin=*`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.query && data.query.pages) {
            const pages = Object.values(data.query.pages);
            const images = pages.map(page => {
                const info = page.imageinfo ? page.imageinfo[0] : {};
                const license = info.extmetadata?.LicenseShortName?.value || 'CC BY-SA';
                const cleanTitle = page.title.replace(/^File:/, '').replace(/\.[^/.]+$/, "").replace(/_/g, ' ');
                return {
                    link: info.url,
                    thumb: info.thumburl || info.url,
                    title: cleanTitle,
                    license: license,
                    source: info.descriptionurl || `https://commons.wikimedia.org/wiki/${page.title}`
                };
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
                    <button class="source-link-btn" onclick="window.open('${img.source}', '_blank')" title="Ver Origem">
                        <svg viewBox="0 0 24 24"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
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
    const searchInputVal = document.getElementById('searchInput').value.trim();

    // O termo ativo é o que está no input no momento do clique (considerando refinamento)
    const activeTermText = searchInputVal || term;

    if (index === -1) {
        imageQueue.push({ link, thumb, title, term: activeTermText });
        btn.classList.add('added');
        btn.innerText = 'No Carrinho';

        // Prioridade 1: Usar o vínculo de origem (mesmo que a busca tenha mudado)
        if (sourceTermIndex !== -1) {
            importedTerms[sourceTermIndex].status = 'queued';
            renderTerms();
        } else {
            // Prioridade 2: Match exato com algum termo da lista
            const termIndex = importedTerms.findIndex(t => t.text.toLowerCase() === activeTermText.toLowerCase());
            if (termIndex !== -1) {
                importedTerms[termIndex].status = 'queued';
                renderTerms();
            }
        }
    } else {
        imageQueue.splice(index, 1);
        btn.classList.remove('added');
        btn.innerText = 'Adicionar à Fila';

        checkTermQueueStatus(activeTermText);
        // Se houver vínculo de origem, checamos ele também
        if (sourceTermIndex !== -1) {
            checkTermQueueStatus(importedTerms[sourceTermIndex].text);
        }
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

    const startNum = parseInt(document.getElementById('startNumInput').value) || 1;
    queueItems.innerHTML = '';
    imageQueue.forEach((img, index) => {
        if (!img) return; // Pula slots vazios
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.setAttribute('draggable', 'true');
        item.dataset.index = index;

        // Drag events
        item.ondragstart = (e) => { e.dataTransfer.setData('text/plain', index); item.classList.add('dragging'); };
        item.ondragend = () => { item.classList.remove('dragging'); };
        item.ondragover = (e) => { e.preventDefault(); item.classList.add('drag-over'); };
        item.ondragleave = () => { item.classList.remove('drag-over'); };
        item.ondrop = (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const toIndex = index;
            if (fromIndex !== toIndex) {
                const movedItem = imageQueue.splice(fromIndex, 1)[0];
                imageQueue.splice(toIndex, 0, movedItem);
                updateQueueUI();
            }
        };

        const prefix = (index + startNum).toString().padStart(3, '0');
        item.innerHTML = `
            <div class="queue-prefix">${prefix}</div>
            <img src="${img.thumb}" alt="${img.title}">
            <div class="queue-info">
                <div class="queue-title">${img.title}</div>
                <div class="queue-term">Termo: ${img.term}</div>
            </div>
            <div class="drag-handle" title="Arraste para mover">⋮⋮</div>
            <button class="remove-from-queue" onclick="removeFromQueue(${index})">×</button>
        `;
        queueItems.appendChild(item);
    });

    // Atualiza a numeração nos termos importados
    renderTerms();
}

function enterReviewMode() {
    const container = document.getElementById('reviewContainer');
    const startNum = parseInt(document.getElementById('startNumInput').value) || 1;

    document.body.classList.add('review-active');
    container.innerHTML = `
        <div class="review-header-row">
            <h2>Modo de Conferência Lado a Lado</h2>
            <button class="btn-exit-review" onclick="exitReviewMode()">Sair do Modo Revisão</button>
        </div>
        <div class="review-table">
            ${importedTerms.map((termObj, index) => {
        const termNum = (index + startNum).toString().padStart(3, '0');
        const queueImg = imageQueue[index];

        return `
                <div class="review-row">
                    <div class="review-cell cell-num">${termNum}</div>
                    <div class="review-cell cell-term">${termObj.text}</div>
                    <div class="review-cell cell-image" 
                         ${queueImg ? `draggable="true" ondragstart="handleReviewDragStart(event, ${index})"` : ''}
                         ondragover="event.preventDefault(); this.style.background='rgba(56, 189, 248, 0.1)'"
                         ondragleave="this.style.background=''"
                         ondrop="handleReviewDrop(event, ${index})">
                        ${queueImg ? `
                            <img src="${queueImg.thumb}" alt="" title="Arraste para trocar de posição">
                            <div style="font-size: 0.6rem; color: var(--text-secondary); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${queueImg.title}
                            </div>
                        ` : '<div style="color: #475569; font-size: 0.8rem; text-align: center; border: 1px dashed #475569; padding: 10px; border-radius: 5px;">(Vazio)</div>'}
                    </div>
                    <div class="review-cell cell-actions" style="color: ${queueImg ? '#22c55e' : '#475569'}">
                        ${queueImg ? '✓ OK' : '--'}
                    </div>
                </div>
                `;
    }).join('')}
        </div>
    `;
}

function handleReviewDragStart(e, index) {
    e.dataTransfer.setData('reviewImageIndex', index);
}

function handleReviewDrop(e, toIndex) {
    e.preventDefault();
    e.currentTarget.style.background = '';
    const fromIndex = parseInt(e.dataTransfer.getData('reviewImageIndex'));

    if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        // Swap implementation
        const temp = imageQueue[fromIndex];
        imageQueue[fromIndex] = imageQueue[toIndex];
        imageQueue[toIndex] = temp;

        // Atualiza o vínculo do termo para que os status (verde/azul) fiquem corretos na nova posição
        if (imageQueue[fromIndex]) imageQueue[fromIndex].term = importedTerms[fromIndex].text;
        if (imageQueue[toIndex]) imageQueue[toIndex].term = importedTerms[toIndex].text;

        // Atualiza a UI geral e a própria revisão
        updateQueueUI();
        enterReviewMode();
    }
}

function exitReviewMode() {
    document.body.classList.remove('review-active');
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
    const startNumInput = document.getElementById('startNumInput');
    const startNum = parseInt(startNumInput.value) || 1;
    const originalText = btn.innerText;
    btn.innerText = 'Gerando ZIP...';
    btn.disabled = true;

    try {
        for (let i = 0; i < imageQueue.length; i++) {
            const img = imageQueue[i];
            if (!img) continue; // Pula se não houver imagem nessa posição
            const originalName = img.title.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            const prefix = (i + startNum).toString().padStart(3, '0');
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

    const startTermNum = parseInt(document.getElementById('startTermNumInput').value) || 1;
    clearTermsBtn.style.display = importedTerms.length > 0 ? 'inline-block' : 'none';

    importedTerms.forEach((termObj, index) => {
        // Marcador para adicionar entre
        const spacer = document.createElement('div');
        spacer.className = 'add-term-between';
        spacer.onclick = () => addTermAtPosition(index);
        termList.appendChild(spacer);

        const item = document.createElement('div');
        const isActive = index === sourceTermIndex;
        const termNum = (index + startTermNum).toString().padStart(3, '0');

        // Encontra a primeira posição deste termo na fila
        const firstQueueIdx = imageQueue.findIndex(img => img.term.toLowerCase() === termObj.text.toLowerCase());
        const startNum = parseInt(document.getElementById('startNumInput').value) || 1;
        const posLabel = firstQueueIdx !== -1 ? `#${(firstQueueIdx + startNum).toString().padStart(3, '0')}` : '';

        item.className = `term-item status-${termObj.status} ${isActive ? 'active-source' : ''}`;
        item.setAttribute('draggable', 'true');

        // Term drag events
        item.ondragstart = (e) => { e.dataTransfer.setData('termIndex', index); item.classList.add('dragging'); };
        item.ondragend = () => { item.classList.remove('dragging'); };
        item.ondragover = (e) => { e.preventDefault(); item.classList.add('drag-over'); };
        item.ondragleave = () => { item.classList.remove('drag-over'); };
        item.ondrop = (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            const fromIndex = parseInt(e.dataTransfer.getData('termIndex'));
            if (fromIndex !== index) {
                const moved = importedTerms.splice(fromIndex, 1)[0];
                importedTerms.splice(index, 0, moved);
                renderTerms();
            }
        };

        item.innerHTML = `
            <div class="term-index-hint">${termNum}</div>
            <div class="status-indicator" onclick="event.stopPropagation(); toggleTermStatusManual(${index})" title="Mudar status manualmente (Azul -> Verde -> Idle)">
                ${posLabel ? `<span class="pos-num">${posLabel}</span>` : ''}
            </div>
            <span contenteditable="true" onblur="updateTermText(${index}, this.innerText)" spellcheck="false" title="Clique para editar">${termObj.text}</span>
            <div class="term-actions">
                <button class="compact-btn" onclick="event.stopPropagation(); executeTermSearch(${index})">Buscar</button>
                <button class="remove-term-btn" onclick="event.stopPropagation(); removeTerm(${index})">×</button>
            </div>
        `;
        termList.appendChild(item);
    });

    // Marcador final
    const finalSpacer = document.createElement('div');
    finalSpacer.className = 'add-term-between';
    finalSpacer.onclick = () => addTermAtPosition(importedTerms.length);
    termList.appendChild(finalSpacer);
}

function addTermAtPosition(index) {
    const text = prompt("Digite o novo termo:");
    if (text && text.trim()) {
        importedTerms.splice(index, 0, { text: text.trim(), status: 'idle' });
        renderTerms();
    }
}

function toggleTermStatusManual(index) {
    const term = importedTerms[index];
    if (term.status === 'idle') {
        term.status = 'searched';
    } else if (term.status === 'searched') {
        term.status = 'queued';
    } else if (term.status === 'queued') {
        term.status = 'idle';
    }
    renderTerms();
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
    sourceTermIndex = index;
    const termObj = importedTerms[index];
    if (termObj.status === 'idle') {
        termObj.status = 'searched';
    }
    document.getElementById('searchInput').value = termObj.text;
    startSearch();
}

// Backup e Restauração
function exportBackup() {
    const backupData = {
        version: "1.0",
        date: new Date().toISOString(),
        importedTerms: importedTerms,
        imageQueue: imageQueue,
        sourceTermIndex: sourceTermIndex,
        startNum: document.getElementById('startNumInput').value
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_busca_google_cc_${new Date().getTime()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
}

function handleBackupImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        try {
            const data = JSON.parse(event.target.result);
            if (data.importedTerms && Array.isArray(data.importedTerms)) {
                importedTerms = data.importedTerms;
                imageQueue = data.imageQueue || [];
                sourceTermIndex = data.sourceTermIndex !== undefined ? data.sourceTermIndex : -1;

                if (data.startNum) {
                    document.getElementById('startNumInput').value = data.startNum;
                }

                renderTerms();
                updateQueueUI();
                alert('Backup restaurado com sucesso!');
            } else {
                alert('O arquivo de backup parece inválido.');
            }
        } catch (err) {
            alert('Erro ao processar o arquivo de backup.');
        }
        e.target.value = ''; // Reset input
    };
    reader.readAsText(file);
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
