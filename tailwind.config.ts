import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0e1a",
        panel: "#121829",
        edge: "#1f2940",
        muted: "#8a97b8",
      },
    },
  },
  plugins: [],
};

export default config;
