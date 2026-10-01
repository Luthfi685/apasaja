<?php

namespace App\Providers;

use App\Models\Budget;
use App\Models\Category;
use App\Models\RecurringSubscription;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Observers\UserObserver;
use App\Policies\BudgetPolicy;
use App\Policies\CategoryPolicy;
use App\Policies\RecurringSubscriptionPolicy;
use App\Policies\TransactionPolicy;
use App\Policies\WalletPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;

class AppServiceProvider extends ServiceProvider
{
    /**
     * FinanceOS Model Policy Mappings
     * Ensures strict per-user data isolation
     */
    protected $policies = [
        Wallet::class               => WalletPolicy::class,
        Transaction::class          => TransactionPolicy::class,
        Category::class             => CategoryPolicy::class,
        Budget::class               => BudgetPolicy::class,
        RecurringSubscription::class => RecurringSubscriptionPolicy::class,
    ];

    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);
        $this->registerPolicies();
        User::observe(UserObserver::class);
        Vite::prefetch(concurrency: 1);

        if (app()->environment('production') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')) {
            URL::forceScheme('https');
        }

        // Superadmin gate (optional for future use)
        Gate::before(function ($user, $ability) {
            // return $user->isAdmin() ? true : null;
        });
    }
}
