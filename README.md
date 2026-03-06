# Busca Creative Commons

Um buscador de imagens especializado em conteúdo com licença **Creative Commons** e **Domínio Público**.

## Objetivo
Facilitar a busca por imagens que podem ser reutilizadas legalmente, utilizando a API pública do **Wikimedia Commons**.

## Tecnologias
- HTML / CSS / JavaScript
- Wikimedia Commons API (Open & Free)
- JSZip (Exportação em massa)
- XLSX / Mammoth.js (Importação de pautas)

## Como Usar
1. Abra o `index.html` em seu navegador.
2. Importe uma lista de termos (xlsx, csv, docx, txt).
3. Selecione as imagens para sua fila.
4. Organize e baixe tudo em um único arquivo ZIP numerado.

## Recursos Avançados
- **Auto-Preencher Fila**: Preencha toda a sua pauta automaticamente com um clique.
- **Localizar e Substituir**: Edite sua lista de termos rapidamente.
- **Modo Revisão**: Conferência lado a lado para garantir que cada imagem corresponde ao termo correto.
- **Alteração Rápida**: No Modo Revisão, o botão "Alterar busca" permite trocar a imagem de um termo específico sem perder o lugar.

## Deploy na Web (Vercel)

Você pode hospedar este projeto facilmente na Vercel para acessá-lo de qualquer lugar:

1. Clique no botão abaixo para clonar e fazer o deploy:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmarciomedrado%2FBuscaGoogleCC.git)

2. Ou conecte seu repositório manualmente no painel da Vercel. Como o projeto é estático (HTML/JS puro), ele será detectado automaticamente e o link será gerado em segundos.

