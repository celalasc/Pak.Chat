import { getSingletonHighlighter } from 'shiki/bundle/web';

interface Msg {
  code: string;
  lang: string;
}

const theme = 'css-variables';
const cache = new Map<string, any>();

self.onmessage = async (ev: MessageEvent<Msg>) => {
  const { code, lang } = ev.data;
  let highlighter = cache.get(lang);
  if (!highlighter) {
    highlighter = await getSingletonHighlighter({ themes: [theme], langs: [lang] });
    cache.set(lang, highlighter);
  }
  const html = highlighter.codeToHtml(code, { lang, theme });
  self.postMessage(html);
};
