import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Sparkles, X, Send, User, Loader2, RotateCcw, Mic, MicOff, Database
} from 'lucide-react';
import { router } from '@inertiajs/react';
import toast from 'react-hot-toast';
import axios from 'axios';

const QUICK_PROMPTS = [
    'Apa itu reksadana & cara mulainya?',
    'Ringkasan kondisi finansial saya',
    'Tips mengatur gaji agar bisa nabung',
    '[DEMO] Pindahin uang cash ke rekening',
];

// Detect questions, advice, general chat vs transaction recording
const QUESTION_WORDS = /\b(apa|apakah|bagaimana|gimana|kenapa|mengapa|berapa (?:ideal|rekomendasi|persen|sebaiknya|harus|modal|biaya)|tips|cara|rekomendasi|saran|enaknya|tolong jelaskan|jelaskan|bedanya|perbedaan|pengertian|definisi|arti|siapa|halo|hai)\b/i;
const TX_AMOUNT  = /(\d+\s*k\b|\d+\s*rb\b|\d+\s*ribu\b|\d+\s*jt\b|\d+\s*juta\b|rp\s*\d+|\d{4,})/i;
const TX_ACTIONS = /\b(beli|bayar|byr|makan|jajan|ngisi|topup|top up|abis|habis|gaji|gajian|dapet|dapat|terima|pemasukan|pengeluaran|tambah|masukin|keluarin|transfer|pindah|pindahin|kirim|oper|geser|langganan|subscribe|belanja|isi)\b/i;

const TX_PATTERN = (text) => {
    const trimmed = text.trim();
    if (QUESTION_WORDS.test(trimmed) || trimmed.endsWith('?')) {
        return false;
    }
    // Must contain both amount and action OR be short format like "kopi 25k"
    return (TX_AMOUNT.test(trimmed) && TX_ACTIONS.test(trimmed)) || (TX_AMOUNT.test(trimmed) && trimmed.split(/\s+/).length <= 4);
};

const INITIAL_MESSAGE = {
    role: 'assistant',
    content: 'Halo! Saya **FinanceOS AI Copilot**. Anda bisa bertanya apa saja (edukasi investasi, tips hemat, konsultasi keuangan, obrolan santai), atau **bicara via Mikrofon (🎙️)** untuk mencatat transaksi dan memindahkan saldo secara instan!',
};

const STORAGE_KEY = 'financeos_ai_chat_history_v1';

/**
 * Format markdown lines into beautiful rich JSX elements
 */
