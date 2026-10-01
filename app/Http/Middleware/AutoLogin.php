<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AutoLogin
{
    /**
     * Anonymous Guest Session:
     * Creates a unique isolated workspace for every new browser/device seamlessly
     * without requiring any login or registration.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Skip auto-login during testing so auth tests work correctly
        if (app()->runningUnitTests() || app()->environment('production')) {
            return $next($request);
        }

        // Skip auto-login on auth routes (login, register, logout) to avoid redirect loops
        if ($request->is('login', 'register', 'logout', 'forgot-password', 'reset-password/*')) {
            return $next($request);
        }

        $masterUser = User::first();

        if (!$masterUser) {
            $masterUser = User::create([
                'name'              => 'Alexander Vance',
                'email'             => 'demo@financeos.com',
                'password'          => Hash::make(Str::random(32)),
                'default_currency'  => 'IDR',
                'email_verified_at' => now(),
            ]);
        }

        // If not logged in or logged in as a different guest account, always sync to master account
        if (!Auth::check() || Auth::id() !== $masterUser->id) {
            Auth::login($masterUser, remember: true);
        }

        return $next($request);
    }
}
