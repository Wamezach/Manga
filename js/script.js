// Anti-DevTools Script (Keyboard and Context Menu Only, NO error.html)
(function() {
  document.addEventListener('keydown', e => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
    if (e.key === 'F12') { e.preventDefault(); return; }
    if (ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) { e.preventDefault(); }
    if (ctrlKey && e.key === 'U') { e.preventDefault(); }
  });
  document.addEventListener('contextmenu', e => e.preventDefault());
})();

// Adsterra and Reading History logic
(function() {
  const adLink1 = 'https://www.revenuecpmgate.com/v4pnxk7v0?key=7715fad3d3bbeb7b52a1113af43948a5';
  const adLink2 = 'https://www.revenuecpmgate.com/wbuiun27x?key=b234ea9fe88ce19485fb3f94bdfe1478';
  window.triggerAd = () => {
    window.open(new Date().getDate() % 2 === 0 ? adLink1 : adLink2, '_blank');
  };
  window.readingHistory = JSON.parse(localStorage.getItem('readingHistory')) || {};
  window.markChapterAsRead = (mangaId, chapterId) => {
    if (!window.readingHistory[mangaId]) window.readingHistory[mangaId] = [];
    if (!window.readingHistory[mangaId].includes(chapterId)) {
      window.readingHistory[mangaId].push(chapterId);
      localStorage.setItem('readingHistory', JSON.stringify(window.readingHistory));
    }
  };
  window.getReadingHistoryForManga = (mangaId) => window.readingHistory[mangaId] || [];
})();

// This is your Vercel API base, NOT a relative path
const API_URL = 'https://my-manga-api.vercel.app/api';
let currentMangaId = null, cameFromSearch = false, currentChapterList = [], currentChapterIndex = -1;
const mainView = document.getElementById('main-view'), detailView = document.getElementById('detail-view'), readerView = document.getElementById('reader-view');
const mainLoader = document.getElementById('main-loader'), detailLoader = document.getElementById('detail-loader'), readerLoader = document.getElementById('reader-loader');
const listsContainer = document.getElementById('lists-container'), detailContent = document.getElementById('detail-content'), chapterImages = document.getElementById('chapter-images');
const searchResultsContainer = document.getElementById('search-results-container'), mangaContainer = document.getElementById('manga-container'), gridTitle = document.getElementById('grid-title');
const searchForm = document.getElementById('search-form'), searchInput = document.getElementById('search-input'), clearSearchBtn = document.getElementById('clear-search-btn');
const prevChapterBtn = document.getElementById('prev-chapter-btn'), nextChapterBtn = document.getElementById('next-chapter-btn');
const welcomeOverlay = document.getElementById('welcome-overlay'), closeOverlayBtn = document.getElementById('close-overlay-btn'), dontShowAgainCheckbox = document.getElementById('dont-show-again-checkbox');
const myListContainer = document.getElementById('my-list-container'), myListMangaContainer = document.getElementById('my-list-manga-container');
const homeBtn = document.getElementById('home-btn'), myLisBtn = document.getElementById('my-list-btn');
const views = { main: mainView, detail: detailView, reader: readerView };

