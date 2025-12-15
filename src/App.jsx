import { useEffect, useState } from "react";
import "./App.css";

function isIosPwa() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    window.navigator.standalone === true
  );
}

function normalizeHref(href) {
  if (!href) return "";
  if (href.startsWith("/opds")) return href;
  if (href.startsWith("/b")) return href;
  if (href.startsWith("http://flibusta.is"))
    return href.replace("http://flibusta.is", "");
  return "/opds" + href;
}

function parseFeedLinks(xml) {
  const links = xml.querySelectorAll("feed > link");
  const result = {};

  links.forEach(link => {
    const rel = link.getAttribute("rel");
    const href = link.getAttribute("href");
    if (rel && href) result[rel] = normalizeHref(href);
  });

  return result;
}

function processOpdsContent(html, maxLen = 200) {
  if (!html) return "";

  // 1. Ищем начало служебной информации
  const metaRegex =
    /<br\s*\/?>\s*(Год издания|Формат|Язык|Размер)\s*:/i;

  let mainPart = html;
  let metaPart = "";

  const match = html.match(metaRegex);
  if (match) {
    const idx = match.index;
    mainPart = html.slice(0, idx);
    metaPart = html.slice(idx);
  }

  // 2. Убираем HTML из основной части
  const tmp = document.createElement("div");
  tmp.innerHTML = mainPart;
  const text = tmp.textContent || tmp.innerText || "";

  // 3. Обрезаем текст
  let shortText = text.trim();
  if (shortText.length > maxLen) {
    shortText = shortText.slice(0, maxLen).trimEnd() + "…";
  }

  // 4. Собираем финальный HTML
  let result = shortText;

  if (metaPart) {
    result += "<br/>" + metaPart;
  }

  return result;
}

// function DownloadPage({ url }) {
//   return (
//     <div style={{ textAlign: "center", padding: 40 }}>
//       <h2>Загрузка книги</h2>

//       <p style={{ marginBottom: 20 }}>
//         iOS открывает загрузку книг в Safari.
//       </p>

//       <button
//         className="button-back"
//         onClick={() => {
//           window.location.href = url;
//         }}
//       >
//         Открыть в Safari
//       </button>

//       <p style={{ marginTop: 20, fontSize: 14, opacity: 0.7 }}>
//         После загрузки вернитесь назад в приложение
//       </p>
//     </div>
//   );
// }


