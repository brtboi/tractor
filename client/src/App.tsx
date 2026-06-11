import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar/Sidebar";
import HomePage from "./HomePage/HomePage";
// TODO: import GamePage from "./pages/GamePage";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar theme={theme} onToggleTheme={toggleTheme} />
        <main className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* TODO: <Route path="/game/:roomId" element={<GamePage />} /> */}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
