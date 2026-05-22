(function () {
  const TOOLBAR_SELECTOR = '[data-post-translate-root]';
  const BUTTON_SELECTOR = '[data-translate-button]';
  const STATUS_SELECTOR = '[data-translate-status]';
  const CONTENT_SELECTOR = '.post-content .markdown-body';
  const TRANSLATE_ENDPOINT = 'https://translate.googleapis.com/translate_a/single';

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

  async function translateText(text, source, target) {
    const url = TRANSLATE_ENDPOINT +
      '?client=gtx&sl=' + encodeURIComponent(source) +
      '&tl=' + encodeURIComponent(target) +
      '&dt=t&q=' + encodeURIComponent(text);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Translation API returned ' + response.status);
    const data = await response.json();
    return data[0].map(function (item) { return item[0]; }).join('');
  }

  async function translateHtml(html) {
    var container = document.createElement('div');
    container.innerHTML = html;
    var textNodes = collectTextNodes(container);
    var textChunks = textNodes.map(function (n) { return n.textContent; });
    var BATCH_SIZE = 50;

    for (var i = 0; i < textChunks.length; i += BATCH_SIZE) {
      var batch = textChunks.slice(i, i + BATCH_SIZE);
      var translated = await Promise.all(
        batch.map(function (chunk) { return translateText(chunk, 'en', 'zh-CN'); })
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
      console.error('[post-translate]', error);
      setButtonState(button, 'Translate to Chinese', false);
      setStatus(status, 'Translation is unavailable right now.');
    } finally {
      state.busy = false;
    }
  }

  function init() {
    var els = getElements();
    if (!els.button || !els.content) return;
    els.button.addEventListener('click', handleClick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
