<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    protected ?string $apiKey;
    protected array $fallbackModels;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        $this->fallbackModels = array_unique(array_filter([
            env('GEMINI_MODEL', 'gemini-2.5-pro'),
            config('services.gemini.model', 'gemini-2.5-pro'),
            'gemini-2.5-pro',
            'gemini-2.0-pro-exp-02-05',
            'gemini-1.5-pro',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
        ]));
    }

    public function isConfigured(): bool
    {
        return !empty($this->apiKey);
    }

    /**
     * Generate warm, comprehensive, insightful financial advice
     */
    public function generateFinancialAdvice(string $prompt, array $financialContext = []): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'Google Gemini API Key belum disetel di .env (GEMINI_API_KEY).',
                'advice' => 'Untuk mengaktifkan Financial Copilot AI, silakan pasang GEMINI_API_KEY di .env Anda.'
            ];
        }

        $systemInstruction = <<<INSTRUCTION
Anda adalah FinanceOS AI Copilot — Asisten Finansial Pribadi & AI Konsultan yang cerdas, ramah, dan serba bisa.
Tugas Anda adalah mendampingi pengguna mengelola keuangan dan menjawab pertanyaan apa pun dengan cermat, solutif, dan ramah.

Pedoman Menjawab:
1. PERTANYAAN UMUM, EDUKASI, ATAU KONSULTASI (misal: "apa itu saham?", "rekomendasi ide bisnis", "cara investasi pemula", "kenapa pengeluaran saya boros?", "apa kabar?", atau obrolan santai):
   - Jawab secara langsung, relevan, menarik, dan mudah dipahami oleh siapa saja.
   - JANGAN memaksakan format laporan saldo (Evaluasi Arus Kas / Sorotan Pengeluaran) jika pengguna hanya bertanya hal umum atau edukasi!
   - Jika pengguna bertanya tips atau saran yang berkaitan dengan kondisi finansialnya, Anda boleh mengaitkan saran Anda dengan data finansial pengguna secara natural.

2. PERMINTAAN RINGKASAN / AUDIT KONDISI FINANSIAL (misal: "analisis keuangan saya", "ringkasan kondisi finansial", "evaluasi dompet", "cek kesehatan finansial"):
   - Sajikan laporan yang komprehensif dan terstruktur:
     * 📊 **Evaluasi Kesehatan Arus Kas & Aset**: Uraikan saldo, perbandingan pemasukan vs pengeluaran, dan rasio tabungan berdasarkan data pengguna.
     * 🔍 **Sorotan & Analisis Pengeluaran**: Kategori paling boros atau pos biaya utama.
     * 🎯 **Rekomendasi Strategis**: 2–3 langkah nyata yang bisa langsung diterapkan untuk meningkatkan tabungan.

3. Gaya Komunikasi:
   - Gunakan Bahasa Indonesia yang natural, suportif, modern, dan profesional.
   - Gunakan format markdown yang rapi (bold, bullet points, emoji yang pas).
