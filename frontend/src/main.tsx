import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App";
import HomePage from "./pages/HomePage";
import ArticlePage from "./pages/ArticlePage";
import ArchivePage from "./pages/ArchivePage";
import NotFoundPage from "./pages/NotFoundPage";
import { loadFeed, loadArticle, loadEditions } from "./lib/data";

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        id: "home",
        path: "/",
        element: <HomePage />,
        loader: () => loadFeed(),
      },
      {
        path: "/articulo/:slug",
        element: <ArticlePage />,
        loader: ({ params }) => loadArticle(params.slug!),
      },
      {
        path: "/archivo",
        element: <ArchivePage />,
        loader: () => loadEditions(),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
