import { useState } from "react";

export default function GamePage() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  return (
    <div>
      <h1>Game Page</h1>
      <p>WIP</p>
    </div>
  );
}