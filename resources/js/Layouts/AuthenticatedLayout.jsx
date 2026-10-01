import { lazy, Suspense, useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Wallet, ArrowLeftRight, Target,
    Bot, BarChart3, Settings, LogOut, Menu, X,
    ChevronRight, Bell, Search, TrendingUp, Sparkles,
    Trophy, Scissors, MessageSquare
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';

const FinancialCopilot = lazy(() => import('@/Components/FinancialCopilot'));

const navItems = [
    { href: '/',             label: 'Dashboard',     icon: LayoutDashboard },
    { href: '/transactions', label: 'Transaksi',     icon: ArrowLeftRight },
    { href: '/wallets',      label: 'Dompet & Aset', icon: Wallet },
    { href: '/goals',        label: 'Target Impian', icon: Target },
    { href: '/budgets',      label: 'Anggaran',      icon: BarChart3 },
    { href: '/split-bill',   label: 'Split Bill',    icon: Scissors },
    { href: '/achievements', label: 'Pencapaian',    icon: Trophy },
    { href: '/whatsapp-bot', label: 'WhatsApp Bot',  icon: MessageSquare, badge: 'AI' },
    { href: '/categories',   label: 'Kategori',      icon: Settings },
];

function SidebarContent({ user, currentPath, onNavClick }) {
    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200/80">
            {/* Brand Logo */}
            <div className="px-6 py-5 border-b border-slate-100">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                        <TrendingUp size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-base font-display font-bold text-slate-900 leading-tight">
                            Finance<span className="text-emerald-600">OS</span>
                        </h1>
                        <p className="text-[11px] font-medium text-slate-400">Wealth & Cashflow</p>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
                <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Menu</p>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = (item.href === '/' && (currentPath === '/' || currentPath === '/dashboard'))
                        || (item.href !== '/' && currentPath.startsWith(item.href));

                    return (
                        <Link key={item.href} href={item.href} prefetch="hover" onClick={onNavClick}>
                            <div className="relative">
                                {isActive && (
                                    <motion.div
                                        layoutId="activeNavPill"
                                        className="absolute inset-0 bg-slate-100 rounded-xl"
                                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                                    >
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-blue-600 rounded-r-full" />
                                    </motion.div>
                                )}
                                <div
                                    className={`relative z-10 flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                                        isActive ? 'text-slate-900 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                                    <span className="flex-1 text-sm">{item.label}</span>
                                    {item.badge && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
                                            {item.badge}
                                        </span>
                                    )}
                                    {isActive && <ChevronRight size={14} className="text-slate-400" />}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </nav>

            {/* Account & Session */}
            <div className="border-t border-slate-100 p-3">
                <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-700">{user?.name ?? 'Pengguna'}</p>
                        <p className="truncate text-[11px] text-slate-400">{user?.email ?? 'FinanceOS'}</p>
                    </div>
                </div>
                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    onClick={onNavClick}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-500 transition hover:bg-rose-50 hover:text-rose-600"
                >
                    <LogOut size={17} />
                    Keluar dari akun
                </Link>
                <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                        Sistem Aktif
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500">v1.0</span>
                </div>
            </div>
        </div>
    );
}

export default function AuthenticatedLayout({ children, header }) {
    const { auth } = usePage().props;
    const { url } = usePage();
    const currentPath = url.split('?')[0];

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [copilotOpen, setCopilotOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
            {/* Mobile Overlay */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </AnimatePresence>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 fixed inset-y-0 left-0 z-30">
                <SidebarContent user={auth?.user} currentPath={currentPath} onNavClick={() => {}} />
            </aside>

            {/* Mobile Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.aside
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-y-0 left-0 w-72 z-50 lg:hidden shadow-2xl bg-white"
                    >
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100 z-10 cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                        <SidebarContent user={auth?.user} currentPath={currentPath} onNavClick={() => setSidebarOpen(false)} />
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content Body */}
            <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
                {/* Navbar (Clean on both mobile and desktop) */}
                <header className={`sticky top-0 z-20 transition-all duration-200 bg-white/95 backdrop-blur-md ${
                    scrolled ? 'border-b border-slate-200/80 shadow-xs' : 'border-b border-slate-200/40'
                }`}>
                    <div className="flex items-center justify-between px-4 md:px-8 h-15">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                                aria-label="Buka Menu"
                            >
                                <Menu size={20} />
                            </button>

                            <Link href="/" prefetch="hover" className="flex items-center gap-2 lg:hidden">
                                <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
                                    <TrendingUp size={16} className="text-emerald-400" />
                                </div>
                                <span className="font-display font-bold text-slate-900 text-sm">
                                    Finance<span className="text-emerald-600">OS</span>
                                </span>
                            </Link>
                        </div>

                        {/* Top Right Quick Trigger */}
                        <div className="flex items-center gap-2">
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => setCopilotOpen(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer shadow-2xs"
                            >
                                <Sparkles size={14} className="text-emerald-600" />
                                <span>AI Copilot</span>
                            </motion.button>
                        </div>
                    </div>
                </header>

                {/* Main Viewport */}
                <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
                    {/* Render Page Header cleanly with mobile wrap */}
                    {header && (
                        <div className="mb-6">
                            {header}
                        </div>
                    )}

                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>

            {/* Floating AI Trigger */}
            <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCopilotOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl
                           bg-slate-900 text-white font-semibold text-sm shadow-xl hover:bg-slate-800 transition-all cursor-pointer"
            >
                <Bot size={18} className="text-emerald-400" />
                <span className="hidden sm:inline">Ask AI Advisor</span>
            </motion.button>

            {/* Slide-over Copilot */}
            {copilotOpen && (
                <Suspense fallback={null}>
                    <FinancialCopilot
                        isOpen={copilotOpen}
                        onClose={() => setCopilotOpen(false)}
                    />
                </Suspense>
            )}

            <Toaster
                position="bottom-right"
                toastOptions={{
                    style: {
                        background: '#0F172A',
                        color: '#FFFFFF',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                    },
                }}
            />
        </div>
    );
}
