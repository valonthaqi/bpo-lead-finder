export const APPLY_SAVED_THEME_SCRIPT = `
try {
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (saved === "dark" || (saved === null && prefersDark)) {
    document.documentElement.classList.add("dark");
  }
} catch {}
`;
