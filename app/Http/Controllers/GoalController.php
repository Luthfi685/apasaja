<?php

namespace App\Http\Controllers;

use App\Models\Goal;
use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class GoalController extends Controller
{
    public function index(): Response
    {
        $user = Auth::user();
        $now = Carbon::now();

        $goals = $user->goals()
            ->latest()
            ->get()
            ->map(function ($g) {
                $daysLeft = $g->days_remaining_by_daily;
                $monthsLeft = $daysLeft ? round($daysLeft / 30, 1) : null;

                return [
                    'id'                        => $g->id,
                    'name'                      => $g->name,
                    'target_amount'             => (float) $g->target_amount,
                    'daily_target'              => $g->daily_target ? (float) $g->daily_target : null,
                    'current_amount'            => (float) $g->current_amount,
                    'remaining'                 => $g->remaining,
                    'percentage'                => $g->percentage,
                    'target_date'               => $g->target_date ? $g->target_date->format('Y-m-d') : null,
                    'last_deposit_at'           => $g->last_deposit_at ? $g->last_deposit_at->format('Y-m-d') : null,
                    'streak_count'              => (int) $g->streak_count,
                    'is_deposited_today'        => $g->is_deposited_today,
                    'missed_days'               => $g->missed_days,
                    'missed_amount'             => $g->daily_target ? $g->missed_days * (float)$g->daily_target : 0,
                    'days_remaining_by_daily'   => $daysLeft,
                    'months_remaining_by_daily' => $monthsLeft,
                    'estimated_completion_date' => $g->estimated_completion_date,
                    'icon'                      => $g->icon ?? 'Target',
                    'color'                     => $g->color ?? '#2563EB',
                    'is_completed'              => $g->is_completed,
                    'status'                    => $g->status,
                    'is_physical_savings'       => (bool) $g->is_physical_savings,
                ];
            });

        $wallets = $user->wallets()->get(['id', 'name', 'balance', 'type']);
        $monthlySavings = max(0, $user->getMonthlyIncome($now->month, $now->year) - $user->getMonthlyExpense($now->month, $now->year));

        return Inertia::render('Goals/Index', [
            'goals'          => $goals,
            'wallets'        => $wallets,
            'monthlySavings' => $monthlySavings,
            'totalSaved'     => (float) $goals->sum('current_amount'),
            'totalTarget'    => (float) $goals->sum('target_amount'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'                 => 'required|string|max:100',
            'target_amount'        => 'required|numeric|min:1000',
            'daily_target'         => 'nullable|numeric|min:1000',
            'current_amount'       => 'nullable|numeric|min:0',
            'target_date'          => 'nullable|date',
            'icon'                 => 'nullable|string|max:10',
            'color'                => 'nullable|string|max:20',
            'is_physical_savings'  => 'boolean',
        ]);

        Auth::user()->goals()->create($validated);

        $type = ($validated['is_physical_savings'] ?? false) ? 'Celengan fisik' : 'Target tabungan impian';
        return back()->with('success', "{$type} berhasil dibuat!");
    }

    /**
     * Deposit into a goal.
     * - Physical savings (celengan): just add to current_amount, NO wallet deduction.
     * - Digital goal: deduct from selected wallet and log a transaction.
     */
    public function deposit(Request $request, Goal $goal): RedirectResponse
    {
        if ($goal->user_id !== Auth::id()) abort(403);

        $isPhysical = (bool) $goal->is_physical_savings;

        $validated = $request->validate([
            'wallet_id' => $isPhysical ? 'nullable' : 'required|exists:wallets,id',
            'amount'    => 'required|numeric|min:1000',
        ]);

        $user   = Auth::user();
        $amount = (float) $validated['amount'];
        $wallet = null;

        if (!$isPhysical) {
            $wallet = $user->wallets()->findOrFail($validated['wallet_id']);
            
            if (!$wallet) {
                return back()->with('error', 'Dompet tidak ditemukan.');
            }
            
            if ($wallet->balance < $amount) {
                return back()->with('error', "Saldo dompet {$wallet->name} tidak mencukupi (Rp " . number_format($wallet->balance, 0, ',', '.') . ").");
            }
        }

        DB::beginTransaction();
        try {
            // Deduct wallet only for digital goals
            if (!$isPhysical && $wallet) {
                $wallet->decrement('balance', $amount);
            }

            // Streak calculation
            $today       = Carbon::now()->startOfDay();
            $lastDeposit = $goal->last_deposit_at ? Carbon::parse($goal->last_deposit_at)->startOfDay() : null;

            $newStreak = $goal->streak_count;
            if (!$lastDeposit) {
                $newStreak = 1;
            } elseif ($lastDeposit->isYesterday()) {
                $newStreak += 1;
            } elseif (!$lastDeposit->isToday()) {
                $newStreak = 1;
            }

            // Add to goal
            $goal->increment('current_amount', $amount);
            $goal->refresh();

            $goal->update([
                'last_deposit_at' => $today->toDateString(),
                'streak_count'    => $newStreak,
                'status'          => ($goal->current_amount >= $goal->target_amount) ? 'completed' : 'active',
            ]);

            // Only log transaction for digital goals (physical savings have no wallet effect)
            if (!$isPhysical && $wallet) {
                Transaction::create([
                    'user_id'         => $user->id,
                    'wallet_id'       => $wallet->id,
                    'category_id'     => null,
                    'type'            => 'expense',
                    'amount'          => $amount,
                    'merchant_name'   => "Setor Target: {$goal->name}",
                    'description'     => "Alokasi tabungan untuk target '{$goal->name}'",
                    'date'            => now()->toDateString(),
                    'currency'        => $wallet->currency ?? 'IDR',
                    'is_ai_generated' => false,
                ]);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Gagal memproses setoran: ' . $e->getMessage());
        }

        $label = $isPhysical ? 'Celengan' : 'Target';
        return back()->with('success', "{$label} **{$goal->name}**: Rp " . number_format($amount, 0, ',', '.') . " berhasil dicatat!");
    }

    public function update(Request $request, Goal $goal): RedirectResponse
    {
        if ($goal->user_id !== Auth::id()) abort(403);

        $validated = $request->validate([
            'name'                => 'required|string|max:100',
            'target_amount'       => 'required|numeric|min:1000',
            'daily_target'        => 'nullable|numeric|min:1000',
            'current_amount'      => 'nullable|numeric|min:0',
            'target_date'         => 'nullable|date',
            'icon'                => 'nullable|string|max:10',
            'color'               => 'nullable|string|max:20',
            'is_physical_savings' => 'boolean',
        ]);

        $goal->update($validated);

        return back()->with('success', 'Target tabungan diperbarui.');
    }

    public function destroy(Goal $goal): RedirectResponse
    {
        if ($goal->user_id !== Auth::id()) abort(403);

        $goal->delete();

        return back()->with('success', 'Target tabungan berhasil dihapus.');
    }
}
