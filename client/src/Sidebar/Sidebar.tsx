import { useState } from "react";

interface Props {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function Sidebar({ theme, onToggleTheme }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={`sidebar ${expanded ? "sidebar--expanded" : ""}`}>
      <div className="sidebar__inner">
        {/* Top: toggle + logo */}
        <div className="sidebar__top">
          <button
            className="sidebar__toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            <span className="sidebar__suit">♠</span>
            {expanded && <span className="sidebar__wordmark">TRACTOR</span>}
          </button>
        </div>

        {/* Middle: nav items (placeholder for future pages) */}
        <nav className="sidebar__nav">
          <SidebarItem icon="⊞" label="Lobby" expanded={expanded} active />
          {/* TODO: add History, Settings nav items */}
        </nav>

        {/* Bottom: theme toggle + account */}
        <div className="sidebar__bottom">
          <button
            className="sidebar__item"
            onClick={onToggleTheme}
            aria-label="Toggle theme"
          >
            <span className="sidebar__item-icon">
              {theme === "dark" ? "☀" : "☾"}
            </span>
            {expanded && (
              <span className="sidebar__item-label">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            )}
          </button>

          {/* TODO: wire up real auth */}
          <button
            className="sidebar__item sidebar__item--account"
            onClick={() => {
              /* TODO: open sign-in modal */
            }}
            aria-label="Sign in"
          >
            <span className="sidebar__item-icon sidebar__item-icon--avatar">
              ?
            </span>
            {expanded && <span className="sidebar__item-label">Sign in</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({
  icon,
  label,
  expanded,
  active,
}: {
  icon: string;
  label: string;
  expanded: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={`sidebar__item ${active ? "sidebar__item--active" : ""}`}
    >
      <span className="sidebar__item-icon">{icon}</span>
      {expanded && <span className="sidebar__item-label">{label}</span>}
    </button>
  );
}
