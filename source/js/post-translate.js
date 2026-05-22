(function () {
  const TOOLBAR_SELECTOR = '[data-post-translate-root]';
  const BUTTON_SELECTOR = '[data-translate-button]';
  const STATUS_SELECTOR = '[data-translate-status]';
  const CONTENT_SELECTOR = '.post-content .markdown-body';
  const TRANSLATE_API = 'https://api.mymemory.translated.net/get';

  const state = {
    originalHtml: null,
    translatedHtml: null,
    translated: false,
    busy: false
  };

  function getElements() {
    const toolbar = document.querySelector(TOOLBAR_SELECTOR);
    const button = toolbar ? toolbar.querySelector(BUTTON_SELECTOR) : null;
    const status = toolbar ? toolbar.querySelector(STATUS_SELECTOR) : null;
    const content = document.querySelector(CONTENT_SELECTOR);
    return { toolbar, button, status, content };
  }

  function setStatus(statusEl, message) {
    if (statusEl) statusEl.textContent = message || '';
  }

  function setButtonState(button, text, disabled) {
    if (!button) return;
    button.textContent = text;
    button.disabled = !!disabled;
  }

  function collectTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
        if (parent.closest('pre, code, script, style')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  const MAX_QUERY_LEN = 500;

  /** Split text into chunks of at most MAX_QUERY_LEN chars, breaking at sentence boundaries. */
  function splitText(text) {
    if (text.length <= MAX_QUERY_LEN) return [text];
    var parts = [], i = 0;
    while (i < text.length) {
      var end = Math.min(i + MAX_QUERY_LEN, text.length);
      // Try to break at a sentence boundary (.!?) for better translation quality.
      if (end < text.length) {
        var boundary = text.lastIndexOf('. ', end);
        if (boundary > i + MAX_QUERY_LEN / 2) end = boundary + 1;
        else {
          boundary = text.lastIndexOf(' ', end);
          if (boundary > i + MAX_QUERY_LEN / 2) end = boundary;
        }
      }
      parts.push(text.slice(i, end));
      i = end;
    }
    return parts;
  }

  /** Translate one text string via MyMemory API (CORS-friendly, free, no key needed).
      Handles the 500-char query limit automatically by splitting. */
  async function translateText(text, source, target) {
    var chunks = splitText(text);
    if (chunks.length === 0) return '';
    var results = await Promise.all(chunks.map(async function(chunk) {
      var url = TRANSLATE_API + '?q=' + encodeURIComponent(chunk) +
        '&langpair=' + encodeURIComponent(source + '|' + target);
      var response = await fetch(url);
      if (!response.ok) throw new Error('API returned ' + response.status);
      var data = await response.json();
      if (data.responseStatus !== 200) throw new Error(data.responseDetails);
      return data.responseData.translatedText;
    }));
    return results.join('');
  }

  /** Translate all text chunks with a concurrency limit (5 at a time). */
  async function translateHtml(html) {
    var container = document.createElement('div');
    container.innerHTML = html;
    var textNodes = collectTextNodes(container);
    if (textNodes.length === 0) return html;

    var texts = textNodes.map(function (n) { return n.textContent; });
    var CONCURRENCY = 5;

    for (var i = 0; i < texts.length; i += CONCURRENCY) {
      var batch = texts.slice(i, i + CONCURRENCY);
      var translated = await Promise.all(
        batch.map(function (t) { return translateText(t, 'en', 'zh-CN'); })
      );
      for (var j = 0; j < translated.length; j++) {
        textNodes[i + j].textContent = translated[j];
      }
    }
    return container.innerHTML;
  }

  async function handleClick() {
    var els = getElements();
    var button = els.button, status = els.status, content = els.content;
    if (!button || !content || state.busy) return;

    if (state.translated) {
      content.innerHTML = state.originalHtml;
      state.translated = false;
      setButtonState(button, 'Translate to Chinese', false);
      setStatus(status, 'Showing original English.');
      return;
    }

    state.busy = true;
    state.originalHtml = state.originalHtml || content.innerHTML;
    setButtonState(button, 'Translating...', true);
    setStatus(status, 'Translating article content to Chinese...');

    try {
      if (!state.translatedHtml) {
        state.translatedHtml = await translateHtml(state.originalHtml);
      }
      content.innerHTML = state.translatedHtml;
      state.translated = true;
      setButtonState(button, 'Show English', false);
      setStatus(status, 'Translated to Chinese.');
    } catch (error) {
      console.error('[post-translate]', error.name, error.message);
      setButtonState(button, 'Translate to Chinese', false);
      setStatus(status, 'Translation unavailable (' + error.name + ')');
    } finally {
      state.busy = false;
    }
  }

  /** Check if the post content already contains Chinese characters. */
  function hasChinese(text) {
    return /[一-鿿㐀-䶿]/.test(text);
  }

  function init() {
    var els = getElements();
    if (!els.button || !els.content) return;

    // Post is already in Chinese — hide toolbar, no need for translation.
    if (hasChinese(els.content.textContent)) {
      if (els.toolbar) els.toolbar.style.display = 'none';
      return;
    }

    els.button.addEventListener('click', handleClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
