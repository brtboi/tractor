import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SocketProvider } from "./services/SocketProvider";
import HomePage from "./HomePage/HomePage";
import GamePage from "./GamePage/GamePage";
import ErrorToast from "./ErrorToast/ErrorToast";
import NotFound from "./NotFound/NotFound";
import styles from "./App.module.scss";

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        {/* <Sidebar theme={theme} onToggleTheme={toggleTheme} /> */}
        <div className={styles.appContainer}>
          <ErrorToast />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/game/:roomId" element={<GamePage />} />
            <Route
              path="*"
              element={
                <NotFound
                  title="oops, nothing here"
                  message="That page doesn't exist."
                />
              }
            />
          </Routes>
        </div>
      </SocketProvider>
    </BrowserRouter>
  );
}
