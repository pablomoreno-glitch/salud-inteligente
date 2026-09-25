import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FBFCFA",
        sage: "#E6EEE7",
        ink: "#18221C",
        muted: "#5E6F63",
        line: "#DCE5DD",
        forest: "#1F3D2B",
        leaf: "#3F7D58",
        danger: "#B42318",
        warn: "#9A6700",
      },
      fontFamily: {
        display: ["\"Playfair Display\"", "serif"],
        sans: ["\"DM Sans\"", "system-ui", "sans-serif"],
      },
      fontSize: {
        meta: ["13px", "18px"],
        body: ["14px", "20px"],
        "body-lg": ["16px", "24px"],
        h4: ["24px", "30px"],
        h3: ["32px", "38px"],
        h2: ["44px", "50px"],
        h1: ["56px", "62px"],
      },
      borderRadius: {
        pill: "999px",
        tile: "16px",
        card: "12px",
        control: "8px",
      },
    },
  },
  plugins: [],
};

export default config;
