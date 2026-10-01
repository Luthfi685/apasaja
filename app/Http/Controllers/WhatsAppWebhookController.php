<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Services\GeminiService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    protected GeminiService $gemini;

    public function __construct(GeminiService $gemini)
    {
        $this->gemini = $gemini;
    }

    /**
     * Web page for WhatsApp Bot Status & Guide
     */
    public function index(Request $request): \Inertia\Response
    {
        $user  = \Illuminate\Support\Facades\Auth::user();
        $token = config('services.fonnte.token', env('FONNTE_TOKEN'));
        if (empty($token) || $token === 'Ux3uesBxvvtBmbSy5VNn') {
            $token = 'RkikVyVdJFFrTdX8FCXd';
        }

        $recentTransactions = $user->transactions()
            ->with(['wallet:id,name,color', 'category:id,name,icon,color'])
            ->where(function ($q) {
                $q->where('is_ai_generated', true)
                  ->orWhere('description', 'LIKE', '%WhatsApp%');
            })
            ->latest('id')
            ->limit(10)
            ->get();

        $wallets = $user->wallets()->get(['id', 'name', 'balance', 'type']);

        return \Inertia\Inertia::render('WhatsAppBot/Index', [
            'botPhone'           => env('WHATSAPP_BOT_PHONE', '6283176325931'),
            'linkedPhone'        => $user->whatsapp_number ?: '',
            'isConfigured'       => !empty($token),
            'webhookUrl'         => env('WHATSAPP_WEBHOOK_URL', config('app.url') . '/api/webhook/whatsapp'),
            'recentTransactions' => $recentTransactions,
            'wallets'            => $wallets,
        ]);
    }

    /**
     * Update user's WhatsApp number
     */
    public function updateNumber(Request $request): \Illuminate\Http\RedirectResponse
    {
        $validated = $request->validate([
            'whatsapp_number' => 'required|string|max:30',
        ]);

        $clean = preg_replace('/[^0-9]/', '', $validated['whatsapp_number']);
        if (str_starts_with($clean, '0')) {
            $clean = '62' . substr($clean, 1);
        }

        \Illuminate\Support\Facades\Auth::user()->update([
            'whatsapp_number' => $clean,
        ]);

        return back()->with('success', 'Nomor WhatsApp berhasil diperbarui!');
    }

    /**
     * Handle incoming webhook requests from Fonnte
     */
    public function handle(Request $request): JsonResponse
    {
        // If GET request (e.g. Fonnte URL validation or browser test)
        if ($request->isMethod('get')) {
            return response()->json([
                'status'  => true,
                'message' => 'FinanceOS WhatsApp Webhook is active and running! Ready to receive POST events.',
                'server_time' => Carbon::now()->toDateTimeString(),
            ]);
        }

        $sender   = (string) $request->input('sender');
        $message  = trim((string) $request->input('message'));
        $imageUrl = $request->input('url');

        Log::info('Fonnte WhatsApp Webhook received', [
            'sender'   => $sender,
            'message'  => $message,
            'has_image'=> !empty($imageUrl),
        ]);

        if (empty($sender)) {
            return response()->json(['status' => false, 'message' => 'Sender is empty.'], 400);
        }

        // Normalize sender phone (e.g., 083126435560 -> 6283126435560)
        $cleanPhone = preg_replace('/[^0-9]/', '', $sender);
        if (str_starts_with($cleanPhone, '0')) {
            $cleanPhone = '62' . substr($cleanPhone, 1);
        }

        // 1. Identify User by registered whatsapp_number
        $user = User::where('whatsapp_number', $cleanPhone)
            ->orWhere('whatsapp_number', $sender)
            ->orWhere('whatsapp_number', '0' . substr($cleanPhone, 2))
            ->first();

        // If the number is NOT registered:
        if (!$user) {
            // If sender explicitly asks to link / register
            if (preg_match('/^(daftar|hubungkan|link|\/start)/i', $message)) {
                $masterUser = User::first();
                if ($masterUser) {
                    $masterUser->update(['whatsapp_number' => $cleanPhone]);
                    $reply = "[SUKSES] *Nomor WhatsApp Berhasil Terhubung!*\n\n"
                           . "Halo *{$masterUser->name}*, nomor WhatsApp Anda (*+{$cleanPhone}*) telah otomatis ditautkan ke akun FinanceOS.\n\n"
                           . "[INFO] *Mulai catat transaksi sekarang:*\n"
                           . "• _kopi kenangan 25rb bca_\n"
                           . "• _makan siang 35000 tunai_\n"
                           . "• _gaji 5jt bca_\n"
                           . "• Ketik *saldo* untuk cek semua dompet.";
                    return $this->sendReply($sender, $reply);
                }
            }

            // Normal chat from friends / family / other contacts -> SILENTLY IGNORE!
            Log::info("Ignoring chat from unregistered contact: {$sender}");
            return response()->json([
                'status'  => 'ignored',
                'message' => 'Sender not registered in FinanceOS. Normal personal chat ignored.',
            ]);
        }

        // 2. Handle Receipt Photo Upload (Image URL)
        if (!empty($imageUrl)) {
            $reply = $this->handleReceiptImage($user, $imageUrl);
            return $this->sendReply($sender, $reply);
        }

        // If message is empty after checking image
        if (empty($message)) {
            return response()->json(['status' => true]);
        }

        // 3. Command: Bantuan / Menu / Start
        if (preg_match('/^(bantuan|help|menu|\/start|panduan|fitur)$/i', $message)) {
            $reply = $this->getHelpMessage($user);
            return $this->sendReply($sender, $reply);
        }

        // 4. Command: Cek Saldo
        if (preg_match('/^(saldo|cek saldo|dompet|uang|kas)$/i', $message)) {
            $reply = $this->getSaldoMessage($user);
            return $this->sendReply($sender, $reply);
        }

        // 5. Command: Ringkasan Finansial Bulan Ini
        if (preg_match('/^(ringkasan|laporan|rekap|evaluasi|pengeluaran saya)$/i', $message)) {
            $reply = $this->getSummaryMessage($user);
            return $this->sendReply($sender, $reply);
        }

        // 6. Natural Language Processing (Transaction, Transfer, or Financial Advice)
        $reply = $this->processNaturalLanguage($user, $message);

        // If it was just a casual non-financial message, silently ignore so regular chats aren't disturbed
        if ($reply === null) {
            Log::info("Ignoring casual non-financial chat from registered user: {$message}");
            return response()->json([
                'status'  => 'ignored',
                'message' => 'Non-financial message ignored.',
            ]);
        }

        return $this->sendReply($sender, $reply);
    }

    /**
     * Process natural text using Fast Local NLP + Gemini AI
     */
    protected function processNaturalLanguage(User $user, string $message): ?string
    {
        $userWallets    = $user->wallets()->get();
        $userCategories = $user->categories()->get(['id', 'name', 'type']);
        $today          = Carbon::now()->toDateString();

        // Ensure default wallet if user has none
        if ($userWallets->isEmpty()) {
            $userWallets = collect([
                Wallet::create([
                    'user_id' => $user->id,
                    'name'    => 'Tunai (Cash)',
                    'type'    => 'cash',
                    'balance' => 0,
                    'is_default' => true,
                ])
            ]);
        }

        // 1. FAST LOCAL PARSER
        $localParsed = $this->localMultiIntentParse($message, $userWallets, $userCategories);

        if ($localParsed && $localParsed['intent'] === 'wallet_transfer') {
            return $this->executeWalletTransfer($user, $localParsed['transfer_data'] ?? [], $userWallets);
        }

        if ($localParsed && $localParsed['intent'] === 'add_transaction') {
            return $this->executeAddTransaction($user, $localParsed['transaction_data'] ?? [], $userWallets, $userCategories, $today);
        }

        // Filter: Check if message has any financial keywords or numeric amounts
        $isFinancial = preg_match('/\b(\d+(?:[.,]\d+)?\s*(?:rb|k|ribu|jt|juta)?|\d{4,}|beli|bayar|makan|minum|kopi|bensin|gaji|uang|saldo|transfer|tarik|setor|utang|piutang|hemat|investasi|keuangan|rupiah|rp|nabung|dompet|biaya|ongkos|jajan)\b/i', $message);

        if (!$isFinancial) {
            // Casual everyday conversation (e.g. "lagi di mana", "oke", "siap", "wkwk", "halo") -> ignore silently
            return null;
        }

        // 2. GEMINI AI FALLBACK FOR COMPLEX INTENTS (Only runs if message is financial)
        if ($this->gemini->isConfigured()) {
            $walletNames = $userWallets->pluck('name')->implode(', ');
            $catNames    = $userCategories->pluck('name')->implode('|');

            $systemPrompt = <<<PROMPT
Anda adalah parser transaksi keuangan untuk FinanceOS via WhatsApp.
Tugas Anda mengekstrak informasi dari pesan pengguna secara akurat.
Daftar Dompet Tersedia: [{$walletNames}]
Daftar Kategori Tersedia: [{$catNames}]

FORMAT KEMBALIAN HANYA JSON MURNI:
{
  "intent": "wallet_transfer" | "add_transaction" | "chat_query",
  "transfer_data": {
    "source_wallet_name": "string",
    "destination_wallet_name": "string",
    "is_transfer_all": false,
    "amount": 0
  },
  "transaction_data": {
    "type": "expense" | "income",
    "amount": 0,
    "wallet_name": "nama dompet jika disebutkan",
    "item": "nama merchant / barang / keterangan",
    "category": "kategori yang paling cocok"
  }
}
PROMPT;

            $parsed = $this->gemini->parseRawJson($systemPrompt, $message);

            if ($parsed && isset($parsed['intent'])) {
                if ($parsed['intent'] === 'wallet_transfer') {
                    return $this->executeWalletTransfer($user, $parsed['transfer_data'] ?? [], $userWallets);
                }
                if ($parsed['intent'] === 'add_transaction' && !empty($parsed['transaction_data']['amount'])) {
                    return $this->executeAddTransaction($user, $parsed['transaction_data'] ?? [], $userWallets, $userCategories, $today);
                }
            }

            // General chat or financial question
            $now = Carbon::now();
            $context = [
                'total_saldo' => 'Rp ' . number_format((float) $userWallets->sum('balance'), 0, ',', '.'),
                'pemasukan_bulan_ini' => 'Rp ' . number_format($user->getMonthlyIncome($now->month, $now->year), 0, ',', '.'),
                'pengeluaran_bulan_ini' => 'Rp ' . number_format($user->getMonthlyExpense($now->month, $now->year), 0, ',', '.'),
                'dompet' => $userWallets->map(fn($w) => "{$w->name}: Rp " . number_format($w->balance, 0, ',', '.'))->toArray(),
            ];

            $adviceResult = $this->gemini->generateFinancialAdvice($message, $context);
            if ($adviceResult['success']) {
                return $adviceResult['advice'];
            }
        }

        return "🤔 *FinanceOS Bot*\n\n"
             . "Saya mendeteksi percakapan keuangan, tapi nominal atau dompetnya belum terbaca jelas.\n"
             . "💡 *Contoh yang bisa langsung dicatat:*\n"
             . "• _Kopi Kenangan 28rb bca_\n"
             . "• _Bensin Pertalite 35000 tunai_\n"
             . "• _Gaji 5jt bca_\n"
             . "• Ketik *saldo* untuk cek saldo dompet.";
    }

    /**
     * Local regex parser for super-fast transaction detection (<2ms)
     */
    protected function localMultiIntentParse(string $text, $userWallets, $userCategories): ?array
    {
        $clean = strtolower(trim($text));

        // Detect Transfer: e.g. "transfer 50rb dari bca ke gopay", "pindahin uang 100k bca ke tunai"
        if (preg_match('/\b(transfer|pindah(?:in)?|kirim(?:kan)?)\b/i', $clean) && preg_match('/\b(ke|menuju)\b/i', $clean)) {
            $amount = $this->extractAmount($clean);
            if ($amount > 0) {
                // Find source & dest wallets
                $src = null;
                $dest = null;
                foreach ($userWallets as $w) {
                    $wName = strtolower($w->name);
                    if (str_contains($clean, $wName)) {
                        if (preg_match('/(?:dari|from)\s+' . preg_quote($wName, '/') . '/i', $clean)) {
                            $src = $w->name;
                        } elseif (preg_match('/(?:ke|to)\s+' . preg_quote($wName, '/') . '/i', $clean)) {
                            $dest = $w->name;
                        } elseif (!$src) {
                            $src = $w->name;
                        } elseif (!$dest) {
                            $dest = $w->name;
                        }
                    }
                }

                return [
                    'intent' => 'wallet_transfer',
                    'transfer_data' => [
                        'source_wallet_name' => $src,
                        'destination_wallet_name' => $dest,
                        'amount' => $amount,
                    ]
                ];
            }
        }

        // Detect Transaction: e.g. "beli kopi 25rb bca", "makan siang 30k tunai", "gaji 5jt bca"
        $amount = $this->extractAmount($clean);
        if ($amount > 0) {
            $isIncome = preg_match('/\b(gaji|bonus|pemasukan|income|terima|dapat|dapet|cashback|transfer masuk|dibayar)\b/i', $clean);
            $type = $isIncome ? 'income' : 'expense';

            // Find wallet
            $matchedWallet = null;
            foreach ($userWallets as $w) {
                $wName = strtolower($w->name);
                if (str_contains($clean, $wName)) {
                    $matchedWallet = $w->name;
                    break;
                }
            }

            // Clean item description
            $item = preg_replace('/\b(\d+(?:[.,]\d+)?\s*(?:rb|k|ribu|jt|juta)?)\b/i', '', $clean);
            $item = preg_replace('/\b(beli|bayar|makan|minum|untuk|ke|dari|di|via|pakai|pake|dompet)\b/i', '', $item);
            if ($matchedWallet) {
                $item = str_ireplace(strtolower($matchedWallet), '', $item);
            }
            $item = ucwords(trim(preg_replace('/\s+/', ' ', $item)));
            if (empty($item)) {
                $item = $isIncome ? 'Pemasukan' : 'Pengeluaran';
            }

            return [
                'intent' => 'add_transaction',
                'transaction_data' => [
                    'type'        => $type,
                    'amount'      => $amount,
                    'wallet_name' => $matchedWallet,
                    'item'        => $item,
                    'category'    => null,
                ]
            ];
        }

        return null;
    }

    /**
     * Extract nominal number from Indonesian text (e.g. "25rb", "50k", "1.5jt", "100000")
     */
    protected function extractAmount(string $text): float
    {
        // Match e.g. "1.5 jt", "25rb", "50k", "100.000", "25000"
        if (preg_match('/(\d+(?:[.,]\d+)?)\s*(jt|juta)\b/i', $text, $m)) {
            $val = (float) str_replace(',', '.', $m[1]);
            return $val * 1_000_000;
        }

        if (preg_match('/(\d+(?:[.,]\d+)?)\s*(rb|k|ribu)\b/i', $text, $m)) {
            $val = (float) str_replace(',', '.', $m[1]);
            return $val * 1_000;
        }

        if (preg_match('/(?:rp\.?|nominal)?\s*(\d{1,3}(?:\.\d{3})+(?:,\d+)?)/i', $text, $m)) {
            $clean = str_replace('.', '', $m[1]);
            $clean = str_replace(',', '.', $clean);
            return (float) $clean;
        }

        if (preg_match('/\b(\d{4,12})\b/', $text, $m)) {
            return (float) $m[1];
        }

        return 0;
    }

    /**
     * Execute Transaction
     */
    protected function executeAddTransaction(User $user, array $data, $userWallets, $userCategories, string $today): string
    {
        $type   = $data['type'] ?? 'expense';
        $amount = (float) ($data['amount'] ?? 0);
        $item   = $data['item'] ?? ($type === 'income' ? 'Pemasukan' : 'Pengeluaran');

        if ($amount <= 0) {
            return "❌ Nominal transaksi tidak valid.";
        }

        // Match or fallback wallet
        $targetWallet = null;
        if (!empty($data['wallet_name'])) {
            $needle = strtolower($data['wallet_name']);
            $targetWallet = $userWallets->first(fn($w) => str_contains(strtolower($w->name), $needle));
        }

        if (!$targetWallet) {
            $targetWallet = $userWallets->firstWhere('is_default', true) ?? $userWallets->first();
        }

        // Match Category
        $category = null;
        if (!empty($data['category'])) {
            $category = $userCategories->first(fn($c) => str_contains(strtolower($c->name), strtolower($data['category'])));
        }

        if (!$category) {
            $category = $userCategories->firstWhere('type', $type) ?? $userCategories->first();
        }

        DB::beginTransaction();
        try {
            if ($type === 'expense') {
                $targetWallet->decrement('balance', $amount);
            } else {
                $targetWallet->increment('balance', $amount);
            }

            $transaction = Transaction::create([
                'user_id'         => $user->id,
                'wallet_id'       => $targetWallet->id,
                'category_id'     => $category?->id,
                'type'            => $type,
                'amount'          => $amount,
                'merchant_name'   => $item,
                'description'     => "Dicatat via WhatsApp Bot: {$item}",
                'date'            => $today,
                'currency'        => $targetWallet->currency ?? 'IDR',
                'is_ai_generated' => true,
                'ai_metadata'     => ['source' => 'whatsapp_bot'],
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create WhatsApp transaction: ' . $e->getMessage());
            return "❌ Gagal menyimpan transaksi: " . $e->getMessage();
        }

        $typeLabel = $type === 'income' ? '🟢 Pemasukan' : '🔴 Pengeluaran';
        $amountFmt = 'Rp ' . number_format($amount, 0, ',', '.');
        $sisaBal   = 'Rp ' . number_format($targetWallet->fresh()->balance, 0, ',', '.');

        return "✅ *Transaksi Berhasil Dicatat!*\n\n"
             . "• *Jenis:* {$typeLabel}\n"
             . "• *Nominal:* {$amountFmt}\n"
             . "• *Keterangan:* {$item}\n"
             . "• *Kategori:* " . ($category?->name ?? 'Umum') . "\n"
             . "• *Dompet:* {$targetWallet->name}\n"
             . "• *Sisa Saldo:* {$sisaBal}\n\n"
             . "🌐 _Lihat detail di web:_ https://financeos-fh71.onrender.com/transactions";
    }

    /**
     * Execute Wallet Transfer
     */
    protected function executeWalletTransfer(User $user, array $data, $userWallets): string
    {
        if ($userWallets->count() < 2) {
            return "❌ Anda membutuhkan minimal 2 dompet untuk melakukan transfer antar dompet.";
        }

        $amount = (float) ($data['amount'] ?? 0);
        if ($amount <= 0) {
            return "❌ Nominal transfer tidak valid.";
        }

        $srcName  = strtolower($data['source_wallet_name'] ?? '');
        $destName = strtolower($data['destination_wallet_name'] ?? '');

        $sourceWallet = $srcName ? $userWallets->first(fn($w) => str_contains(strtolower($w->name), $srcName)) : null;
        $destWallet   = $destName ? $userWallets->first(fn($w) => str_contains(strtolower($w->name), $destName) && $w->id !== $sourceWallet?->id) : null;

        if (!$sourceWallet) $sourceWallet = $userWallets->first();
        if (!$destWallet)   $destWallet   = $userWallets->where('id', '!=', $sourceWallet->id)->first();

        if ($sourceWallet->balance < $amount) {
            return "❌ Saldo dompet *{$sourceWallet->name}* tidak mencukupi (Rp " . number_format($sourceWallet->balance, 0, ',', '.') . ") untuk transfer sebesar Rp " . number_format($amount, 0, ',', '.') . ".";
        }

        DB::beginTransaction();
        try {
            $sourceWallet->decrement('balance', $amount);
            $destWallet->increment('balance', $amount);

            Transaction::create([
                'user_id'         => $user->id,
                'wallet_id'       => $sourceWallet->id,
                'category_id'     => null,
                'type'            => 'expense',
                'amount'          => $amount,
                'merchant_name'   => "Transfer ke {$destWallet->name}",
                'description'     => "Transfer via WhatsApp ke {$destWallet->name}",
                'date'            => now()->toDateString(),
                'currency'        => 'IDR',
                'is_ai_generated' => true,
            ]);

            Transaction::create([
                'user_id'         => $user->id,
                'wallet_id'       => $destWallet->id,
                'category_id'     => null,
                'type'            => 'income',
                'amount'          => $amount,
                'merchant_name'   => "Transfer dari {$sourceWallet->name}",
                'description'     => "Transfer masuk via WhatsApp dari {$sourceWallet->name}",
                'date'            => now()->toDateString(),
                'currency'        => 'IDR',
                'is_ai_generated' => true,
            ]);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return "❌ Gagal memproses transfer saldo.";
        }

        $amountFmt = 'Rp ' . number_format($amount, 0, ',', '.');
        return "🔄 *Transfer Antar Dompet Berhasil!*\n\n"
             . "Dipindahkan: *{$amountFmt}*\n"
             . "• *Dari:* {$sourceWallet->name} (Sisa: Rp " . number_format($sourceWallet->fresh()->balance, 0, ',', '.') . ")\n"
             . "• *Ke:* {$destWallet->name} (Saldo: Rp " . number_format($destWallet->fresh()->balance, 0, ',', '.') . ")";
    }

    /**
     * Handle Receipt Photo
     */
    protected function handleReceiptImage(User $user, string $imageUrl): string
    {
        if (!$this->gemini->isConfigured()) {
            return "⚠️ AI Vision belum dikonfigurasi untuk membaca struk belanja.";
        }

        try {
            $imgContent = @file_get_contents($imageUrl);
            if (!$imgContent) {
                return "❌ Gagal mengunduh foto struk dari WhatsApp. Coba kirim ulang ya.";
            }

            $tempPath = tempnam(sys_get_temp_dir(), 'receipt_') . '.jpg';
            file_put_contents($tempPath, $imgContent);

            $result = $this->gemini->scanReceipt($tempPath, 'image/jpeg');
            @unlink($tempPath);

            if (!$result['success'] || empty($result['data']['total_amount'])) {
                return "⚠️ AI tidak dapat mengenali nominal total pada foto struk tersebut. Pastikan foto struk terlihat jelas dan cukup terang ya!";
            }

            $data = $result['data'];
            $totalAmount = (float) $data['total_amount'];
            $merchant    = $data['merchant_name'] ?? 'Struk Belanja';

            $userWallets    = $user->wallets()->get();
            $userCategories = $user->categories()->get(['id', 'name', 'type']);
            $defaultWallet  = $userWallets->firstWhere('is_default', true) ?? $userWallets->first();

            $category = $userCategories->first(fn($c) => str_contains(strtolower($c->name), 'belanja'))
                     ?? $userCategories->firstWhere('type', 'expense');

            DB::beginTransaction();
            if ($defaultWallet) {
                $defaultWallet->decrement('balance', $totalAmount);
            }

            Transaction::create([
                'user_id'         => $user->id,
                'wallet_id'       => $defaultWallet?->id,
                'category_id'     => $category?->id,
                'type'            => 'expense',
                'amount'          => $totalAmount,
                'merchant_name'   => $merchant,
                'description'     => "Scan struk otomatis via WhatsApp: {$merchant}",
                'date'            => $data['date'] ?? now()->toDateString(),
                'currency'        => 'IDR',
                'is_ai_generated' => true,
            ]);
            DB::commit();

            return "🧾 *Struk Berhasil Di-scan oleh AI!*\n\n"
                 . "• *Tempat / Merchant:* {$merchant}\n"
                 . "• *Total Belanja:* Rp " . number_format($totalAmount, 0, ',', '.') . "\n"
                 . "• *Kategori:* " . ($category?->name ?? 'Belanja') . "\n"
                 . "• *Dompet:* " . ($defaultWallet?->name ?? 'Tunai') . "\n\n"
                 . "🎉 Transaksi sudah otomatis masuk ke portofolio FinanceOS Anda!";
        } catch (\Exception $e) {
            Log::error("Failed to scan receipt via WA: " . $e->getMessage());
            return "❌ Terjadi kendala saat memproses gambar struk.";
        }
    }

    /**
     * Saldo Message
     */
    protected function getSaldoMessage(User $user): string
    {
        $wallets = $user->wallets()->get();
        if ($wallets->isEmpty()) {
            return "Belum ada dompet terdaftar di FinanceOS.";
        }

        $text = "📊 *Ringkasan Dompet & Saldo*\n";
        $text .= "Akun: *" . $user->name . "*\n\n";

        $total = 0;
        foreach ($wallets as $w) {
            $icon = match($w->type) {
                'bank'     => '🏦',
                'e-wallet' => '📱',
                'crypto'   => '🪙',
                default    => '💵',
            };
            $text .= "{$icon} *{$w->name}:* Rp " . number_format($w->balance, 0, ',', '.') . "\n";
            $total += $w->balance;
        }

        $text .= "\n✨ *Total Kekayaan:* Rp " . number_format($total, 0, ',', '.') . "\n";
        $text .= "\n_Ketik transaksi untuk mencatat pengeluaran atau pemasukan._";

        return $text;
    }

    /**
     * Summary Message
     */
    protected function getSummaryMessage(User $user): string
    {
        $now = Carbon::now();
        $income  = $user->getMonthlyIncome($now->month, $now->year);
        $expense = $user->getMonthlyExpense($now->month, $now->year);
        $net     = $income - $expense;

        $topExpense = $user->transactions()
            ->with('category:id,name')
            ->where('type', 'expense')
            ->whereMonth('date', $now->month)
            ->whereYear('date', $now->year)
            ->selectRaw('category_id, SUM(amount) as total')
            ->groupBy('category_id')
            ->orderByDesc('total')
            ->first();

        $topName = $topExpense?->category?->name ?? 'Belum ada';
        $topAmt  = $topExpense ? 'Rp ' . number_format($topExpense->total, 0, ',', '.') : 'Rp 0';

        return "📈 *Laporan Keuangan ({$now->translatedFormat('F Y')})*\n\n"
             . "🟢 *Pemasukan:* Rp " . number_format($income, 0, ',', '.') . "\n"
             . "🔴 *Pengeluaran:* Rp " . number_format($expense, 0, ',', '.') . "\n"
             . "💰 *Arus Kas Bersih:* " . ($net >= 0 ? '+' : '') . "Rp " . number_format($net, 0, ',', '.') . "\n"
             . "🏷️ *Pos Pengeluaran Terbesar:* {$topName} ({$topAmt})\n\n"
             . "🌐 _Buka web untuk grafik lengkap:_ https://financeos-fh71.onrender.com";
    }

    /**
     * Help / Guide Message
     */
    protected function getHelpMessage(User $user): string
    {
        return "🤖 *Selamat Datang di FinanceOS WhatsApp Bot!*\n"
             . "Halo *{$user->name}*! Anda bisa mencatat transaksi secepat mengirim chat WhatsApp.\n\n"
             . "📌 *Contoh Catat Pengeluaran:*\n"
             . "• _\"Kopi Kenangan 28rb bca\"_\n"
             . "• _\"Makan siang geprek 25k tunai\"_\n"
             . "• _\"Bensin Pertalite 35000 bca\"_\n\n"
             . "📌 *Contoh Catat Pemasukan:*\n"
             . "• _\"Gaji freelance masuk 2jt bca\"_\n"
             . "• _\"Dapat bonus 500rb mandiri\"_\n\n"
             . "📌 *Contoh Transfer Antar Dompet:*\n"
             . "• _\"Transfer 100rb dari BCA ke GoPay\"_\n\n"
             . "📌 *Perintah Cepat:*\n"
             . "• *saldo* : Cek rincian semua dompet Anda\n"
             . "• *ringkasan* : Laporan pemasukan & pengeluaran bulan ini\n"
             . "• *bantuan* : Tampilkan pesan panduan ini\n\n"
             . "📸 *Kirim Foto Struk:*\n"
             . "Cukup kirim foto struk belanjaan, AI akan otomatis membaca nominal dan mencatatnya!";
    }

    /**
     * Send Reply via Fonnte API
     */
    protected function sendReply(string $target, string $message): JsonResponse
    {
        $token = config('services.fonnte.token', env('FONNTE_TOKEN', 'RkikVyVdJFFrTdX8FCXd'));
        if (empty($token) || $token === 'Ux3uesBxvvtBmbSy5VNn') {
            $token = 'RkikVyVdJFFrTdX8FCXd';
        }

        try {
            $response = Http::withHeaders([
                'Authorization' => $token,
            ])->timeout(15)->post('https://api.fonnte.com/send', [
                'target'  => $target,
                'message' => $message,
            ]);

            Log::info('Fonnte send reply response', [
                'target' => $target,
                'status' => $response->status(),
                'body'   => $response->json() ?? $response->body(),
            ]);
        } catch (\Exception $e) {
            Log::warning('Fonnte send reply failed: ' . $e->getMessage());
        }

        // Return JSON response as well for webhook compatibility
        return response()->json([
            'status' => true,
            'reply'  => $message,
        ]);
    }
}
