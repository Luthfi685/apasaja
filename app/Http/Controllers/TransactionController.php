<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Models\Wallet;
use App\Http\Requests\TransactionRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = Auth::user();

        $query = $user
            ->transactions()
            ->with(['wallet:id,name,color,currency', 'category:id,name,icon,color'])
            ->latest('date')
            ->latest('id');

        // Default to current month if no date filter given
        $dateFrom = $request->filled('date_from') ? $request->date_from : now()->startOfMonth()->toDateString();
        $dateTo   = $request->filled('date_to')   ? $request->date_to   : now()->endOfMonth()->toDateString();

        $query->whereDate('date', '>=', $dateFrom)
              ->whereDate('date', '<=', $dateTo);

        // Additional Filters
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('wallet_id')) {
            $query->where('wallet_id', $request->wallet_id);
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('search')) {
            $query->where(function($q) use ($request) {
                $q->where('description', 'like', "%{$request->search}%")
                  ->orWhere('merchant_name', 'like', "%{$request->search}%");
            });
        }

        $transactions = $query->paginate(20)->withQueryString();

        return Inertia::render('Transactions/Index', [
            'transactions' => $transactions,
            'wallets'      => $user->wallets()->select('id', 'name', 'currency')->get(),
            'categories'   => $user->categories()->select('id', 'name', 'type', 'icon', 'color')->get(),
            'filters'      => array_merge(
                ['date_from' => $dateFrom, 'date_to' => $dateTo],
                $request->only(['type', 'wallet_id', 'category_id', 'search'])
            ),
        ]);
    }

    public function store(TransactionRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $data['user_id'] = Auth::id();

        DB::transaction(function () use ($data) {
            $transaction = Transaction::create($data);

            // Update wallet balance
            $wallet = Wallet::lockForUpdate()->find($data['wallet_id']);
            if ($data['type'] === 'income') {
                $wallet->increment('balance', $data['amount']);
            } elseif ($data['type'] === 'expense') {
                $wallet->decrement('balance', $data['amount']);
            }
        });

        return back()->with('success', 'Transaksi berhasil ditambahkan.');
    }

    public function update(TransactionRequest $request, Transaction $transaction): RedirectResponse
    {
        $this->authorize('update', $transaction);

        $oldData = $transaction->only(['amount', 'type', 'wallet_id']);
        $newData = $request->validated();

        DB::transaction(function () use ($transaction, $oldData, $newData) {
            // Reverse old wallet balance
            $oldWallet = Wallet::lockForUpdate()->find($oldData['wallet_id']);
            if ($oldData['type'] === 'income') {
                $oldWallet->decrement('balance', $oldData['amount']);
            } elseif ($oldData['type'] === 'expense') {
                $oldWallet->increment('balance', $oldData['amount']);
            }

            $transaction->update($newData);

            // Apply new wallet balance
            $newWallet = Wallet::lockForUpdate()->find($newData['wallet_id']);
            if ($newData['type'] === 'income') {
                $newWallet->increment('balance', $newData['amount']);
            } elseif ($newData['type'] === 'expense') {
                $newWallet->decrement('balance', $newData['amount']);
            }
        });

        return back()->with('success', 'Transaksi berhasil diperbarui.');
    }

    public function destroy(Transaction $transaction): RedirectResponse
    {
        $this->authorize('delete', $transaction);

        DB::transaction(function () use ($transaction) {
            // Reverse wallet balance
            $wallet = Wallet::lockForUpdate()->find($transaction->wallet_id);
            if ($transaction->type === 'income') {
                $wallet->decrement('balance', $transaction->amount);
            } elseif ($transaction->type === 'expense') {
                $wallet->increment('balance', $transaction->amount);
            }

            $transaction->delete();
        });

        return back()->with('success', 'Transaksi berhasil dihapus.');
    }

    public function resetTransactions(Request $request): RedirectResponse
    {
        $request->validate([
            'scope' => 'required|in:all,month,wallet',
            'wallet_id' => 'nullable|exists:wallets,id',
            'month' => 'nullable|integer|between:1,12',
            'year' => 'nullable|integer',
            'wallet_action' => 'required|in:keep,zero',
            'confirmation' => 'required|in:RESET',
        ]);

        $user = Auth::user();
        $query = $user->transactions()->withTrashed();

        $scopeDescription = '';

        if ($request->scope === 'month' && $request->filled('month') && $request->filled('year')) {
            $month = (int) $request->month;
            $year = (int) $request->year;
            $query->whereMonth('date', $month)->whereYear('date', $year);
            $monthName = Carbon::createFromDate($year, $month, 1)->translatedFormat('F Y');
            $scopeDescription = "transaksi periode {$monthName}";
        } elseif ($request->scope === 'wallet' && $request->filled('wallet_id')) {
            $wallet = $user->wallets()->find($request->wallet_id);
            if (!$wallet) {
                return back()->with('error', 'Dompet tidak ditemukan.');
            }
            $query->where('wallet_id', $request->wallet_id);
            $scopeDescription = "transaksi dompet \"{$wallet->name}\"";
        } else {
            $scopeDescription = "seluruh riwayat transaksi";
        }

        DB::transaction(function () use ($query, $request, $user) {
            // Force delete for complete clean reset
            $query->forceDelete();

            // Zero wallet balance if selected
            if ($request->wallet_action === 'zero') {
                if ($request->scope === 'wallet' && $request->filled('wallet_id')) {
                    $user->wallets()->where('id', $request->wallet_id)->update(['balance' => 0]);
                } elseif ($request->scope === 'all') {
                    $user->wallets()->update(['balance' => 0]);
                }
            }
        });

        return back()->with('success', "Berhasil me-reset {$scopeDescription}!");
    }
}