export default function App() {
  const [url, setUrl] = useState("/opds");
  const [entries, setEntries] = useState([]);
  const [feedTitle, setFeedTitle] = useState("");
  const [history, setHistory] = useState(["/opds"]);
  const [authorQuery, setAuthorQuery] = useState("");
  const [nextUrl, setNextUrl] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  /* --------------------------------------------------
     navigation
  -------------------------------------------------- */

  function goTo(newUrl) {
    setHistory(prev => [...prev, newUrl]);
    setUrl(newUrl);
  }
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [showScrollTop, setShowScrollTop] = useState(false);


  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  function goBack() {
    setHistory(prev => {
      if (prev.length <= 1) return prev;
      const h = prev.slice(0, -1);
      setUrl(h[h.length - 1]);
      return h;
    });
  }

  function searchByAuthor(e) {
    e.preventDefault();
    if (!authorQuery.trim()) return;

    const searchUrl = `/opds/search?searchTerm=${encodeURIComponent(
      authorQuery.trim()
    )}`;
    setHistory(prev => [...prev, searchUrl]);
    setUrl(searchUrl);
    setAuthorQuery("");
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function loadOpds(u, append = false) {
    try {
      const res = await fetch(u);
      const text = await res.text();

      const xml = new DOMParser().parseFromString(text, "application/xml");

      if (!append) {
        setFeedTitle(xml.querySelector("title")?.textContent ?? "");
      }

      const parsedEntries = [...xml.querySelectorAll("entry")].map(e => {
        const title = e.querySelector("title")?.textContent;
        // const content = e.querySelector("content")?.textContent;
        const rawContent = e.querySelector("content")?.textContent;
        const content = processOpdsContent(rawContent, 200);
        const authors = [...e.querySelectorAll("author > name")].map(a =>
          a.textContent
        );
        const links = [...e.querySelectorAll("link")].map(l => ({
          href: l.getAttribute("href"),
          type: l.getAttribute("type"),
          rel: l.getAttribute("rel")
        }));

        return { title, content, authors, links };
      });

      const feedLinks = parseFeedLinks(xml);

      setEntries(prev =>
        append ? [...prev, ...parsedEntries] : parsedEntries
      );
      setNextUrl(feedLinks.next || null);
    } catch (err) {
      console.error("OPDS load error:", err);
    }
  }

  useEffect(() => {
    setEntries([]);
    setNextUrl(null);
    loadOpds(url, false);
  }, [url]);

  useEffect(() => {
    function onScroll() {
      setShowScrollTop(window.scrollY > 400);
    }

    window.addEventListener("scroll", onScroll);

    // важно: удалить listener при размонтировании
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (url.startsWith("/download")) {
    const params = new URLSearchParams(url.split("?")[1]);
    const fileUrl = params.get("url");

    return (
      <div className="container">
        <button className="button-back" onClick={goBack}>
          ← Назад
        </button>

        <h2>Загрузка книги</h2>

        <p>
          iOS открывает загрузку книг в Safari.
        </p>

        <button
          className="button-back"
          onClick={() => {
            window.location.href = fileUrl;
          }}
        >
          Открыть в Safari
        </button>

        <p style={{ marginTop: 12, opacity: 0.7 }}>
          После загрузки вернитесь назад в приложение
        </p>
      </div>
    );
  }


  return (
    <div className="container">
      <button
        className="button-theme"
        onClick={() => setIsDark(v => !v)}
        title="Переключить тему"
      >
        {isDark ? "☀️" : "🌙"}
      </button>
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

      {/* Back */}
      {history.length > 1 && (
        <button className="button-back" onClick={goBack}>
          ← Назад
        </button>
      )}

      <h2>{feedTitle || "Каталог книг"}</h2>

      {/* Search */}
      {url === "/opds" && (
        <form onSubmit={searchByAuthor} className="search-form">
          <input
            type="text"
            placeholder="Поиск по автору или книге"
            value={authorQuery}
            onChange={e => setAuthorQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="button-search">
            Найти
          </button>
        </form>
      )}

      {/* Entries */}
      <div className="entry-grid">
        {entries.map((e, i) => {
          if (e.title === "Моя полка") return null;

          return (
            <div key={i} className="entry-card">
              <div>
                <strong>{e.title}</strong>

                {e.authors.length > 0 && (
                  <div className="authors">
                    Автор: {e.authors.join(", ")}
                  </div>
                )}

                {e.content && (
                  <div
                    className="content"
                    dangerouslySetInnerHTML={{ __html: e.content }}
                  />
                )}
              </div>

              <div className="links">
                {/* Open catalog */}
                {(() => {
                  const link = e.links.find(
                    l =>
                      l.type &&
                      l.type.startsWith("application/atom+xml")
                  );
                  if (!link) return null;
                  return (
                    <button onClick={() => goTo(normalizeHref(link.href))}>
                      Открыть
                    </button>
                  );
                })()}

                {/* Book formats */}
                {e.links
                  .filter(
                    l =>
                      l.type &&
                      (l.type.includes("epub") ||
                        l.type.includes("fb2") ||
                        l.type.includes("mobi"))
                  )
                  .map((l, j) => {
                    let format = "BOOK";
                    if (l.type.includes("epub")) format = "EPUB";
                    if (l.type.includes("fb2")) format = "FB2";
                    if (l.type.includes("mobi")) format = "MOBI";

                    const href = normalizeHref(l.href);

                    return (
                      <a
                        key={j}
                        href={href}
                        onClick={ev => {
                          if (isIosPwa()) {
                            ev.preventDefault();
                            goTo(`/download?url=${encodeURIComponent(href)}`);
                          }
                        }}
                      >
                        {format}
                      </a>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {nextUrl && (
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            className="button-back"
            disabled={loadingMore}
            onClick={async () => {
              setLoadingMore(true);
              await loadOpds(nextUrl, true);
              setLoadingMore(false);
            }}
          >
            {loadingMore ? "Загрузка…" : "Показать ещё"}
          </button>
        </div>
      )}
      <button
        className={`button-scroll-top ${showScrollTop ? "visible" : ""}`}
        onClick={scrollToTop}
        title="Наверх"
      >
        ↑
      </button>
    </div>
  );
}
