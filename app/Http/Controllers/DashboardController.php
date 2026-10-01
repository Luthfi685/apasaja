<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $now  = Carbon::now();
        $currentMonth = $now->month;
        $currentYear  = $now->year;
        $prevMonth    = $now->copy()->subMonth()->month;
        $prevYear     = $now->copy()->subMonth()->year;

        // ─── Key Metrics & Cash Flow (single-query optimization) ──────────────

        $totalBalance = (float) $user->wallets()->sum('balance');

        $sixMonthsStart = $now->copy()->subMonths(5)->startOfMonth()->toDateString();
        $sixMonthsTransactions = $user->transactions()
            ->whereDate('date', '>=', $sixMonthsStart)
            ->get(['date', 'type', 'amount']);

        $cashFlowData = collect(range(5, 0))->map(function ($monthsAgo) use ($sixMonthsTransactions, $now) {
            $date   = $now->copy()->subMonths($monthsAgo);
            $year   = (int) $date->year;
            $month  = (int) $date->month;

            $monthTxs = $sixMonthsTransactions->filter(function ($tx) use ($year, $month) {
                $d = Carbon::parse($tx->date);
                return (int) $d->year === $year && (int) $d->month === $month;
            });

            $income  = (float) $monthTxs->where('type', 'income')->sum('amount');
            $expense = (float) $monthTxs->where('type', 'expense')->sum('amount');

            return [
                'month'   => $date->translatedFormat('M Y'),
                'income'  => $income,
                'expense' => $expense,
                'net'     => $income - $expense,
            ];
        });

        $currentMonthData = $cashFlowData->last() ?? ['income' => 0, 'expense' => 0];
        $currentIncome  = $currentMonthData['income'];
        $currentExpense = $currentMonthData['expense'];

        $prevMonthData  = $cashFlowData->count() >= 2 ? $cashFlowData->slice(-2, 1)->first() : null;
        $prevIncome     = $prevMonthData ? $prevMonthData['income'] : 0;
        $prevExpense    = $prevMonthData ? $prevMonthData['expense'] : 0;

        $netCashFlow = $currentIncome - $currentExpense;

        // ─── Category Expense Breakdown ───────────────────────────────────────

        $categoryBreakdown = $user->transactions()
            ->with('category:id,name,icon,color')
            ->where('type', 'expense')
            ->whereMonth('date', $currentMonth)
            ->whereYear('date', $currentYear)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(fn($row) => [
                'name'       => $row->category?->name ?? 'Lainnya',
                'color'      => $row->category?->color ?? '#6B7280',
                'icon'       => $row->category?->icon ?? 'MoreHorizontal',
                'total'      => (float) $row->total,
                'percentage' => $currentExpense > 0
                    ? round(($row->total / $currentExpense) * 100, 1)
                    : 0,
            ]);

        // ─── Recent Transactions ──────────────────────────────────────────────

        $recentTransactions = $user->transactions()
            ->with(['wallet:id,name,color,currency', 'category:id,name,icon,color'])
            ->latest('date')
            ->latest('id')
            ->limit(8)
            ->get();

        // ─── Wallets Summary ──────────────────────────────────────────────────

        $wallets = $user->wallets()->latest()->get();

        // ─── Budget Overview ──────────────────────────────────────────────────

        $budgets = $user->budgets()
            ->with('category:id,name,icon,color')
            ->where('month', $currentMonth)
            ->where('year', $currentYear)
            ->get()
            ->map(fn($budget) => [
                'id'              => $budget->id,
                'category'        => $budget->category,
                'limit_amount'    => (float) $budget->limit_amount,
                'spent_amount'    => $budget->spent_amount,
                'remaining'       => $budget->remaining,
                'percentage_used' => $budget->percentage_used,
                'is_over_budget'  => $budget->is_over_budget,
            ]);

        // ─── Financial Goals Summary ──────────────────────────────────────────

        $goals = $user->goals()->latest()->limit(3)->get()->map(fn($g) => [
            'id'             => $g->id,
            'name'           => $g->name,
            'target_amount'  => (float) $g->target_amount,
            'current_amount' => (float) $g->current_amount,
            'percentage'     => $g->percentage,
            'icon'           => $g->icon ?? 'Target',
            'color'          => $g->color ?? '#2563EB',
        ]);

        // ─── AI Financial Health Score (0 - 100) ───────────────────────────────

        $healthScore = $this->calculateHealthScore($totalBalance, $currentIncome, $currentExpense, $budgets);

        return Inertia::render('Dashboard', [
            'metrics' => [
                'total_balance'    => (float) $totalBalance,
                'current_income'   => $currentIncome,
                'current_expense'  => $currentExpense,
                'prev_income'      => $prevIncome,
                'prev_expense'     => $prevExpense,
                'prev_month_label' => $now->copy()->subMonth()->translatedFormat('M Y'),
                'net_cash_flow'    => $netCashFlow,
                'income_change'    => $this->percentageChange($prevIncome, $currentIncome),
                'expense_change'   => $this->percentageChange($prevExpense, $currentExpense),
            ],
            'cashFlowData'       => $cashFlowData,
            'categoryBreakdown'  => $categoryBreakdown,
            'recentTransactions' => $recentTransactions,
            'wallets'            => $wallets,
            'budgets'            => $budgets,
            'goals'              => $goals,
            'healthScore'        => $healthScore,
            'currentMonth'       => $now->translatedFormat('F Y'),
        ]);
    }

    private function calculateHealthScore(float $balance, float $income, float $expense, $budgets): array
    {
        $savingsRate = $income > 0 ? (($income - $expense) / $income) * 100 : 0;
        $monthsCovered = $expense > 0 ? $balance / $expense : ($balance > 0 ? 6 : 0);

        // 1. Savings Rate Score (Max 30)
        $scoreSavings = match(true) {
            $savingsRate >= 30 => 30,
            $savingsRate >= 20 => 25,
            $savingsRate >= 10 => 18,
            $savingsRate > 0   => 10,
            default            => 0,
        };

        // 2. Emergency Fund Readiness (Max 30)
        $scoreEmergency = match(true) {
            $monthsCovered >= 6 => 30,
            $monthsCovered >= 3 => 24,
            $monthsCovered >= 1 => 15,
            $balance > 0        => 8,
            default             => 0,
        };

        // 3. Budget Discipline (Max 25)
        $totalBudgets = $budgets->count();
        $overBudgetCount = $budgets->where('is_over_budget', true)->count();
        if ($totalBudgets === 0) {
            $scoreBudget = 18; // neutral
        } else {
            $scoreBudget = round((($totalBudgets - $overBudgetCount) / $totalBudgets) * 25);
        }

        // 4. Cash Flow Health (Max 15)
        $scoreCashFlow = ($income >= $expense && $income > 0) ? 15 : ($income > 0 ? 5 : 0);

        $totalScore = min(100, max(0, $scoreSavings + $scoreEmergency + $scoreBudget + $scoreCashFlow));

        $grade = match(true) {
            $totalScore >= 85 => ['letter' => 'A', 'label' => 'Prima & Sangat Tangguh', 'color' => '#059669', 'bg' => 'bg-emerald-50 text-emerald-700 border-emerald-200'],
            $totalScore >= 70 => ['letter' => 'B', 'label' => 'Sehat & Terkendali',    'color' => '#2563EB', 'bg' => 'bg-blue-50 text-blue-700 border-blue-200'],
            $totalScore >= 50 => ['letter' => 'C', 'label' => 'Cukup (Perlu Optimasi)', 'color' => '#D97706', 'bg' => 'bg-amber-50 text-amber-700 border-amber-200'],
            default           => ['letter' => 'D', 'label' => 'Perhatian Khusus',       'color' => '#DC2626', 'bg' => 'bg-rose-50 text-rose-700 border-rose-200'],
        };

        $tips = [];
        if ($scoreSavings < 25) $tips[] = 'Tingkatkan rasio tabungan minimal 20% dari total pemasukan.';
        if ($scoreEmergency < 24) $tips[] = 'Kumpulkan dana darurat hingga mencapai 3–6x biaya hidup bulanan.';
        if ($overBudgetCount > 0) $tips[] = "Ada {$overBudgetCount} pos anggaran over-budget yang perlu ditekan.";
        if (empty($tips)) $tips[] = 'Kondisi finansial Anda sangat luar biasa! Pertahankan alokasi investasi konsisten.';

        return [
            'score'          => (int) $totalScore,
            'grade'          => $grade,
            'savings_rate'   => round($savingsRate, 1) . '%',
            'months_covered' => round($monthsCovered, 1) . ' Bulan',
            'breakdown'      => [
                ['name' => 'Rasio Tabungan', 'score' => $scoreSavings, 'max' => 30],
                ['name' => 'Dana Darurat',   'score' => $scoreEmergency, 'max' => 30],
                ['name' => 'Disiplin Budget', 'score' => $scoreBudget, 'max' => 25],
                ['name' => 'Arus Kas Positif', 'score' => $scoreCashFlow, 'max' => 15],
            ],
            'tips' => $tips,
        ];
    }

    private function percentageChange(float $old, float $new): float
    {
        if ($old === 0.0 || $old === 0) return $new > 0 ? 100 : 0;
        return round((($new - $old) / $old) * 100, 1);
    }
}