function MarkdownRenderer({ content }) {
    if (!content) return null;

    const lines = content.split('\n');

    return (
        <div className="space-y-2 text-xs leading-relaxed">
            {lines.map((line, idx) => {
                const trimmed = line.trim();

                if (!trimmed) {
                    return <div key={idx} className="h-1.5" />;
                }

                // Headings (### or ##)
                if (trimmed.startsWith('### ')) {
                    return (
                        <h4 key={idx} className="font-bold text-slate-900 text-sm mt-3 mb-1">
                            {formatInline(trimmed.replace(/^###\s+/, ''))}
                        </h4>
                    );
                }
                if (trimmed.startsWith('## ')) {
                    return (
                        <h3 key={idx} className="font-bold text-slate-900 text-sm mt-3.5 mb-1 pb-1 border-b border-slate-100">
                            {formatInline(trimmed.replace(/^##\s+/, ''))}
                        </h3>
                    );
                }

                // Horizontal Rule
                if (trimmed === '---' || trimmed === '***') {
                    return <hr key={idx} className="border-slate-200 my-2" />;
                }

                // Bullet Lists (* or -)
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            <span className="flex-1 text-slate-700">
                                {formatInline(trimmed.replace(/^[\*\-•]\s+/, ''))}
                            </span>
                        </div>
                    );
                }

                // Numbered Lists (1. 2.)
                const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
                if (numMatch) {
                    return (
                        <div key={idx} className="flex items-start gap-2 pl-1">
                            <span className="font-bold text-emerald-600 text-xs flex-shrink-0 font-mono">
                                {numMatch[1]}.
                            </span>
                            <span className="flex-1 text-slate-700">
                                {formatInline(numMatch[2])}
                            </span>
                        </div>
                    );
                }

                // Standard Paragraph
                return (
                    <p key={idx} className="text-slate-700">
                        {formatInline(trimmed)}
                    </p>
                );
            })}
        </div>
    );
}

/**
 * Parses bold **text** and `code` inline
 */
function formatInline(text) {
    const parts = [];
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const raw = match[0];
        if (raw.startsWith('**') && raw.endsWith('**')) {
            parts.push(
                <strong key={match.index} className="font-bold text-slate-900">
                    {raw.slice(2, -2)}
                </strong>
            );
        } else if (raw.startsWith('`') && raw.endsWith('`')) {
            parts.push(
                <code key={match.index} className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-mono text-[11px]">
                    {raw.slice(1, -1)}
                </code>
            );
        }

        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    return parts;
}

/**
 * Smart Indonesian financial speech normalization
 * Converts phonetic misrecognitions, spelled-out numbers, and spoken e-wallets into clean text.
 */
function normalizeIndonesianSpeech(text) {
    if (!text) return '';
    let t = text;

    // Convert spoken numbers into numeric digits
    const spokenRules = [
        [/\bsetengah\s+juta\b/gi, '500 ribu'],
        [/\bseperempat\s+juta\b/gi, '250 ribu'],
        [/\bsatu\s+juta\b/gi, '1 juta'],
        [/\bdua\s+juta\b/gi, '2 juta'],
        [/\btiga\s+juta\b/gi, '3 juta'],
        [/\bempat\s+juta\b/gi, '4 juta'],
        [/\blima\s+juta\b/gi, '5 juta'],
        [/\benam\s+juta\b/gi, '6 juta'],
        [/\btujuh\s+juta\b/gi, '7 juta'],
        [/\bdelapan\s+juta\b/gi, '8 juta'],
        [/\bsembilan\s+juta\b/gi, '9 juta'],
        [/\bsepuluh\s+juta\b/gi, '10 juta'],
        [/\bseratus\s+lima\s+puluh\s+ribu\b/gi, '150 ribu'],
        [/\bseratus\s+dua\s+puluh\s+lima\s+ribu\b/gi, '125 ribu'],
        [/\bseratus\s+ribu\b/gi, '100 ribu'],
        [/\bdua\s+ratus\s+lima\s+puluh\s+ribu\b/gi, '250 ribu'],
        [/\bdua\s+ratus\s+ribu\b/gi, '200 ribu'],
        [/\btiga\s+ratus\s+ribu\b/gi, '300 ribu'],
        [/\bempat\s+ratus\s+ribu\b/gi, '400 ribu'],
        [/\blima\s+ratus\s+ribu\b/gi, '500 ribu'],
        [/\benam\s+ratus\s+ribu\b/gi, '600 ribu'],
        [/\btujuh\s+ratus\s+ribu\b/gi, '700 ribu'],
        [/\bdelapan\s+ratus\s+ribu\b/gi, '800 ribu'],
        [/\bsembilan\s+ratus\s+ribu\b/gi, '900 ribu'],
        [/\bdua\s+puluh\s+lima\s+ribu\b/gi, '25 ribu'],
        [/\btiga\s+puluh\s+lima\s+ribu\b/gi, '35 ribu'],
        [/\bempat\s+puluh\s+lima\s+ribu\b/gi, '45 ribu'],
        [/\blima\s+puluh\s+lima\s+ribu\b/gi, '55 ribu'],
        [/\bsepuluh\s+ribu\b/gi, '10 ribu'],
        [/\bsebelas\s+ribu\b/gi, '11 ribu'],
        [/\bdua\s+belas\s+ribu\b/gi, '12 ribu'],
        [/\btiga\s+belas\s+ribu\b/gi, '13 ribu'],
        [/\bempat\s+belas\s+ribu\b/gi, '14 ribu'],
        [/\blima\s+belas\s+ribu\b/gi, '15 ribu'],
        [/\benam\s+belas\s+ribu\b/gi, '16 ribu'],
        [/\btujuh\s+belas\s+ribu\b/gi, '17 ribu'],
        [/\bdelapan\s+belas\s+ribu\b/gi, '18 ribu'],
        [/\bsembilan\s+belas\s+ribu\b/gi, '19 ribu'],
        [/\bdua\s+puluh\s+ribu\b/gi, '20 ribu'],
        [/\btiga\s+puluh\s+ribu\b/gi, '30 ribu'],
        [/\bempat\s+puluh\s+ribu\b/gi, '40 ribu'],
        [/\blima\s+puluh\s+ribu\b/gi, '50 ribu'],
        [/\benam\s+puluh\s+ribu\b/gi, '60 ribu'],
        [/\btujuh\s+puluh\s+ribu\b/gi, '70 ribu'],
        [/\bdelapan\s+puluh\s+ribu\b/gi, '80 ribu'],
        [/\bsembilan\s+puluh\s+ribu\b/gi, '90 ribu'],
        [/\bseribu\b/gi, '1 ribu'],
        [/\bdua\s+ribu\b/gi, '2 ribu'],
        [/\btiga\s+ribu\b/gi, '3 ribu'],
        [/\bempat\s+ribu\b/gi, '4 ribu'],
        [/\blima\s+ribu\b/gi, '5 ribu'],
        [/\benam\s+ribu\b/gi, '6 ribu'],
        [/\btujuh\s+ribu\b/gi, '7 ribu'],
        [/\bdelapan\s+ribu\b/gi, '8 ribu'],
        [/\bsembilan\s+ribu\b/gi, '9 ribu'],
    ];

    spokenRules.forEach(([pattern, replacement]) => {
        t = t.replace(pattern, replacement);
    });

    // Fix speech recognition hearing "k" as "kg", "kilo", "key", "kay"
    t = t.replace(/(\d+)\s*(?:kg|kilo|key|kay)\b/gi, '$1k');

    // Fix spoken e-wallet / bank names
    t = t.replace(/\b(?:shopee\s*pay|shoppy\s*pay|sopi\s*pay|spay)\b/gi, 'ShopeePay');
    t = t.replace(/\b(?:go\s*pay|gopai|go-pay)\b/gi, 'GoPay');
    t = t.replace(/\b(?:danau|danna)\b/gi, 'Dana');
    t = t.replace(/\b(?:si\s*bank|sea\s*bank)\b/gi, 'SeaBank');
    t = t.replace(/\b(?:b\s*c\s*a|bece\s*a)\b/gi, 'BCA');
    t = t.replace(/\b(?:b\s*r\s*i|bere\s*i)\b/gi, 'BRI');
    t = t.replace(/\b(?:b\s*n\s*i|bene\s*i)\b/gi, 'BNI');
    t = t.replace(/\b(?:uang\s*kas|uang\s*tunai|kes)\b/gi, 'cash');

    return t.replace(/\s+/g, ' ').trim();
}

export default function FinancialCopilot({ isOpen, onClose }) {
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [INITIAL_MESSAGE];
        } catch (e) {
            console.error('Failed to load chat history:', e);
            return [INITIAL_MESSAGE];
        }
    });
    const [inputPrompt, setInputPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const chatEndRef = useRef(null);
    const recognitionRef = useRef(null);
    const silenceTimeoutRef = useRef(null);

    // 1. Sync messages with localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
            console.error('Failed to save chat history:', e);
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // 3. Web Speech Recognition Setup with Real-Time Indonesian Correction
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = 'id-ID';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setIsListening(true);
                toast.success('Mendengarkan suara Anda...', { id: 'speech-listening', icon: '🎙️' });
            };

            recognition.onresult = (event) => {
                let fullTranscript = '';

                for (let i = 0; i < event.results.length; i++) {
                    fullTranscript += event.results[i][0].transcript + ' ';
                }

                const cleaned = normalizeIndonesianSpeech(fullTranscript);
                if (cleaned) {
                    setInputPrompt(cleaned);
                }

                // Reset silence auto-stop timer (2.5 seconds of silence stops listening)
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = setTimeout(() => {
                    if (recognitionRef.current) {
                        try { recognitionRef.current.stop(); } catch (e) {
                            console.error('Failed to stop speech recognition:', e);
                        }
                    }
                    setIsListening(false);
                }, 2500);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                setIsListening(false);
                if (event.error !== 'no-speech') {
                    toast.error('Gagal mendengarkan mikrofon. Coba lagi.');
                }
            };

            recognition.onend = () => {
                if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
                setIsListening(false);
            };

            recognitionRef.current = recognition;
        }

        return () => {
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch (e) {
                    console.error('Failed to stop speech recognition on cleanup:', e);
                }
            }
        };
    }, []);

    function toggleListening() {
        if (!recognitionRef.current) {
            toast.error('Browser Anda tidak mendukung Web Speech API. Silakan gunakan Google Chrome / Edge.');
            return;
        }

        if (isListening) {
            if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
            } catch (err) {
                console.error('Failed to start speech recognition, retrying...', err);
                try {
                    recognitionRef.current.stop();
                    setTimeout(() => recognitionRef.current.start(), 200);
                } catch (e) {
                    console.error('Failed to retry speech recognition:', e);
                    toast.error('Gagal memulai speech recognition. Coba lagi.');
                }
            }
        }
    }

    function handleResetChat() {
        if (confirm('Mulai percakapan baru dan hapus riwayat chat sebelumnya?')) {
            setMessages([INITIAL_MESSAGE]);
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch (e) {}
            toast.success('Riwayat chat berhasil di-reset.');
        }
    }

    async function handleRestoreFromChat() {
        if (loading) return;

        // Extract all user messages that contain transactions or amounts
        const userMessages = messages
            .filter(m => m.role === 'user' && m.content && m.content.trim())
            .map(m => m.content.trim());

        const txCandidates = userMessages.filter(text => {
            return TX_PATTERN(text) || TX_AMOUNT.test(text);
        });

        if (txCandidates.length === 0) {
            toast.error('Tidak ditemukan riwayat instruksi transaksi di dalam chat ini.');
            return;
        }

        if (!confirm(`Ditemukan ${txCandidates.length} catatan transaksi di riwayat chat Anda.\n\nPulihkan dan masukkan kembali semua data transaksi ini ke database Neon PostgreSQL sekarang?`)) {
            return;
        }

        setLoading(true);
        const toastId = toast.loading(`Sedang memulihkan ${txCandidates.length} transaksi ke database...`);

        try {
            const res = await axios.post('/ai/batch-restore', { messages: txCandidates });
            if (res.data.success) {
                toast.success(res.data.message, { id: toastId, duration: 6000 });
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `[SUKSES] **Pemulihan Berhasil!**\n\n${res.data.message}\n\nSaldo dompet dan grafik di dashboard telah diperbarui secara otomatis.`,
                    tag: '[PEMULIHAN] Pemulihan Berhasil',
                }]);
                router.reload({ preserveScroll: true });
            } else {
                toast.error(res.data.message || 'Gagal memulihkan transaksi.', { id: toastId });
            }
        } catch (err) {
            console.error('Failed to restore transactions:', err);
            toast.error('Terjadi kendala saat memulihkan transaksi ke database.', { id: toastId });
        } finally {
            setLoading(false);
        }
    }

    async function handleSend(customPrompt = null) {
        const text = customPrompt || inputPrompt;
        if (!text.trim() || loading) return;

        // Check if user is asking to restore/replay data from chat
        const isRestoreCommand = /\b(pulihkan|balikin|restore|kembalikan)\b.*\b(data|transaksi|chat|saldo|catatan)\b/i.test(text)
            || /\b(balikin|pulihkan|restore)\s+(data|transaksi)\b/i.test(text);

        if (isRestoreCommand) {
            setInputPrompt('');
            setMessages(prev => [...prev, { role: 'user', content: text }]);
            await handleRestoreFromChat();
            return;
        }

        // Stop listening if active
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }

        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        if (!customPrompt) setInputPrompt('');
        setLoading(true);

        try {
            const isActionInput = TX_PATTERN(text) && !text.startsWith('💡') && !text.startsWith('📊') && !text.startsWith('🎯') && !text.startsWith('⚠️');

            if (isActionInput) {
                const res = await axios.post('/ai/parse-transaction', { message: text });
                const reply = res.data;

                if (reply.success && reply.intent === 'wallet_transfer') {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: reply.message,
                        tag: '[TRANSFER] Transfer Saldo Berhasil',
                    }]);
                    toast.success('Transfer saldo antar dompet berhasil!');
                    router.reload({ preserveScroll: true });
                } else if (reply.success && reply.intent === 'add_transaction') {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: reply.message,
                        tag: reply.is_new_category ? '🆕 Kategori baru dibuat' : '✅ Transaksi dicatat',
                    }]);
                    toast.success('Transaksi berhasil dicatat!');
                    router.reload({ preserveScroll: true });
                } else {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: reply.message || 'Permintaan diproses.',
                    }]);
                    if (reply.success === false) {
                        toast.error('Gagal memproses instruksi.');
                    }
                }
            } else {
                const res = await axios.post('/ai/analyze', { prompt: text });
                if (res.data.success) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: res.data.advice,
                    }]);
                } else {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: res.data.advice || res.data.message || 'Gagal menghasilkan analisis.',
                    }]);
                }
            }
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Server AI sedang mengalami antrean singkat. Silakan kirim pesan kembali dalam beberapa detik.',
            }]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50"
                    />

                    <motion.div
                        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                        className="fixed inset-y-0 right-0 w-full max-w-md bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
                                    <Bot size={20} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h3 className="font-display font-bold text-slate-900 text-sm">Financial Copilot</h3>
                                    <p className="text-[11px] text-slate-400">Gemini Flash AI & Voice Operator</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleResetChat}
                                    title="Mulai chat baru / Bersihkan riwayat"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-[#F8FAFC]">
                            {messages.map((m, idx) => (
                                <div key={idx} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {m.role === 'assistant' && (
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <Sparkles size={14} />
                                        </div>
                                    )}

                                    <div className="flex flex-col gap-1.5 max-w-[88%]">
                                        {m.tag && (
                                            <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full w-fit shadow-xs ${
                                                m.tag.includes('Transfer')
                                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                                    : m.tag.includes('🆕')
                                                    ? 'bg-violet-100 text-violet-700 border border-violet-200'
                                                    : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                            }`}>
                                                {m.tag}
                                            </span>
                                        )}
                                        <div className={`p-4 rounded-2xl shadow-sm ${
                                            m.role === 'user'
                                                ? 'bg-slate-900 text-white rounded-br-none text-xs leading-relaxed font-medium'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                        }`}>
                                            {m.role === 'user' ? (
                                                <div>{m.content}</div>
                                            ) : (
                                                <MarkdownRenderer content={m.content} />
                                            )}
                                        </div>
                                    </div>

                                    {m.role === 'user' && (
                                        <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <User size={14} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {loading && (
                                <div className="flex gap-2.5 items-center text-slate-500 text-xs bg-white p-3 rounded-xl border border-slate-200 w-fit shadow-sm">
                                    <Loader2 size={15} className="text-emerald-600 animate-spin" />
                                    <span>
                                        {TX_ACTIONS.test(inputPrompt)
                                            ? 'Memproses instruksi & memutakhirkan saldo...'
                                            : 'Gemini sedang menyusun analisis finansial...'}
                                    </span>
                                </div>
                            )}

                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Prompts */}
                        <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto no-scrollbar flex gap-1.5">
                            {QUICK_PROMPTS.map((qp, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSend(qp)}
                                    disabled={loading}
                                    className="text-[11px] font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 whitespace-nowrap transition-all cursor-pointer"
                                >
                                    {qp}
                                </button>
                            ))}
                        </div>

                        {/* Voice Listening Bar */}
                        {isListening && (
                            <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center justify-between text-xs text-red-700 animate-pulse">
                                <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                                    <span className="font-semibold">Mendengarkan... Silakan berbicara sekarang</span>
                                </div>
                                <button
                                    onClick={toggleListening}
                                    className="text-[11px] underline font-bold hover:text-red-900"
                                >
                                    Selesai
                                </button>
                            </div>
                        )}

                        {/* Input Box */}
                        <div className="p-3 border-t border-slate-100 bg-white">
                            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    title={isListening ? 'Matikan Mikrofon' : 'Bicara dengan Suara (Voice Input)'}
                                    className={`p-2.5 rounded-xl transition-all cursor-pointer ${
                                        isListening
                                            ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-200'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                                    }`}
                                >
                                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                                </button>

                                <input
                                    type="text"
                                    value={inputPrompt}
                                    onChange={(e) => setInputPrompt(e.target.value)}
                                    placeholder={isListening ? "Mendengarkan suara Anda..." : "Ketik atau tekan mic untuk bicara..."}
                                    disabled={loading}
                                    className="input-luxury flex-1 text-xs py-2"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !inputPrompt.trim()}
                                    className="p-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 transition-all cursor-pointer"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
