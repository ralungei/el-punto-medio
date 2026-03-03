import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigation, useMatches, ScrollRestoration } from "react-router-dom";
import type { ArticleWithMeta } from "./types";
import { TopBar } from "./components/layout/TopBar";
import { Header } from "./components/layout/Header";
import { NavBar } from "./components/layout/NavBar";
import { Footer } from "./components/layout/Footer";
import { BreakingTicker } from "./components/layout/BreakingTicker";
import { SearchOverlay } from "./components/layout/SearchOverlay";
import { getHiddenCats, setHiddenCats as persistHiddenCats } from "./lib/storage";

export interface AppContext {
  hideNegative: boolean;
  hiddenCats: Set<string>;
}

export default function App() {
  const navigation = useNavigation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [hideNegative, setHideNegative] = useState(
    () => localStorage.getItem("epm:hideNegative") === "true"
  );

  useEffect(() => {
    localStorage.setItem("epm:hideNegative", String(hideNegative));
  }, [hideNegative]);

  const [hiddenCats, setHiddenCats] = useState<Set<string>>(() => getHiddenCats());
  useEffect(() => { persistHiddenCats(hiddenCats); }, [hiddenCats]);
  const toggleCat = useCallback((cat: string) => {
    setHiddenCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  const [tickerArticles, setTickerArticles] = useState<ArticleWithMeta[]>([]);

  /* Extract articles from homepage loader data for the ticker */
  const matches = useMatches();
  useEffect(() => {
    const homeMatch = matches.find((m) => m.id === "home");
    if (homeMatch?.data) {
      const data = homeMatch.data as { articles?: ArticleWithMeta[] } | null;
      if (data?.articles) {
        const highCoverage = data.articles.filter((a) => a.sourcesCount >= 10);
        setTickerArticles(highCoverage);
      }
    }
  }, [matches]);

  /* Keyboard shortcut: Ctrl+K or Cmd+K to open search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <Header
        onSearchOpen={() => setSearchOpen(true)}
        hideNegative={hideNegative}
        onToggleHideNegative={() => setHideNegative((v) => !v)}
        hiddenCats={hiddenCats}
        toggleCat={toggleCat}
      />
      <NavBar />
      <BreakingTicker articles={tickerArticles} />

      <main
        className="mx-auto max-w-[1120px] px-6 pb-8 w-full"
        style={{
          flex: 1,
          opacity: navigation.state === "loading" ? 0.5 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <Outlet context={{ hideNegative, hiddenCats } satisfies AppContext} />
      </main>

      <Footer />
      <ScrollRestoration />

      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
