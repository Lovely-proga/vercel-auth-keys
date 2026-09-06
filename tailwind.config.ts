import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1A17",
        panel: "#242220",
        panel2: "#2C2A27",
        line: "#3A3733",
        brass: "#C9A24B",
        brassDim: "#8C7433",
        parchment: "#EDE7DA",
        muted: "#9C9689",
        danger: "#B4573F",
        safe: "#5C8A64",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "3px",
        md: "5px",
      },
    },
  },
  plugins: [],
};
export default config;
