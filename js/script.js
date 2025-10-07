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

// Adsterra and Reading History logic with language tracking
(function() {
  const adLink1 = 'https://www.revenuecpmgate.com/v4pnxk7v0?key=7715fad3d3bbeb7b52a1113af43948a5';
  const adLink2 = 'https://www.revenuecpmgate.com/wbuiun27x?key=b234ea9fe88ce19485fb3f94bdfe1478';
  window.triggerAd = () => {
    window.open(new Date().getDate() % 2 === 0 ? adLink1 : adLink2, '_blank');
  };
  window.readingHistory = JSON.parse(localStorage.getItem('readingHistory')) || {};
  window.markChapterAsRead = (mangaId, chapterId, lang, flag) => {
    if (!window.readingHistory[mangaId]) window.readingHistory[mangaId] = { chapters: [], language: lang, flag: flag };
    if (!window.readingHistory[mangaId].chapters.includes(chapterId)) {
      window.readingHistory[mangaId].chapters.push(chapterId);
      window.readingHistory[mangaId].language = lang;
      window.readingHistory[mangaId].flag = flag;
      localStorage.setItem('readingHistory', JSON.stringify(window.readingHistory));
    }
  };
  window.getReadingHistoryForManga = (mangaId) => window.readingHistory[mangaId]?.chapters || [];
  window.getReadingLanguageForManga = (mangaId) => window.readingHistory[mangaId]?.language || '';
  window.getReadingFlagForManga = (mangaId) => window.readingHistory[mangaId]?.flag || '';
})();

