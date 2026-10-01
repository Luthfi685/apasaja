<?php

namespace App\Http\Controllers;

use App\Models\Budget;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BudgetController extends Controller
{
    public function index(): Response
    {
        $now = now();

        $budgets = Auth::user()->budgets()
            ->with('category:id,name,icon,color,type')
            ->where('month', $now->month)
            ->where('year', $now->year)
            ->get();

        // Preload all spent amounts in single query to avoid N+1
        $budgetIds = $budgets->pluck('id');
        $categoryIds = $budgets->pluck('category_id');
        
        $spentAmounts = DB::table('transactions')
            ->select('category_id', DB::raw('SUM(amount) as total'))
            ->where('user_id', Auth::id())
            ->where('type', 'expense')
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->whereIn('category_id', $categoryIds)
            ->groupBy('category_id')
            ->pluck('total', 'category_id');

        $budgets = $budgets->map(function($b) use ($spentAmounts) {
            $spent = (float) ($spentAmounts[$b->category_id] ?? 0);
            $remaining = max(0, $b->limit_amount - $spent);
            $percentageUsed = $b->limit_amount > 0 ? min(100, ($spent / $b->limit_amount) * 100) : 0;
            
            return array_merge($b->toArray(), [
                'spent_amount'    => $spent,
                'remaining'       => $remaining,
                'percentage_used' => $percentageUsed,
                'is_over_budget'  => $spent > $b->limit_amount,
            ]);
        });

        $categories = Auth::user()->categories()
            ->where('type', 'expense')
            ->orderBy('name')
            ->get(['id', 'name', 'icon', 'color']);

        return Inertia::render('Budgets/Index', [
            'budgets'    => $budgets,
            'categories' => $categories,
            'currentPeriod' => $now->translatedFormat('F Y'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'category_id'  => ['required', 'integer', 'exists:categories,id'],
            'limit_amount' => ['required', 'numeric', 'gt:0'],
            'currency'     => ['required', 'string', 'size:3'],
            'month'        => ['required', 'integer', 'between:1,12'],
            'year'         => ['required', 'integer', 'min:2020'],
        ]);

        $data['user_id'] = Auth::id();

        Budget::updateOrCreate(
            [
                'user_id'     => Auth::id(),
                'category_id' => $data['category_id'],
                'month'       => $data['month'],
                'year'        => $data['year'],
            ],
            $data
        );

        return back()->with('success', 'Anggaran berhasil disimpan.');
    }

    public function update(Request $request, Budget $budget): RedirectResponse
    {
        $this->authorize('update', $budget);

        $data = $request->validate([
            'limit_amount' => ['required', 'numeric', 'gt:0'],
            'currency'     => ['required', 'string', 'size:3'],
        ]);

        $budget->update($data);

        return back()->with('success', 'Anggaran berhasil diperbarui.');
    }

    public function destroy(Budget $budget): RedirectResponse
    {
        $this->authorize('delete', $budget);
        $budget->delete();
        return back()->with('success', 'Anggaran dihapus.');
    }
}
