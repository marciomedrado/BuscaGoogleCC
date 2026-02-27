document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value;
    if (query) {
        performSearch(query);
    }
});

async function performSearch(query) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '<div class="placeholder-msg">Buscando imagens Creative Commons para: "' + query + '"...</div>';
    
    // TODO: Implementar chamada para API do Google Custom Search
    console.log('Buscando por:', query);
    
    // Exemplo de como a lógica de filtragem CC será aplicada na URL da API:
    // &rights=cc_publicdomain,cc_attribute,cc_sharealike,cc_noncommercial,cc_nonderived
}
