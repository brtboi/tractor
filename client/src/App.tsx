import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
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
      <Routes>
        <Route
          path="/"
          element={<HomePage theme={theme} onToggleTheme={toggleTheme} />}
        />
        {/* TODO: add game route once GamePage is built */}
        {/* <Route path="/game/:roomId" element={<GamePage />} /> */}
      </Routes>
    </BrowserRouter>
  );
}
