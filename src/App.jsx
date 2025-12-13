import { useEffect, useState } from "react";
import "./App.css";

export default function App() {
  const [url, setUrl] = useState("/opds");
  const [entries, setEntries] = useState([]);
  const [feedTitle, setFeedTitle] = useState("");
  const [history, setHistory] = useState(["/opds"]);
  const [authorQuery, setAuthorQuery] = useState("");

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  function goTo(newUrl) {
    setHistory(prev => [...prev, newUrl]);
    setUrl(newUrl);
  }

  function goBack() {
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      const newHistory = prev.slice(0, -1);
      setUrl(newHistory[newHistory.length - 1]);
      return newHistory;
    });
  }

  function normalizeHref(href) {
    if (!href) return "";
    if (href.startsWith("/b")) return href;
    if (href.startsWith("/opds")) return href;
    if (href.startsWith("http://flibusta.is")) return href.replace("http://flibusta.is", "");
    return "/opds" + href;
  }

  function searchByAuthor(e) {
    e.preventDefault();
    if (!authorQuery.trim()) return;

    const searchUrl = `/opds/search?searchTerm=${encodeURIComponent(authorQuery.trim())}`;
    setHistory(prev => [...prev, searchUrl]);
    setUrl(searchUrl);
    setAuthorQuery("");
  }

  useEffect(() => {
    async function load(u) {
      try {
        const res = await fetch(u);
        const text = await res.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "application/xml");

        setFeedTitle(xml.querySelector("title")?.textContent ?? "");

        const parsed = [...xml.querySelectorAll("entry")].map(e => {
          const title = e.querySelector("title")?.textContent;
          const content = e.querySelector("content")?.textContent;
          const authors = [...e.querySelectorAll("author > name")].map(a => a.textContent);
          const links = [...e.querySelectorAll("link")].map(l => ({
            href: l.getAttribute("href"),
            type: l.getAttribute("type"),
            rel: l.getAttribute("rel")
          }));
          return { title, content, authors, links };
        });

        setEntries(parsed);
      } catch (err) {
        console.error("Load error:", err);
      }
    }

    load(url);
  }, [url]);

  return (
    <div className="container">
      <button
        className="button-theme"
        onClick={() => setIsDark(v => !v)}
        title="Переключить тему"
      >
        {isDark ? "☀️" : "🌙"}
      </button>
      {/* <h1>OPDS React Viewer</h1> */}

      {/* Breadcrumb */}
      <div className="breadcrumb">
        {history.map((h, i) => {
          const name = h === "/opds" ? "Главная" : h.split("/").filter(Boolean).pop();
          return (
            <span key={i}>
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setUrl(history[i]);
                  setHistory(history.slice(0, i + 1));
                }}
              >
                {name}
              </a>
              {i < history.length - 1 && " > "}
            </span>
          );
        })}
      </div>

      {/* Назад */}
      {history.length > 1 && (
        <button className="button-back" onClick={goBack}>← Назад</button>
      )}

      <h2>Каталог книг Flibusta</h2>
      {url === "/opds" && (
        <form onSubmit={searchByAuthor} className="search-form">
          <input
            type="text"
            placeholder="Поиск по автору"
            value={authorQuery}
            onChange={e => setAuthorQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="button-search">Найти</button>
        </form>
      )}


      {/* Список записей */}
      <div className="entry-grid">
        
        {entries.map((e, i) => {
          if (e.title === 'Моя полка') {
            return (<div key={i}>  </div>)
          } else {
            return (
              <div key={i} className="entry-card">
                <div>
                  <strong>{e.title}</strong>
                  {e.authors.length > 0 && <div className="authors">Автор: {e.authors.join(", ")}</div>}
                  {e.content && <div className="content" dangerouslySetInnerHTML={{ __html: e.content }} />}
                </div>

                <div className="links">
                  {/* Кнопка открытия каталога */}
                  {(() => {
                    const link = e.links.find(l => l.type && l.type.startsWith("application/atom+xml"));
                    if (link) {
                      const href = normalizeHref(link.href);
                      return <button onClick={() => goTo(href)}>Открыть</button>;
                    }
                    return null;
                  })()}

                  {/* Ссылки на форматы книг */}
                  {e.links
                    .filter(l => l.type && (l.type.includes("epub") || l.type.includes("fb2") || l.type.includes("mobi")))
                    .map((l, j) => {
                      let format = "";
                      if (l.type.includes("epub")) format = "EPUB";
                      else if (l.type.includes("fb2")) format = "FB2";
                      else if (l.type.includes("mobi")) format = "MOBI";

                      const href = normalizeHref(l.href);
                      return (
                        <a key={j} href={href} target="_blank" rel="noreferrer">
                          {format}
                        </a>
                      );
                    })}

                </div>
              </div>
            )
          }
        })}
      </div>
    </div>
  );
}
