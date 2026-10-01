import { Head, Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, PieChart, Pie, Cell, Tooltip,
    ResponsiveContainer, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    TrendingUp, TrendingDown, Wallet, ArrowUpRight,
    ArrowDownRight, Activity, ChevronRight, Target,
    Calendar, Sparkles, Building2, Smartphone, Bitcoin, Banknote, ShieldCheck, CheckCircle2
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function formatCurrency(amount, currency = 'IDR') {
    if (currency === 'IDR') {
        return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.abs(amount));
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency', currency, maximumFractionDigits: 0
    }).format(Math.abs(amount));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatCompact(amount) {
    if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`;
    if (Math.abs(amount) >= 1_000_000)     return `${(amount / 1_000_000).toFixed(1)}jt`;
    if (Math.abs(amount) >= 1_000)         return `${(amount / 1_000).toFixed(0)}rb`;
    return String(amount);
}

const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

function MetricCard({ title, value, change, prevValue, prevMonthLabel, icon: Icon, variant = 'default', currency = 'IDR', prefix }) {
    const isPositive = change >= 0;

    const iconStyle = {
        emerald:  'bg-emerald-50 text-emerald-600 border-emerald-100',
        sapphire: 'bg-blue-50 text-blue-600 border-blue-100',
        gold:     'bg-amber-50 text-amber-600 border-amber-100',
        crimson:  'bg-rose-50 text-rose-600 border-rose-100',
        default:  'bg-slate-100 text-slate-700 border-slate-200',
    }[variant];

    return (
        <motion.div variants={itemVariants} className="glass-card-hover p-6 bg-white border border-slate-200 flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-xl border ${iconStyle}`}>
                        <Icon size={18} strokeWidth={2.2} />
                    </div>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                            isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                        }`}>
                            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                            {Math.abs(change)}%
                        </div>
                    )}
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-display font-extrabold text-slate-900 font-mono tracking-tight">
                    {prefix && <span className="text-base text-slate-400 mr-0.5">{prefix}</span>}
                    {formatCurrency(value, currency)}
                </p>
            </div>

            {prevValue !== undefined && (
                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{prevMonthLabel ? `Bulan lalu (${prevMonthLabel})` : 'Bulan lalu'}:</span>
                    <span className="font-semibold text-slate-700 font-mono">{formatCurrency(prevValue, currency)}</span>
                </div>
            )}
        </motion.div>
    );
}

function ChartTooltip({ active, payload, label }) {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xl text-xs space-y-1">
                <p className="font-bold text-slate-700 mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="flex items-center gap-2" style={{ color: p.color }}>
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        <span className="font-medium text-slate-600">{p.name}:</span>
                        <span className="font-mono font-bold text-slate-900">{formatCurrency(p.value)}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

function WalletCardItem({ wallet }) {
    const iconMap = {
        bank:     Building2,
        'e-wallet': Smartphone,
        crypto:   Bitcoin,
        cash:     Banknote,
    };
    const Icon = iconMap[wallet.type] ?? Wallet;

    return (
        <motion.div
            variants={itemVariants}
            className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden"
        >
            <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: wallet.color ?? '#2563EB' }}
            />
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 truncate">{wallet.name}</span>
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs"
                    style={{ backgroundColor: `${wallet.color ?? '#2563EB'}15`, color: wallet.color ?? '#2563EB' }}
                >
                    <Icon size={14} />
                </div>
            </div>
            <p className="text-lg font-bold font-mono text-slate-900">{formatCurrency(wallet.balance, wallet.currency)}</p>
            <p className="text-[11px] text-slate-400 capitalize mt-0.5">{wallet.type_label}</p>
        </motion.div>
    );
}

export default function Dashboard({
    metrics,
    cashFlowData,
    categoryBreakdown,
    recentTransactions,
    wallets,
    budgets,
    goals,
    healthScore,
    currentMonth
}) {
    const DEFAULT_COLORS = ['#059669', '#2563EB', '#D97706', '#E11D48', '#8B5CF6', '#06B6D4'];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-900">Ringkasan Portofolio</h2>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} className="text-slate-400" /> Periode {currentMonth}
                        </p>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard — FinanceOS" />

            <div className="space-y-6">
                {/* ── Key Metrics ──────────────────────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Kekayaan (Aset)"
                        value={metrics?.total_balance ?? 0}
                        icon={Wallet}
                        variant="gold"
                    />
                    <MetricCard
                        title="Pemasukan Bulan Ini"
                        value={metrics?.current_income ?? 0}
                        change={metrics?.income_change}
                        prevValue={metrics?.prev_income}
                        prevMonthLabel={metrics?.prev_month_label}
                        icon={TrendingUp}
                        variant="emerald"
                    />
                    <MetricCard
                        title="Pengeluaran Bulan Ini"
                        value={metrics?.current_expense ?? 0}
                        change={metrics?.expense_change}
                        prevValue={metrics?.prev_expense}
                        prevMonthLabel={metrics?.prev_month_label}
                        icon={TrendingDown}
                        variant="crimson"
                    />
                    <MetricCard
                        title="Net Cash Flow"
                        value={Math.abs(metrics?.net_cash_flow ?? 0)}
                        icon={Activity}
                        variant={metrics?.net_cash_flow >= 0 ? 'emerald' : 'crimson'}
                        prefix={metrics?.net_cash_flow >= 0 ? '+' : '-'}
                    />
                </div>

                {/* ── AI Financial Health Scorecard Banner ──────────────────── */}
                {healthScore && (
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden"
                    >
                        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                            {/* Score Gauge */}
                            <div className="lg:col-span-4 flex items-center gap-5">
                                <div className="w-20 h-20 rounded-2xl bg-white/10 border border-white/20 flex flex-col items-center justify-center flex-shrink-0 shadow-inner">
                                    <span className="text-3xl font-extrabold font-display font-mono text-emerald-400">
                                        {healthScore.score}
                                    </span>
                                    <span className="text-[10px] text-slate-300 font-semibold uppercase tracking-wider">/ 100</span>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${healthScore.grade.bg}`}>
                                            Grade {healthScore.grade.letter}
                                        </span>
                                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                                            <ShieldCheck size={14} /> AI Verified
                                        </span>
                                    </div>
                                    <h4 className="font-display font-bold text-white text-base leading-tight">
                                        {healthScore.grade.label}
                                    </h4>
                                    <p className="text-[11px] text-slate-300 mt-0.5">
                                        Tabungan: {healthScore.savings_rate} • Dana Darurat: {healthScore.months_covered}
                                    </p>
                                </div>
                            </div>

                            {/* 4 Pillars Progress */}
                            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
                                {healthScore.breakdown.map((item, idx) => (
                                    <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                                        <div className="flex justify-between text-[11px] font-medium text-slate-300 mb-1">
                                            <span>{item.name}</span>
                                            <span className="font-mono text-white font-bold">{item.score}/{item.max}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-emerald-400"
                                                style={{ width: `${(item.score / item.max) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* AI Action Tip */}
                            <div className="lg:col-span-3 border-l border-white/10 pl-4">
                                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mb-1">
                                    <Sparkles size={13} /> Saran Optimalisasi AI
                                </span>
                                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                                    {healthScore.tips[0]}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── Charts Row ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Cash Flow Area Chart */}
                    <div className="xl:col-span-2 glass-card p-6 bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="section-header">Tren Arus Kas</h3>
                                <p className="section-subheader">Perbandingan pemasukan vs pengeluaran (6 bulan)</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-semibold">
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                    <span>Pemasukan</span>
                                </span>
                                <span className="flex items-center gap-1.5 text-slate-600">
                                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                                    <span>Pengeluaran</span>
                                </span>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: 230 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={cashFlowData ?? []} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                                    <defs>
                                        <linearGradient id="whiteThemeIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#059669" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="whiteThemeExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%"  stopColor="#E11D48" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#E11D48" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false}
                                           tickFormatter={v => formatCompact(v)} />
                                    <Tooltip content={<ChartTooltip />} />
                                    <Area type="monotone" dataKey="income" name="Pemasukan"
                                          stroke="#059669" strokeWidth={2.5}
                                          fill="url(#whiteThemeIncome)" />
                                    <Area type="monotone" dataKey="expense" name="Pengeluaran"
                                          stroke="#E11D48" strokeWidth={2.5}
                                          fill="url(#whiteThemeExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Category Breakdown Pie Chart */}
                    <div className="glass-card p-6 bg-white border border-slate-200">
                        <h3 className="section-header mb-1">Pos Pengeluaran</h3>
                        <p className="section-subheader mb-4">Distribusi bulan ini</p>

                        {categoryBreakdown?.length > 0 ? (
                            <>
                                <div style={{ width: '100%', height: 150 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={categoryBreakdown}
                                                cx="50%" cy="50%"
                                                innerRadius={45} outerRadius={68}
                                                paddingAngle={3}
                                                dataKey="total"
                                            >
                                                {categoryBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => [formatCurrency(value), 'Total']} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="space-y-2 mt-3">
                                    {categoryBreakdown.slice(0, 4).map((cat, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                                                <span className="text-slate-600 font-medium truncate max-w-[110px]">{cat.name}</span>
                                            </div>
                                            <span className="font-mono font-bold text-slate-800">{cat.percentage}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="h-44 flex items-center justify-center text-xs text-slate-400">
                                Belum ada data pengeluaran
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Financial Goals Preview ───────────────────────────────── */}
                {goals?.length > 0 && (
                    <div className="glass-card p-6 bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="section-header">Target Impian & Tabungan</h3>
                                <p className="section-subheader">Pantau progres pencapaian aset impian Anda</p>
                            </div>
                            <Link href="/goals" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                                Lihat semua impian <ChevronRight size={13} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {goals.map(g => (
                                <div key={g.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5 truncate">
                                            <span>{g.icon}</span> {g.name}
                                        </span>
                                        <span className="text-[11px] font-bold font-mono text-emerald-600">{g.percentage}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="h-full rounded-full"
                                            style={{ width: `${g.percentage}%`, backgroundColor: g.color }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                                        <span>{formatCurrency(g.current_amount)}</span>
                                        <span className="text-slate-400">Target: {formatCurrency(g.target_amount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Wallets Section ───────────────────────────────────────── */}
                {wallets?.length > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="section-header">Portofolio Dompet & Aset</h3>
                            <Link href="/wallets" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                                Kelola dompet <ChevronRight size={13} />
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {wallets.map(w => <WalletCardItem key={w.id} wallet={w} />)}
                        </div>
                    </div>
                )}

                {/* ── Bottom Section: Recent Transactions & Budgets ─────────── */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {/* Recent Transactions */}
                    <div className="glass-card p-6 bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="section-header">Transaksi Terakhir</h3>
                            <Link href="/transactions" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                                Semua riwayat <ChevronRight size={13} />
                            </Link>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {recentTransactions?.length > 0 ? (
                                recentTransactions.map((tx) => {
                                    const isIncome = tx.type === 'income';
                                    return (
                                        <div key={tx.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                                    isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                }`}>
                                                    {isIncome ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{tx.merchant_name || tx.description || 'Transaksi'}</p>
                                                    <p className="text-xs text-slate-400">{tx.category?.name ?? 'Lainnya'} • {tx.wallet?.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`text-sm font-mono font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                                                    {isIncome ? '+' : '-'}{formatCompact(tx.amount)}
                                                </p>
                                                <p className="text-[11px] text-slate-400">{formatDate(tx.date)}</p>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center py-8 text-sm text-slate-400">Belum ada transaksi</p>
                            )}
                        </div>
                    </div>

                    {/* Budgets Overview */}
                    <div className="glass-card p-6 bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="section-header">Realisasi Anggaran</h3>
                            <Link href="/budgets" className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                                Atur target <ChevronRight size={13} />
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {budgets?.length > 0 ? (
                                budgets.map((b) => {
                                    const pct = b.percentage_used ?? 0;
                                    const barColor = b.is_over_budget ? '#E11D48' : pct > 80 ? '#D97706' : '#059669';
                                    return (
                                        <div key={b.id} className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-semibold">
                                                <span className="text-slate-700">{b.category?.name}</span>
                                                <span className="font-mono text-slate-500">{formatCompact(b.spent_amount)} / {formatCompact(b.limit_amount)}</span>
                                            </div>
                                            <div className="progress-bar-track">
                                                <div className="progress-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-center py-8 text-sm text-slate-400">Belum ada anggaran bulan ini</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