const API_URL = 'https://my-manga-api.vercel.app/api';
let currentMangaId = null, cameFromSearch = false, currentChapterList = [], currentChapterIndex = -1;
let selectedLanguage = null, selectedFlag = null;
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
  chapterImages.innerHTML = '';
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
  chapterImages.innerHTML = '';
}
function showDetailView(mangaId) {
  if (mangaId) currentMangaId = mangaId;
  currentChapterList = [];
  currentChapterIndex = -1;
  chapterImages.innerHTML = '';
  readerLoader.classList.add('hidden');
  switchView('detail');
  if (mangaId) fetchMangaDetails(mangaId);
}
function showReaderView(chapterId, index) {
  if (index !== undefined) currentChapterIndex = index;
  switchView('reader');
  chapterImages.innerHTML = '';
  readerLoader.classList.remove('hidden');
  document.documentElement.scrollTop = 0;
  markChapterAsRead(currentMangaId, chapterId, selectedLanguage, selectedFlag);
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
  chapterImages.innerHTML = '';
}
function goToNextChapter() {
  if (!selectedLanguage) { nextChapterBtn.disabled = true; return; }
  if (currentChapterIndex < currentChapterList.length - 1) {
    currentChapterIndex++;
    const nextChapter = currentChapterList[currentChapterIndex];
    showReaderView(nextChapter.chapterId, currentChapterIndex);
  }
}
function goToPrevChapter() {
  if (!selectedLanguage) { prevChapterBtn.disabled = true; return; }
  if (currentChapterIndex > 0) {
    currentChapterIndex--;
    const prevChapter = currentChapterList[currentChapterIndex];
    showReaderView(prevChapter.chapterId, currentChapterIndex);
  }
}
function updateChapterNavButtons() {
  prevChapterBtn.disabled = !selectedLanguage || currentChapterIndex <= 0;
  nextChapterBtn.disabled = !selectedLanguage || currentChapterList.length === 0 || currentChapterIndex >= currentChapterList.length - 1;
}
async function fetchHomepageLists() {
  mainLoader.classList.remove('hidden');
  listsContainer.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/lists`);
    const lists = await res.json();

    if (lists.featured) createCarousel('Featured', 'featured', lists.featured);
    if (lists.seasonal) createCarousel('Seasonal: Summer 2025', 'seasonal', lists.seasonal);
    if (lists['self-published']) createCarousel('Self-Published', 'self-published', lists['self-published']);
    if (lists.recommended) createCarousel('Recommended', 'recommended', lists.recommended);
    if (lists.latest) createCarousel('Latest Updates', 'latest', lists.latest);
    if (lists.newlyAdded) createCarousel('Newly Added', 'newly-added', lists.newlyAdded);

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
    const manga = await res.json();
    window.__lastMangaDetails = manga;
    renderMangaDetails(manga);
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
    // Progressive/lazy loading for fast perceived speed
    const { imageUrls } = await res.json();
    renderChapterPages(imageUrls);
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
  if (!mangaList || mangaList.length === 0) return;
  const section = document.createElement('div');
  section.className = 'list-section';
  section.innerHTML = `<h2>${title}</h2>
  <div class="glide" id="${id}">
    <div class="glide__track" data-glide-el="track">
      <ul class="glide__slides">${mangaList.map(manga => `
        <li class="glide__slide">
          <div class="manga-card" onclick="showDetailView('${manga.id}')">
            <div class="cover-image"><img src="${manga.imgUrl || manga.coverImage || ''}" alt="${manga.title}" loading="lazy"></div>
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
  const getImgUrl = (manga) => manga.imgUrl || manga.coverImage || '';
  container.innerHTML = !mangaList || mangaList.length === 0 ? '<p>No manga found.</p>' : mangaList.map(manga => {
    const readLang = window.getReadingLanguageForManga(manga.id);
    const readFlag = window.getReadingFlagForManga(manga.id);
    return `
      <div class="manga-card" onclick="cameFromSearch=true; showDetailView('${manga.id}')">
        <div class="cover-image"><img src="${getImgUrl(manga).replace('.512.jpg', '.256.jpg')}" alt="${manga.title}" loading="lazy"></div>
        <div class="manga-info">
          <h3>${manga.title}</h3>
          ${readLang ? `<div class="read-lang">Read in: <span style="font-weight:bold">${readFlag ? readFlag + ' ' : ''}${readLang.toUpperCase()}</span></div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function getLanguageStats(manga) {
  const langMap = {};
  manga.chapters.forEach(chap => {
    chap.alternatives.forEach(alt => {
      const lang = alt.translatedLanguage;
      if (!langMap[lang]) langMap[lang] = { count: 0, flag: alt.flag, name: lang };
      langMap[lang].count++;
    });
  });
  return langMap;
}

function showLanguagePicker(manga, onPick) {
  const langStats = getLanguageStats(manga);
  const langs = Object.keys(langStats);
  let html = `<div class="lang-modal-backdrop"><div class="lang-modal">
      <h3>Choose a Language</h3>
      <div style="display:flex;flex-wrap:wrap;gap:12px;">`;
  langs.forEach(lang => {
    html += `<button class="lang-option" data-lang="${lang}">
      ${langStats[lang].flag ? langStats[lang].flag + " " : ""}${lang.toUpperCase()} <span style="color:#ffe066;">(${langStats[lang].count})</span>
    </button>`;
  });
  html += `</div><button class="close-lang-modal" style="margin-top:18px;padding:8px 20px;">Cancel</button></div></div>`;
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = html;
  document.body.appendChild(modalDiv);

  modalDiv.querySelectorAll('.lang-option').forEach(btn => {
    btn.onclick = () => {
      const lang = btn.getAttribute('data-lang');
      document.body.removeChild(modalDiv);
      onPick(lang, langStats[lang].flag || "");
    };
  });
  modalDiv.querySelector('.close-lang-modal').onclick = () => {
    document.body.removeChild(modalDiv);
  };
}

function buildLangChapterList(manga, lang) {
  let chapters = [];
  manga.chapters.forEach(chap => {
    chap.alternatives.forEach(alt => {
      if (alt.translatedLanguage === lang) {
        chapters.push({ chapterId: alt.chapterId, chapterTitle: alt.chapterTitle, chapterNumber: chap.chapterNumber });
      }
    });
  });
  chapters.sort((a, b) => {
    const na = parseFloat(a.chapterNumber);
    const nb = parseFloat(b.chapterNumber);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    if (!isNaN(na)) return -1;
    if (!isNaN(nb)) return 1;
    return a.chapterNumber.localeCompare(b.chapterNumber);
  });
  return chapters;
}

function renderMangaDetails(manga) {
  const langStats = getLanguageStats(manga);
  detailContent.innerHTML = `
    <div class="detail-header">
      <div class="detail-cover"><img src="${manga.coverImage}" alt="${manga.title}"></div>
      <div class="detail-info">
        <h1>${manga.title}</h1>
        <p><strong>Author:</strong> ${manga.author}</p>
        <p><strong>Status:</strong> ${manga.status}</p>
        <div class="genres">${manga.genres.map(g => `<span>${g}</span>`).join('')}</div>
        <p>${manga.description}</p>
        <div class="lang-selector" style="margin:12px 0 0 0;">
          <strong>Available Languages:</strong>
          ${Object.keys(langStats).map(lang => 
            `<span style="margin-right:8px;">${langStats[lang].flag ? langStats[lang].flag + " " : ""}${lang.toUpperCase()} (${langStats[lang].count})</span>`
          ).join('')}
          <button id="choose-lang-btn" style="margin-left:20px;padding:4px 12px;">Read</button>
        </div>
      </div>
    </div>
    <h2>Chapters</h2>
    <div class="chapter-list">
      ${
        manga.chapters.length > 0
        ? manga.chapters.map((chap, idx) => `
          <div class="chapter-item-group">
            <span class="chapter-label">Chapter ${chap.chapterNumber}:</span>
            ${
              chap.alternatives && chap.alternatives.length > 0
              ? chap.alternatives.map((alt, altIdx) => `
                <button class="chapter-variant-btn"
                  data-chapter-id="${alt.chapterId}"
                  data-chapter-lang="${alt.translatedLanguage}"
                  data-chapter-flag="${alt.flag || ''}"
                  data-chapter-number="${chap.chapterNumber}"
                  title="${alt.country || ''} ${alt.translatedLanguage ? alt.translatedLanguage.toUpperCase() : ''}${alt.groupName ? ' • ' + alt.groupName : ''}">
                  ${alt.flag ? alt.flag + ' ' : ''}${alt.translatedLanguage ? alt.translatedLanguage.toUpperCase() : ''}
                </button>
              `).join('')
              : `<span class='chapter-no-english'>No variant</span>`
            }
          </div>
        `).join('')
        : '<p>No chapters found.</p>'
      }
    </div>
  `;

  // On "Read" button, show language picker before reading
  const chooseLangBtn = detailContent.querySelector('#choose-lang-btn');
  if (chooseLangBtn) {
    chooseLangBtn.onclick = () => {
      showLanguagePicker(manga, function(lang, flag) {
        selectedLanguage = lang;
        selectedFlag = flag;
        const langChapters = buildLangChapterList(manga, lang);
        if (langChapters.length > 0) {
          currentChapterList = langChapters;
          currentChapterIndex = 0;
          showReaderView(langChapters[0].chapterId, 0);
        } else {
          alert('No chapters found in this language.');
        }
      });
    };
  }

  const variantButtons = detailContent.querySelectorAll('.chapter-variant-btn');
  variantButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const chapterId = btn.getAttribute('data-chapter-id');
      const lang = btn.getAttribute('data-chapter-lang');
      const flag = btn.getAttribute('data-chapter-flag');
      selectedLanguage = lang;
      selectedFlag = flag;
      const mangaData = window.__lastMangaDetails;
      const langChapters = buildLangChapterList(mangaData, lang);
      currentChapterList = langChapters;
      const idx = langChapters.findIndex(c => c.chapterId === chapterId);
      currentChapterIndex = idx !== -1 ? idx : 0;
      showReaderView(chapterId, currentChapterIndex);
    });
  });

  window.__lastMangaDetails = manga;
}

function renderChapterPages(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    chapterImages.innerHTML = '<p>No images found for this chapter.</p>';
    return;
  }
  chapterImages.innerHTML = '';
  imageUrls.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.loading = 'lazy';
    img.style.display = 'block';
    img.style.width = '100%';
    img.onerror = () => { img.style.display = 'none'; };
    chapterImages.appendChild(img);
  });
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