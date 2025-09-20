import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Web3Provider } from "./context/Web3Context";
import ConnectWalletButton from "./components/ConnectWalletButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GuardChain AI - Community-Governed Mutual Insurance",
  description: "Blockchain-native insurance on Arbitrum with AI-powered claims and transparent governance.",
  keywords: ["blockchain", "insurance", "DeFi", "Arbitrum", "mutual insurance", "community governance", "AI claims", "NFT policies"],
  authors: [{ name: "GuardChain AI Team" }],
  openGraph: {
    title: "GuardChain AI - Community-Governed Mutual Insurance",
    description: "Blockchain-native insurance on Arbitrum",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "GuardChain AI - Community-Governed Mutual Insurance",
    description: "Blockchain-native insurance on Arbitrum",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Add window.ethereum type declaration
              if (typeof window !== 'undefined') {
                window.ethereum = window.ethereum || {};
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Web3Provider>
          {/* Modern Glassmorphism Navigation */}
          <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-20">
                <div className="flex items-center">
                  <Link href="/" className="flex-shrink-0 group">
                    <h1 className="text-3xl font-bold gradient-text group-hover:scale-105 transition-transform duration-300">
                      GuardChain AI
                    </h1>
                  </Link>
                </div>
                
                {/* Desktop Navigation */}
                <div className="hidden md:block">
                  <div className="ml-10 flex items-baseline space-x-6">
                    <Link 
                      href="/dashboard" 
                      className="text-white/80 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-white/10 backdrop-blur-sm"
                    >
                      Dashboard
                    </Link>
                    <Link 
                      href="/policies" 
                      className="text-white/80 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-white/10 backdrop-blur-sm"
                    >
                      Policies
                    </Link>
                    <Link 
                      href="/claims" 
                      className="text-white/80 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-white/10 backdrop-blur-sm"
                    >
                      Claims
                    </Link>
                    <Link 
                      href="/governance" 
                      className="text-white/80 hover:text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-white/10 backdrop-blur-sm"
                    >
                      Governance
                    </Link>
                    <ConnectWalletButton />
                  </div>
                </div>

                {/* Mobile menu button */}
                <div className="md:hidden flex items-center space-x-2">
                  <ConnectWalletButton />
                  <button className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all duration-300">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </nav>
          
          {/* Main content with top padding for fixed nav */}
          <main className="pt-20 min-h-screen">
          {children}
          </main>

          {/* Floating particles background */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full floating-animation"></div>
            <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-white/30 rounded-full floating-animation" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-1/2 left-3/4 w-3 h-3 bg-white/10 rounded-full floating-animation" style={{animationDelay: '4s'}}></div>
            <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 bg-white/25 rounded-full floating-animation" style={{animationDelay: '1s'}}></div>
            <div className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-white/15 rounded-full floating-animation" style={{animationDelay: '3s'}}></div>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
