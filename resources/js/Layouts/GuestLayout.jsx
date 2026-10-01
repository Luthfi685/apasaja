import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { ArrowUpRight, BarChart3, ShieldCheck, TrendingUp } from 'lucide-react';

export default function GuestLayout({ children }) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 relative overflow-hidden lg:grid lg:grid-cols-2">
            <div className="absolute -top-28 -left-24 h-80 w-80 rounded-full bg-blue-100 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/3 h-72 w-72 rounded-full bg-sky-100 blur-3xl pointer-events-none" />

            <section className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 p-12 xl:p-16 text-white flex-col justify-between">
                <div className="absolute -right-28 -top-24 h-96 w-96 rounded-full border border-white/15" />
                <div className="absolute -right-12 -top-8 h-80 w-80 rounded-full border border-white/15" />
                <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-white/10 blur-2xl" />

                <Link href="/" className="relative inline-flex w-fit items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-blue-600 shadow-lg shadow-blue-950/20">
                        <TrendingUp size={23} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-display font-extrabold tracking-tight">FinanceOS</h1>
                        <p className="text-xs font-medium text-blue-100">Personal finance, made clear</p>
                    </div>
                </Link>

                <div className="relative max-w-lg">
                    <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                        <ShieldCheck size={14} /> Ruang finansial pribadi Anda
                    </span>
                    <h2 className="font-display text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                        Kendalikan uang.<br />Tenangkan pikiran.
                    </h2>
                    <p className="mt-5 max-w-md text-base leading-relaxed text-blue-100">
                        Lacak arus kas, atur target, dan pahami kondisi finansial dari satu dashboard yang rapi.
                    </p>

                    <div className="mt-10 grid max-w-md grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                            <BarChart3 size={20} className="text-sky-100" />
                            <p className="mt-4 text-sm font-semibold">Arus kas jelas</p>
                            <p className="mt-1 text-xs text-blue-100">Pantau setiap rupiah.</p>
                        </div>
                        <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                            <ArrowUpRight size={20} className="text-sky-100" />
                            <p className="mt-4 text-sm font-semibold">Target terukur</p>
                            <p className="mt-1 text-xs text-blue-100">Bangun masa depan.</p>
                        </div>
                    </div>
                </div>

                <p className="relative text-xs font-medium text-blue-100">© {new Date().getFullYear()} FinanceOS</p>
            </section>

            <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-12 xl:px-20">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mb-8 flex justify-center lg:hidden"
                    >
                        <Link href="/" className="inline-flex items-center gap-2.5">
                            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                                <TrendingUp size={20} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="font-display text-xl font-extrabold tracking-tight text-slate-900">Finance<span className="text-blue-600">OS</span></h1>
                                <p className="text-[11px] font-medium text-slate-400">Wealth & cashflow</p>
                            </div>
                        </Link>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.05 }}
                        className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-blue-950/5 sm:p-8"
                    >
                        {children}
                    </motion.div>

                    <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-slate-400">
                        <ShieldCheck size={14} className="text-blue-500" /> Data Anda terlindungi dan privat
                    </p>
                </div>
            </main>
        </div>
    );
}
