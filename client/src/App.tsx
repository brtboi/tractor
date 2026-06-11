import { BrowserRouter, Routes, Route } from "react-router-dom";
import styles from "./App.module.scss";
import HomePage from "./HomePage/HomePage";
// TODO: import GamePage from "./pages/GamePage";

export default function App() {
  return (
    <BrowserRouter>
      {/* <Sidebar theme={theme} onToggleTheme={toggleTheme} /> */}
      <div className={styles.appContainer}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* TODO: <Route path="/game/:roomId" element={<GamePage />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