INSTRUCTION;

        $contextText = !empty($financialContext) ? json_encode($financialContext, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : 'Belum ada data transaksi/dompet.';
        $fullPrompt = "{$systemInstruction}\n\n[DATA FINANSIAL PENGGUNA TERKINI]:\n{$contextText}\n\n[PERTANYAAN / PESAN PENGGUNA]:\n{$prompt}";

        $lastError = '';

        foreach ($this->fallbackModels as $model) {
            try {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->timeout(35)->post($endpoint, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $fullPrompt]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.6,
                        'topK' => 40,
                        'topP' => 0.95,
                        'maxOutputTokens' => 2048, // Large token limit so thoughts and sentences are NEVER cut off
                    ]
                ]);

                if ($response->successful()) {
                    $candidates = $response->json('candidates', []);
                    $replyText = $candidates[0]['content']['parts'][0]['text'] ?? '';
                    
                    if (!empty($replyText)) {
                        return [
                            'success' => true,
                            'advice' => $replyText,
                            'model_used' => $model,
                        ];
                    }
                }

                $lastError = $response->json('error.message') ?? $response->body();
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
            }
        }

        return [
            'success' => false,
            'message' => 'Layanan Gemini sedang sibuk: ' . $lastError,
            'advice' => '⚠️ Server AI sedang mengalami antrean singkat. Silakan kirim pesan kembali dalam beberapa detik.',
        ];
    }

    /**
     * Parse a free-text message and return structured JSON (for transaction parsing, etc.)
     * Returns parsed array or null on failure.
     */
    public function parseRawJson(string $systemPrompt, string $userMessage): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $fullPrompt = "{$systemPrompt}\n\n[INPUT USER]: {$userMessage}";
        $lastError  = '';

        foreach ($this->fallbackModels as $model) {
            try {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

                $response = Http::withHeaders(['Content-Type' => 'application/json'])
                    ->timeout(12) // Fail fast — local parser will fallback
                    ->post($endpoint, [
                        'contents' => [
                            ['parts' => [['text' => $fullPrompt]]]
                        ],
                        'generationConfig' => [
                            'temperature'     => 0.1,
                            'topK'            => 5,
                            'topP'            => 0.8,
                            'maxOutputTokens' => 120, // JSON only needs ~60-80 tokens; low = faster
                        ],
                    ]);

                if ($response->successful()) {
                    $raw = $response->json('candidates.0.content.parts.0.text', '');

                    // Strip any markdown fences
                    $raw     = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($raw));
                    $parsed  = json_decode($raw, true);

                    if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
                        return $parsed;
                    }
                }

                $lastError = $response->json('error.message') ?? $response->body();
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
                Log::warning("GeminiService::parseRawJson failed on model {$model}: {$lastError}");
            }
        }

        return null;
    }

    /**
     * Scan receipt via Gemini Vision
     */
    public function scanReceipt(string $imagePath, string $mimeType = 'image/jpeg'): array
    {
        if (!$this->isConfigured()) {
            return [
                'success' => false,
                'message' => 'Google Gemini API Key belum disetel di .env (GEMINI_API_KEY).',
            ];
        }

        $imageData = base64_encode(file_get_contents($imagePath));

        $prompt = <<<PROMPT
Ekstrak data dari foto struk/invoice ini dan KEMBALIKAN HANYA JSON MURNI tanpa format markdown:
{
    "merchant_name": "Nama Toko / Tempat Usaha",
    "date": "YYYY-MM-DD",
    "total_amount": 125000,
    "suggested_category": "Makanan & Minuman | Transportasi | Belanja | Tagihan & Utilitas | Kesehatan | Hiburan | Lainnya",
    "currency": "IDR",
    "items": [
        {"name": "Nama Item", "qty": 1, "price": 50000}
    ]
}
PROMPT;

        $visionModels = [
            env('GEMINI_MODEL', 'gemini-2.5-pro'),
            'gemini-2.5-pro',
            'gemini-2.0-pro-exp-02-05',
            'gemini-1.5-pro',
            'gemini-2.5-flash',
            'gemini-2.0-flash',
        ];
        $lastError = '';

        foreach ($visionModels as $model) {
            try {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$this->apiKey}";

                $response = Http::withHeaders([
                    'Content-Type' => 'application/json',
                ])->timeout(45)->post($endpoint, [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $prompt],
                                [
                                    'inlineData' => [
                                        'mimeType' => $mimeType,
                                        'data' => $imageData
                                    ]
                                ]
                            ]
                        ]
                    ],
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'maxOutputTokens' => 1500,
                    ]
                ]);

                if ($response->successful()) {
                    $candidates = $response->json('candidates', []);
                    $rawJson = $candidates[0]['content']['parts'][0]['text'] ?? '{}';
                    
                    $rawJson = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($rawJson));
                    $parsed = json_decode($rawJson, true);

                    if (json_last_error() === JSON_ERROR_NONE && is_array($parsed)) {
                        return [
                            'success' => true,
                            'data' => $parsed,
                        ];
                    }
                }

                $lastError = $response->json('error.message') ?? $response->body();
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
            }
        }

        return [
            'success' => false,
            'message' => 'Gagal memproses struk: ' . $lastError,
        ];
    }
}