function switchView(targetView) {
  Object.values(views).forEach(view => view.classList.add('hidden'));
  views[targetView].classList.remove('hidden');
}
function goBack() {
  cameFromSearch ? showSearchResults() : showMainView();
}
function showMainView() {
  switchView('main');
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  cameFromSearch = false;
  searchResultsContainer.classList.add('hidden');
  myListContainer.classList.add('hidden');
  listsContainer.classList.remove('hidden');
  homeBtn.classList.add('active');
  myLisBtn.classList.remove('active');
  fetchHomepageLists();
}
function showSearchResults(query) {
  switchView('main');
  listsContainer.classList.add('hidden');
  searchResultsContainer.classList.remove('hidden');
  myListContainer.classList.add('hidden');
  if (query) {
    gridTitle.textContent = `Search Results for "${query}"`;
    fetchSearchResults(query);
  }
}
function showDetailView(mangaId) {
  if (mangaId) currentMangaId = mangaId;
  switchView('detail');
  if (mangaId) fetchMangaDetails(mangaId);
}
function showReaderView(chapterId, index) {
  if (index !== undefined) currentChapterIndex = index;
  switchView('reader');
  document.documentElement.scrollTop = 0;
  markChapterAsRead(currentMangaId, chapterId);
  if (window.triggerAd) window.triggerAd();
  fetchChapterPages(chapterId);
}
function showMyList() {
  switchView('main');
  listsContainer.classList.add('hidden');
  searchResultsContainer.classList.add('hidden');
  myListContainer.classList.remove('hidden');
  homeBtn.classList.remove('active');
  myLisBtn.classList.add('active');
  fetchMyList();
}
function goToNextChapter() {
  if (currentChapterIndex < currentChapterList.length - 1) {
    currentChapterIndex++;
    const nextChapter = currentChapterList[currentChapterIndex];
    showReaderView(nextChapter.chapterId, currentChapterIndex);
  }
}
function goToPrevChapter() {
  if (currentChapterIndex > 0) {
    currentChapterIndex--;
    const prevChapter = currentChapterList[currentChapterIndex];
    showReaderView(prevChapter.chapterId, currentChapterIndex);
  }
}
function updateChapterNavButtons() {
  prevChapterBtn.disabled = currentChapterIndex <= 0;
  nextChapterBtn.disabled = currentChapterIndex >= currentChapterList.length - 1;
}
async function fetchHomepageLists() {
  mainLoader.classList.remove('hidden');
  listsContainer.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/lists`);
    const lists = await res.json();
    createCarousel('Trending Now', 'trending', lists.trending);
    createCarousel('Latest Updates', 'latest', lists.latest);
    createCarousel('Newly Added', 'newly-added', lists.newlyAdded);
  } catch (e) {
    listsContainer.innerHTML = `<p>Error loading lists: ${e.message}</p>`;
  } finally {
    mainLoader.classList.add('hidden');
  }
}
async function fetchSearchResults(query) {
  mainLoader.classList.remove('hidden');
  mangaContainer.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    renderMangaGrid(mangaContainer, (await res.json()).data);
  } catch (e) {
    mangaContainer.innerHTML = `<p>Error searching: ${e.message}</p>`;
  } finally {
    mainLoader.classList.add('hidden');
  }
}
async function fetchMangaDetails(mangaId) {
  detailLoader.classList.remove('hidden');
  detailContent.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/manga/${mangaId}`);
    renderMangaDetails(await res.json());
  } catch (e) {
    detailContent.innerHTML = `<p>Error loading details: ${e.message}</p>`;
  } finally {
    detailLoader.classList.add('hidden');
  }
}
async function fetchChapterPages(chapterId) {
  readerLoader.classList.remove('hidden');
  chapterImages.innerHTML = '';
  updateChapterNavButtons();
  try {
    const res = await fetch(`${API_URL}/read/${chapterId}`);
    if (!res.ok) throw new Error((await res.json()).message);
    renderChapterPages((await res.json()).imageUrls);
  } catch (e) {
    chapterImages.innerHTML = `<p>Error loading chapter: ${e.message}</p>`;
  } finally {
    readerLoader.classList.add('hidden');
  }
}
async function fetchMyList() {
  mainLoader.classList.remove('hidden');
  myListMangaContainer.innerHTML = '';
  try {
    const mangaIds = Object.keys(window.readingHistory);
    if (mangaIds.length === 0) {
      myListMangaContainer.innerHTML = '<p>Your reading list is empty. Start reading to add manga here!</p>';
      return;
    }
    const mangaList = await Promise.all(mangaIds.map(id => fetch(`${API_URL}/manga/${id}`).then(res => res.json())));
    renderMangaGrid(myListMangaContainer, mangaList);
  } catch (e) {
    myListMangaContainer.innerHTML = `<p>Error loading your list: ${e.message}</p>`;
  } finally {
    mainLoader.classList.add('hidden');
  }
}
function createCarousel(title, id, mangaList) {
  const section = document.createElement('div');
  section.className = 'list-section';
  section.innerHTML = `<h2>${title}</h2>
  <div class="glide" id="${id}">
    <div class="glide__track" data-glide-el="track">
      <ul class="glide__slides">${mangaList.map(manga => `
        <li class="glide__slide">
          <div class="manga-card" onclick="showDetailView('${manga.id}')">
            <div class="cover-image"><img src="${manga.imgUrl}" alt="${manga.title}" loading="lazy"></div>
            <div class="manga-info"><h3>${manga.title}</h3></div>
          </div>
        </li>
      `).join('')}</ul>
    </div>
    <div class="glide__arrows" data-glide-el="controls">
      <button class="glide__arrow glide__arrow--left" data-glide-dir="<"><</button>
      <button class="glide__arrow glide__arrow--right" data-glide-dir=">">></button>
    </div>
  </div>`;
  listsContainer.appendChild(section);
  new Glide(`#${id}`, {
    type: 'carousel',
    perView: 7,
    gap: 20,
    breakpoints: { 1600: { perView: 6 }, 1280: { perView: 5 }, 1024: { perView: 4 }, 768: { perView: 3 }, 640: { perView: 2 } }
  }).mount();
}
function renderMangaGrid(container, mangaList) {
  // Always use imgUrl as sent by backend, do not change extension
  const getImgUrl = (manga) => manga.imgUrl || manga.coverImage || '';
  container.innerHTML = !mangaList || mangaList.length === 0 ? '<p>No manga found.</p>' : mangaList.map(manga => `
    <div class="manga-card" onclick="cameFromSearch=true; showDetailView('${manga.id}')">
      <div class="cover-image"><img src="${getImgUrl(manga)}" alt="${manga.title}" loading="lazy"></div>
      <div class="manga-info"><h3>${manga.title}</h3></div>
    </div>
  `).join('');
}
function renderMangaDetails(manga) {
  currentChapterList = manga.chapters;
  const readChapters = getReadingHistoryForManga(manga.id);
  // Use manga.coverImage as provided by API (should be proxied Vercel URL)
  detailContent.innerHTML = `
    <div class="detail-header">
      <div class="detail-cover"><img src="${manga.coverImage}" alt="${manga.title}"></div>
      <div class="detail-info">
        <h1>${manga.title}</h1>
        <p><strong>Author:</strong> ${manga.author}</p>
        <p><strong>Status:</strong> ${manga.status}</p>
        <div class="genres">${manga.genres.map(g => `<span>${g}</span>`).join('')}</div>
        <p>${manga.description}</p>
      </div>
    </div>
    <h2>Chapters</h2>
    <div class="chapter-list">
      ${manga.chapters.length > 0 ? manga.chapters.map((c, index) => `
        <div class="chapter-item ${readChapters.includes(c.chapterId) ? 'read' : ''}" onclick="showReaderView('${c.chapterId}', ${index})">${c.chapterTitle}</div>
      `).join('') : '<p>No chapters found.</p>'}
    </div>
  `;
}
function renderChapterPages(imageUrls) {
  chapterImages.innerHTML = !imageUrls || imageUrls.length === 0 ? '<p>No images found for this chapter.</p>' : imageUrls.map(url => `<img src="${url}" loading="lazy">`).join('');
}
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('hideOverlay') === 'true') {
    welcomeOverlay.classList.add('hidden');
  } else {
    welcomeOverlay.classList.remove('hidden');
  }
  showMainView();
});
closeOverlayBtn.addEventListener('click', () => {
  if (dontShowAgainCheckbox.checked) localStorage.setItem('hideOverlay', 'true');
  welcomeOverlay.classList.add('hidden');
});
homeBtn.addEventListener('click', showMainView);
myLisBtn.addEventListener('click', showMyList);
searchForm.addEventListener('submit', (e) => { e.preventDefault(); const query = searchInput.value.trim(); if (query) showSearchResults(query); });
clearSearchBtn.addEventListener('click', () => { showMainView(); });
searchInput.addEventListener('input', () => { clearSearchBtn.classList.toggle('hidden', searchInput.value.trim() === ''); });
