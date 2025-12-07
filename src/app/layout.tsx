import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SubSlayer - Slay Your Subscriptions",
    description: "Track and eliminate forgotten subscriptions. Paste your confirmation emails and let AI do the rest.",
    keywords: ["subscription tracker", "free trial", "money saver", "subscription management"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
