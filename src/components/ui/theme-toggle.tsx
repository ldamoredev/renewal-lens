"use client";

const THEME_STORAGE_KEY = "renewallens-theme";

function setTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(
    new CustomEvent("renewallens-theme-change", { detail: theme }),
  );
}

export function ThemeToggle() {
  function toggleTheme() {
    const currentTheme =
      document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      title="Toggle color theme"
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb">
          <svg className="theme-toggle__moon" viewBox="0 0 20 20" fill="none">
            <path d="M16.2 12.4A6.8 6.8 0 0 1 7.6 3.8 6.9 6.9 0 1 0 16.2 12.4Z" />
          </svg>
          <svg className="theme-toggle__sun" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3.2" />
            <path d="M10 2.2v1.6M10 16.2v1.6M2.2 10h1.6M16.2 10h1.6M4.5 4.5l1.1 1.1M14.4 14.4l1.1 1.1M15.5 4.5l-1.1 1.1M5.6 14.4l-1.1 1.1" />
          </svg>
        </span>
      </span>
      <span className="sr-only">Switch between dark and light theme</span>
    </button>
  );
}
