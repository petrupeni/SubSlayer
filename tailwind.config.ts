import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                matrix: {
                    green: "#00ff41",
                    darkgreen: "#008f11",
                    black: "#0d0208",
                    darkgray: "#1a1a2e",
                },
            },
            fontFamily: {
                mono: ["JetBrains Mono", "Fira Code", "monospace"],
            },
            animation: {
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "scan-line": "scan-line 3s ease-in-out infinite",
                "flicker": "flicker 0.15s infinite",
            },
            keyframes: {
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 20px rgba(0, 255, 65, 0.3)" },
                    "50%": { boxShadow: "0 0 40px rgba(0, 255, 65, 0.6)" },
                },
                "scan-line": {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(100%)" },
                },
                "flicker": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.8" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
