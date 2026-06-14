import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./services/SocketContext";
import HomePage from "./HomePage/HomePage";
import GamePage from "./GamePage/GamePage";
import styles from "./App.module.scss";

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        {/* <Sidebar theme={theme} onToggleTheme={toggleTheme} /> */}
        <div className={styles.appContainer}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game/:roomId" element={<GamePage />} />
          </Routes>
        </div>
      </SocketProvider>
    </BrowserRouter>
  );
}
