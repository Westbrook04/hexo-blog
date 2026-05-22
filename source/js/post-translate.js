(function () {
  const TOOLBAR_SELECTOR = '[data-post-translate-root]';
  const BUTTON_SELECTOR = '[data-translate-button]';
  const STATUS_SELECTOR = '[data-translate-status]';
  const CONTENT_SELECTOR = '.post-content .markdown-body';
  // Point this to your deployed Cloudflare Worker URL.
  // Deploy: cd workers && npx wrangler deploy translate-worker.js --name hexo-translate
  const TRANSLATE_ENDPOINT = 'https://hexo-translate.YOUR_SUBDOMAIN.workers.dev';

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

  /** Send all text chunks in one POST to the Worker, get translations back. */
  async function translateBatch(texts, source, target) {
    var response = await fetch(TRANSLATE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: texts, source: source, target: target })
    });
    if (!response.ok) throw new Error('Translation worker returned ' + response.status);
    var result = await response.json();
    return result.translated;
  }

  async function translateHtml(html) {
    var container = document.createElement('div');
    container.innerHTML = html;
    var textNodes = collectTextNodes(container);
    if (textNodes.length === 0) return html;

    var texts = textNodes.map(function (n) { return n.textContent; });
    var translated = await translateBatch(texts, 'en', 'zh-CN');

    for (var i = 0; i < translated.length; i++) {
      textNodes[i].textContent = translated[i];
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
