<?php

use App\Http\Controllers\AiAdvisorController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReceiptScannerController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\AchievementsController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ─── Auth Routes (Breeze) ─────────────────────────────────────────────────────
require __DIR__.'/auth.php';

// ─── Authenticated Routes ─────────────────────────────────────────────────────
Route::middleware(['auth', 'verified'])->group(function () {

    // Dashboard
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard.alt');

    // AI & Vision Engine
    Route::post('/ai/analyze', [AiAdvisorController::class, 'analyze'])->name('ai.analyze');
    Route::post('/ai/parse-transaction', [AiAdvisorController::class, 'parseTransaction'])->name('ai.parse-transaction');
    Route::post('/ai/batch-restore', [AiAdvisorController::class, 'batchRestore'])->name('ai.batch-restore');
    Route::post('/ai/scan-receipt', [ReceiptScannerController::class, 'scan'])->name('receipt.scan');

    // Reports & Exports
    Route::get('/reports/export-csv', [ReportController::class, 'exportCsv'])->name('reports.export-csv');
    Route::get('/reports/export-pdf', [ReportController::class, 'exportPdf'])->name('reports.export-pdf');

    // Wallets
    Route::resource('wallets', WalletController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::post('/wallets/{wallet}/adjust-balance', [WalletController::class, 'adjustBalance'])->name('wallets.adjust-balance');

    // Transactions
    Route::post('/transactions/reset', [TransactionController::class, 'resetTransactions'])->name('transactions.reset');
    Route::resource('transactions', TransactionController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Categories
    Route::resource('categories', CategoryController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Budgets
    Route::resource('budgets', BudgetController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // Financial Goals & Savings Buckets
    Route::resource('goals', GoalController::class)
        ->only(['index', 'store', 'update', 'destroy']);
    Route::post('/goals/{goal}/deposit', [GoalController::class, 'deposit'])->name('goals.deposit');

    // Achievements & Badges
    Route::get('/achievements', [AchievementsController::class, 'index'])->name('achievements');

    // Split Bill (pure frontend page — no backend needed)
    Route::get('/split-bill', fn() => Inertia::render('SplitBill/Index'))->name('split-bill');

    // WhatsApp Bot Integration
    Route::get('/whatsapp-bot', [\App\Http\Controllers\WhatsAppWebhookController::class, 'index'])->name('whatsapp.index');
    Route::post('/whatsapp-bot/number', [\App\Http\Controllers\WhatsAppWebhookController::class, 'updateNumber'])->name('whatsapp.update-number');

    // Data Recovery & Sync Diagnostics
    Route::get('/system/data-audit', [\App\Http\Controllers\DataRecoveryController::class, 'audit'])->name('system.data-audit');
    Route::post('/system/merge-data', [\App\Http\Controllers\DataRecoveryController::class, 'mergeToMaster'])->name('system.merge-data');
    Route::post('/system/recalculate-balances', [\App\Http\Controllers\DataRecoveryController::class, 'recalculateBalances'])->name('system.recalculate-balances');
    Route::post('/system/clean-duplicates', [\App\Http\Controllers\DataRecoveryController::class, 'cleanDuplicates'])->name('system.clean-duplicates');

    // Profile (Breeze default)
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

// ─── WhatsApp Webhook (Fonnte) ────────────────────────────────────────────────
Route::match(['get', 'post'], '/api/webhook/whatsapp', [\App\Http\Controllers\WhatsAppWebhookController::class, 'handle'])
    ->name('webhook.whatsapp');
Route::match(['get', 'post'], '/webhook/whatsapp', [\App\Http\Controllers\WhatsAppWebhookController::class, 'handle'])
    ->name('webhook.whatsapp.alt');

// ─── Diagnostics & Recovery API (Protected in production) ─────────────────────
Route::group(['middleware' => function ($request, $next) {
    if (app()->environment('production')) {
        $secret = config('app.key');
        if (!$secret || $request->query('key') !== $secret) {
            abort(403, 'Unauthorized maintenance request.');
        }
    }
    return $next($request);
}], function () {
    Route::match(['get', 'post'], '/api/system/audit', [\App\Http\Controllers\DataRecoveryController::class, 'audit']);
    Route::match(['get', 'post'], '/api/system/fix-all', [\App\Http\Controllers\DataRecoveryController::class, 'fixAll']);
    Route::match(['get', 'post'], '/api/system/clean-wallets', [\App\Http\Controllers\DataRecoveryController::class, 'cleanupEmptyWallets']);
});

// ─── Shared Hosting / InfinityFree Deploy Helper (Protected by APP_KEY) ───────
Route::get('/deploy-helper', function (\Illuminate\Http\Request $request) {
    $secret = config('app.key');
    if (!$secret || $request->query('key') !== $secret) {
        abort(403, 'Unauthorized. Pass ?key= matching APP_KEY.');
    }

    $action = $request->query('action', 'status');
    $output = [];

    switch ($action) {
        case 'migrate':
            \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
            $output[] = trim(\Illuminate\Support\Facades\Artisan::output());
            break;
        case 'storage-link':
            \Illuminate\Support\Facades\Artisan::call('storage:link');
            $output[] = trim(\Illuminate\Support\Facades\Artisan::output());
            break;
        case 'clear-cache':
            \Illuminate\Support\Facades\Artisan::call('optimize:clear');
            $output[] = trim(\Illuminate\Support\Facades\Artisan::output());
            break;
        case 'status':
        default:
            $output[] = 'Deploy helper active. Actions: ?action=migrate, ?action=storage-link, ?action=clear-cache';
            break;
    }

    return response()->json([
        'status'  => true,
        'action'  => $action,
        'output'  => $output,
    ]);
});
