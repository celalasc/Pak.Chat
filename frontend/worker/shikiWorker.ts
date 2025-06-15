import { getSingletonHighlighter } from 'shiki/bundle/web';

interface Msg {
  code: string;
  lang: string;
  theme: string;
}

const cache = new Map<string, any>();

self.onmessage = async (ev: MessageEvent<Msg>) => {
  const { code, lang, theme } = ev.data;
  const key = `${theme}:${lang}`;
  let highlighter = cache.get(key);
  if (!highlighter) {
    highlighter = await getSingletonHighlighter({ themes: [theme], langs: [lang] });
    cache.set(key, highlighter);
  }
  const html = highlighter.codeToHtml(code, { lang, theme });
  self.postMessage(html);
};
