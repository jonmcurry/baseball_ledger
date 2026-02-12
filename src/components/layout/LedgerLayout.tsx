import React from 'react';

interface LedgerLayoutProps {
    children: React.ReactNode;
}

export default function LedgerLayout({ children }: LedgerLayoutProps) {
    return (
        <div className="min-h-screen font-body text-ink bg-cream selection:bg-gold selection:text-ink flex flex-col">
            {/* Decorative Spine */}
            <div className="fixed left-0 top-0 bottom-0 w-2 md:w-3 bg-gradient-to-r from-leather-dark to-leather z-50 shadow-2xl" />
            <div className="fixed left-2 md:left-3 top-0 bottom-0 w-1 bg-gradient-to-r from-black/20 to-transparent z-40" />

            {/* Main Content Area */}
            <div className="flex-1 ml-3 md:ml-4 relative">
                {/* Paper Grain Overlay (if not in body) */}

                {/* Header / Binding */}
                <header className="sticky top-0 z-30 bg-parchment/95 backdrop-blur border-b-2 border-leather shadow-card-depth px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-stitch rounded-full flex items-center justify-center text-cream shadow-inner border-2 border-leather-dark">
                            <span className="font-display font-bold text-lg leading-none pt-1">BL</span>
                        </div>
                        <h1 className="font-headline text-xl md:text-2xl font-bold text-ink tracking-tight">
                            Baseball<span className="text-stitch">Ledger</span>
                        </h1>
                    </div>

                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#" className="font-headline font-semibold text-ink-light hover:text-stitch transition-colors decoration-2 hover:underline underline-offset-4">Dashboard</a>
                        <a href="#" className="font-headline font-semibold text-ink-light hover:text-stitch transition-colors decoration-2 hover:underline underline-offset-4">Roster</a>
                        <a href="#" className="font-headline font-semibold text-ink-light hover:text-stitch transition-colors decoration-2 hover:underline underline-offset-4">Stats</a>
                        <a href="#" className="font-headline font-semibold text-ink-light hover:text-stitch transition-colors decoration-2 hover:underline underline-offset-4">League</a>
                    </nav>

                    <button className="md:hidden text-ink hover:text-stitch">
                        {/* Simple Menu Icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                </header>

                {/* Content Container */}
                <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
                    <div className="vintage-card p-6 md:p-8 min-h-[80vh]">
                        <div className="vintage-card-header mb-6 -mx-6 -mt-6 md:-mx-8 md:-mt-8 flex justify-between items-center">
                            <span className="uppercase tracking-widest font-bold text-sm text-gold-light">Vol. 2026</span>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-stitch shadow-inner border border-black/20"></div>
                                <div className="w-3 h-3 rounded-full bg-gold shadow-inner border border-black/20"></div>
                            </div>
                        </div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
