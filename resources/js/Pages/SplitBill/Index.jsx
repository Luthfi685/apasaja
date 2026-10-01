import { useState, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Plus, Trash2, Copy, Check, Receipt,
    X, Calculator, CreditCard, Send, CheckCircle2,
    UserCheck, MessageCircle, AlertTriangle, RotateCcw,
    Ban, Share2, Camera, Utensils, Tag, Percent,
    AlertCircle, UserPlus, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

function formatCurrency(amount) {
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(amount));
}

const DEFAULT_COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

// ── Scan Struk Modal ──────────────────────────────────────────────────────────
function ScanModal({ isOpen, onClose, onResult }) {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const [scanning, setScanning] = useState(false);

    function handleFile(e) {
        const f = e.target.files[0];
        if (!f) return;
        setFile(f);
        setPreview(URL.createObjectURL(f));
    }

    async function doScan() {
        if (!file) return;
        setScanning(true);
        const form = new FormData();
        form.append('receipt', file);

        try {
            const res = await fetch('/ai/scan-receipt', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content || '' },
                body: form,
            });
            const json = await res.json();
            onResult(json);
            onClose();
            toast.success('Struk berhasil dipindai!');
        } catch (error) {
            console.error('Failed to scan receipt:', error);
            toast.error('Gagal memindai struk. Coba masukkan manual.');
        } finally {
            setScanning(false);
        }
    }

    function reset() {
        setPreview(null);
        setFile(null);
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                                    <Camera size={17} className="text-amber-600" /> Scan Struk Belanja
                                </h3>
                                <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                                    <X size={18} />
                                </button>
                            </div>

                            {!preview ? (
                                <label className="flex flex-col items-center justify-center w-full h-44 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/40 transition-all">
                                    <Camera size={32} className="text-slate-400 mb-2" />
                                    <p className="text-sm font-semibold text-slate-700">Pilih atau ambil foto struk</p>
                                    <p className="text-xs text-slate-400 mt-1">JPG, PNG, HEIC — maks 5 MB</p>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleFile}
                                    />
                                </label>
                            ) : (
                                <div className="relative">
                                    <img src={preview} alt="Preview struk" className="w-full max-h-64 object-contain rounded-xl border border-slate-200" />
                                    <button
                                        onClick={reset}
                                        className="absolute top-2 right-2 p-1.5 bg-white rounded-full border border-slate-200 text-slate-500 hover:text-rose-600 cursor-pointer"
                                    >
                                        <RotateCcw size={14} />
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={doScan}
                                    disabled={!file || scanning}
                                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
                                >
                                    {scanning ? 'Memindai...' : 'Scan & Isi Otomatis'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Can't Pay Modal ──────────────────────────────────────────────────────────
function CantPayModal({ isOpen, friend, onClose, onConfirm }) {
    return (
        <AnimatePresence>
            {isOpen && friend && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                                    <Ban size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">{friend.name} Tidak Bisa Bayar</h3>
                                    <p className="text-xs text-slate-500">Pilih penanganan tagihan:</p>
                                </div>
                            </div>

                            <div className="space-y-2.5 mb-5">
                                <button
                                    onClick={() => onConfirm('redistribute')}
                                    className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50 text-left cursor-pointer hover:bg-blue-100 transition-all"
                                >
                                    <p className="text-xs font-bold text-blue-900">Bagikan ke peserta lain</p>
                                    <p className="text-[11px] text-blue-700 mt-0.5">Bagiannya dibagi rata ke semua peserta yang aktif</p>
                                </button>
                                <button
                                    onClick={() => onConfirm('absorb')}
                                    className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50 text-left cursor-pointer hover:bg-amber-100 transition-all"
                                >
                                    <p className="text-xs font-bold text-amber-900">Saya yang nanggung</p>
                                    <p className="text-[11px] text-amber-700 mt-0.5">Bagiannya langsung dimasukkan ke tagihan saya</p>
                                </button>
                                <button
                                    onClick={() => onConfirm('remove')}
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-left cursor-pointer hover:bg-slate-100 transition-all"
                                >
                                    <p className="text-xs font-bold text-slate-900">Keluarkan dari daftar</p>
                                    <p className="text-[11px] text-slate-600 mt-0.5">Hapus dari tagihan, total dihitung ulang tanpa dia</p>
                                </button>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                            >
                                Batal
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SplitBillIndex() {
    // Mode: 'itemized' (Per Pesanan) | 'equal' (Bagi Rata) | 'custom' (Manual)
    const [splitMode, setSplitMode] = useState('itemized');

    // Bill Setup
    const [billName, setBillName] = useState('');
    const [manualTotalBill, setManualTotalBill] = useState('');
    const [taxPercent, setTaxPercent] = useState(0);
    const [serviceCharge, setServiceCharge] = useState(0);
    const [discountType, setDiscountType] = useState('percent'); // 'percent' | 'fixed'
    const [discountPercent, setDiscountPercent] = useState(0);
    const [discountFixed, setDiscountFixed] = useState('');
    const [myName, setMyName] = useState('Saya');
    const [myAccount, setMyAccount] = useState('');
    const [myBank, setMyBank] = useState('');
    const [myExtraShare, setMyExtraShare] = useState(0);

    // Participants (ID 'me' represents current user)
    const [friends, setFriends] = useState([]);
    const [newFriendName, setNewFriendName] = useState('');

    // Menu Items (for itemized mode)
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemAssigned, setNewItemAssigned] = useState(['me']);

    const [sessionDone, setSessionDone] = useState(false);
    const [scanOpen, setScanOpen] = useState(false);
    const [cantPayTarget, setCantPayTarget] = useState(null);

    // All active participant entities for assignment: ['me', ...friends]
    const allParticipants = useMemo(() => {
        return [
            { id: 'me', name: myName || 'Saya', color: '#059669', isMe: true },
            ...friends.map(f => ({ id: f.id, name: f.name, color: f.color, isMe: false, cantPay: f.cantPay }))
        ];
    }, [myName, friends]);

    // ── Calculations ──────────────────────────────────────────────────────────
    const calculation = useMemo(() => {
        const rawSubtotal = splitMode === 'itemized'
            ? items.reduce((s, it) => s + (parseFloat(it.price) || 0), 0)
            : (parseFloat(manualTotalBill) || 0);

        let discountAmount = 0;
        if (discountType === 'percent') {
            const pct = parseFloat(discountPercent) || 0;
            discountAmount = rawSubtotal * (pct / 100);
        } else {
            discountAmount = parseFloat(discountFixed) || 0;
        }

        if (splitMode === 'itemized') {
            // Calculate base food cost per participant
            const breakdown = {};
            breakdown['me'] = { base: 0, items: [] };
            friends.forEach(f => {
                breakdown[f.id] = { base: 0, items: [] };
            });

            let subtotal = 0;
            items.forEach(item => {
                const itemPrice = parseFloat(item.price) || 0;
                subtotal += itemPrice;
                const assigned = item.assignedTo || [];
                const splitCount = assigned.length > 0 ? assigned.length : 1;
                const perPersonItem = itemPrice / splitCount;

                assigned.forEach(pId => {
                    if (breakdown[pId]) {
                        breakdown[pId].base += perPersonItem;
                        breakdown[pId].items.push({
                            name: item.name,
                            price: itemPrice,
                            sharePrice: perPersonItem,
                            isShared: splitCount > 1,
                            sharedCount: splitCount
                        });
                    }
                });
            });

            const taxAmount = subtotal * (taxPercent / 100);
            const serviceAmount = subtotal * (serviceCharge / 100);
            const grandTotal = Math.max(0, subtotal + taxAmount + serviceAmount - discountAmount);

            // Proportional tax/service/discount distribution
            const personTotals = {};
            Object.keys(breakdown).forEach(pId => {
                const b = breakdown[pId].base;
                const prop = subtotal > 0 ? b / subtotal : 0;
                const pTax = b * (taxPercent / 100);
                const pService = b * (serviceCharge / 100);
                const pDisc = discountAmount * prop;
                const finalShare = Math.max(0, b + pTax + pService - pDisc);

                personTotals[pId] = {
                    base: b,
                    tax: pTax,
                    service: pService,
                    discount: pDisc,
                    total: finalShare,
                    items: breakdown[pId].items,
                };
            });

            return {
                subtotal,
                taxAmount,
                serviceAmount,
                discountAmount,
                grandTotal,
                personTotals,
            };
        } else {
            // Equal or Custom mode
            const subtotal = parseFloat(manualTotalBill) || 0;
            const taxAmount = subtotal * (taxPercent / 100);
            const serviceAmount = subtotal * (serviceCharge / 100);
            const grandTotal = Math.max(0, subtotal + taxAmount + serviceAmount - discountAmount);

            const payingFriends = friends.filter(f => !f.cantPay);
            const perPersonCount = payingFriends.length + 1;
            const perPersonEqual = perPersonCount > 0 ? grandTotal / perPersonCount : 0;

            const personTotals = {};
            if (splitMode === 'equal') {
                personTotals['me'] = { total: perPersonEqual, base: subtotal / perPersonCount, items: [] };
                friends.forEach(f => {
                    personTotals[f.id] = {
                        total: f.cantPay ? 0 : perPersonEqual,
                        base: f.cantPay ? 0 : subtotal / perPersonCount,
                        items: []
                    };
                });
            } else {
                // Custom
                const friendCustomSum = payingFriends.reduce((s, f) => s + (parseFloat(f.customAmount) || 0), 0);
                const myShare = Math.max(0, grandTotal - friendCustomSum);
                personTotals['me'] = { total: myShare, base: myShare, items: [] };
                friends.forEach(f => {
                    const custom = parseFloat(f.customAmount) || 0;
                    personTotals[f.id] = { total: f.cantPay ? 0 : custom, base: custom, items: [] };
                });
            }

            return {
                subtotal,
                taxAmount,
                serviceAmount,
                discountAmount,
                grandTotal,
                personTotals,
            };
        }
    }, [splitMode, items, manualTotalBill, taxPercent, serviceCharge, discountType, discountPercent, discountFixed, friends]);

    // ── Item Management (Itemized Mode) ───────────────────────────────────────
    function addItem() {
        const name = newItemName.trim();
        const price = parseFloat(newItemPrice) || 0;

        if (!name || !price) {
            toast.error('Masukkan nama menu dan harga.');
            return;
        }

        // Smart name matching: If the item name matches a friend's name, auto assign to them!
        let assigned = [...newItemAssigned];
        const lowerName = name.toLowerCase();
        const matchedFriend = friends.find(f => lowerName.includes(f.name.toLowerCase()));

        if (matchedFriend && newItemAssigned.length === 1 && newItemAssigned[0] === 'me') {
            assigned = [matchedFriend.id];
        }

        if (assigned.length === 0) {
            assigned = ['me'];
        }

        setItems(prev => [
            ...prev,
            {
                id: Date.now(),
                name: name,
                price: price,
                assignedTo: assigned
            }
        ]);
        setNewItemName('');
        setNewItemPrice('');
        setNewItemAssigned(['me']);
        toast.success('Menu pesanan ditambahkan.');
    }

    function removeItem(id) {
        setItems(prev => prev.filter(it => it.id !== id));
    }

    // Toggle participant for an item: If single click, switch to that participant; or multi-select if already has others
    function toggleItemAssignee(itemId, participantId) {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            const current = it.assignedTo || [];
            let newAssigned;

            if (current.includes(participantId)) {
                // If it's the only one, keep it
                if (current.length === 1) {
                    newAssigned = current;
                } else {
                    newAssigned = current.filter(id => id !== participantId);
                }
            } else {
                // Add participant
                newAssigned = [...current, participantId];
            }
            return { ...it, assignedTo: newAssigned };
        }));
    }

    // Set ONLY this participant for the item
    function setOnlyItemAssignee(itemId, participantId) {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            return { ...it, assignedTo: [participantId] };
        }));
    }

    // Assign item to all participants (shared food/drink)
    function setAllItemAssignee(itemId) {
        setItems(prev => prev.map(it => {
            if (it.id !== itemId) return it;
            return { ...it, assignedTo: allParticipants.map(p => p.id) };
        }));
    }

    // ── Friend Actions ────────────────────────────────────────────────────────
    function addFriend() {
        if (!newFriendName.trim()) return;
        const newId = Date.now();
        setFriends(prev => [
            ...prev,
            {
                id: newId,
                name: newFriendName.trim(),
                customAmount: '',
                paid: false,
                color: DEFAULT_COLORS[prev.length % DEFAULT_COLORS.length],
                cantPay: false,
                cantPayMode: null,
            }
        ]);
        setNewFriendName('');
        toast.success(`${newFriendName.trim()} ditambahkan.`);
    }

    function removeFriend(id) {
        setFriends(prev => prev.filter(f => f.id !== id));
        setItems(prev => prev.map(it => ({
            ...it,
            assignedTo: it.assignedTo.filter(pId => pId !== id).length > 0
                ? it.assignedTo.filter(pId => pId !== id)
                : ['me']
        })));
    }

    function togglePaid(id) {
        setFriends(prev => prev.map(f => f.id === id ? { ...f, paid: !f.paid } : f));
    }

    function handleCantPay(mode) {
        const f = cantPayTarget;
        if (!f) return;
        const share = calculation.personTotals[f.id]?.total || 0;

        if (mode === 'remove') {
            removeFriend(f.id);
            toast.success(`${f.name} dikeluarkan dari daftar tagihan.`);
        } else if (mode === 'absorb') {
            setMyExtraShare(prev => prev + share);
            setFriends(prev => prev.map(x => x.id === f.id ? { ...x, cantPay: true, cantPayMode: 'absorb', paid: false } : x));
            toast.success(`Tagihan ${f.name} kini ditanggung oleh Anda.`);
        } else if (mode === 'redistribute') {
            setFriends(prev => prev.map(x => x.id === f.id ? { ...x, cantPay: true, cantPayMode: 'redistribute', paid: false } : x));
            toast.success(`Tagihan ${f.name} dibagi ke peserta lain.`);
        }

        setCantPayTarget(null);
    }

    // ── WhatsApp Message Builder ──────────────────────────────────────────────
    function buildWhatsAppText() {
        let msg = `*Rincian Patungan${billName ? ` — ${billName}` : ''}*\n`;
        msg += `==========================\n\n`;

        // Friends
        friends.forEach(f => {
            if (f.cantPay && f.cantPayMode !== 'redistribute') {
                msg += `• *${f.name}*: _(tidak ikut bayar)_\n\n`;
            } else {
                const info = calculation.personTotals[f.id];
                const total = Math.round(info?.total || 0);
                const status = f.paid ? '[Lunas]' : '[Belum]';
                msg += `• *${f.name}* ${status}: *${formatCurrency(total)}*\n`;

                if (splitMode === 'itemized' && info?.items?.length > 0) {
                    info.items.forEach(it => {
                        const sharedNote = it.isShared ? ` (patungan ${it.sharedCount} org)` : '';
                        msg += `   - ${it.name}: ${formatCurrency(it.sharePrice)}${sharedNote}\n`;
                    });
                    if (info.tax > 0 || info.service > 0) {
                        msg += `   + Pajak & Layanan: ${formatCurrency(info.tax + info.service)}\n`;
                    }
                    if (info.discount > 0) {
                        msg += `   - Diskon: -${formatCurrency(info.discount)}\n`;
                    }
                }
                msg += `\n`;
            }
        });

        // Me
        const myInfo = calculation.personTotals['me'];
        const myTotal = Math.round((myInfo?.total || 0) + myExtraShare);
        msg += `• *${myName || 'Saya'} (Pembayar Utama)*: *${formatCurrency(myTotal)}*\n`;
        if (splitMode === 'itemized' && myInfo?.items?.length > 0) {
            myInfo.items.forEach(it => {
                const sharedNote = it.isShared ? ` (patungan ${it.sharedCount} org)` : '';
                msg += `   - ${it.name}: ${formatCurrency(it.sharePrice)}${sharedNote}\n`;
            });
            if (myInfo.tax > 0 || myInfo.service > 0) {
                msg += `   + Pajak & Layanan: ${formatCurrency(myInfo.tax + myInfo.service)}\n`;
            }
            if (myInfo.discount > 0) {
                msg += `   - Diskon: -${formatCurrency(myInfo.discount)}\n`;
            }
        }
        msg += `\n`;

        msg += `==========================\n`;
        msg += `*Total Tagihan: ${formatCurrency(calculation.grandTotal)}*\n`;
        msg += `- Subtotal Makanan: ${formatCurrency(calculation.subtotal)}\n`;
        if (calculation.taxAmount) msg += `- Pajak (${taxPercent}%): +${formatCurrency(calculation.taxAmount)}\n`;
        if (calculation.serviceAmount) msg += `- Layanan (${serviceCharge}%): +${formatCurrency(calculation.serviceAmount)}\n`;
        if (calculation.discountAmount) msg += `- Diskon: -${formatCurrency(calculation.discountAmount)}\n`;

        if (myAccount) {
            msg += `\n*Transfer ke${myBank ? ` ${myBank}` : ''}:*\n`;
            msg += `No. Rek: *${myAccount}*\n`;
            msg += `Atas Nama: *${myName}*\n`;
        }
        msg += `\nTerima kasih.`;
        return msg;
    }

    function openWhatsApp(targetPhone = '') {
        if (!calculation.grandTotal) {
            toast.error('Masukkan data tagihan terlebih dahulu.');
            return;
        }

        const text = buildWhatsAppText();

        // Always copy to clipboard as safe backup
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).catch(() => {
                toast.error('Gagal menyalin ke clipboard');
            });
        }

        const rawPhone = typeof targetPhone === 'string' ? targetPhone : '';
        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.substring(1);
        }

        const encodedText = encodeURIComponent(text);
        const url = cleanPhone
            ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
            : `https://api.whatsapp.com/send?text=${encodedText}`;

        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        toast.success('Membuka WhatsApp & teks otomatis disalin!');
    }

    function copyOnlyText() {
        if (!calculation.grandTotal) {
            toast.error('Masukkan data tagihan terlebih dahulu.');
            return;
        }

        const text = buildWhatsAppText();
        navigator.clipboard.writeText(text).then(() => {
            toast.success('Teks rincian berhasil disalin ke clipboard!');
        }).catch(() => {
            toast.error('Gagal menyalin teks.');
        });
    }

    function resetSession() {
        setBillName('');
        setManualTotalBill('');
        setTaxPercent(0);
        setServiceCharge(0);
        setDiscountType('percent');
        setDiscountPercent(0);
        setDiscountFixed('');
        setItems([]);
        setFriends([]);
        setMyExtraShare(0);
        setSessionDone(false);
        setNewFriendName('');
        setNewItemName('');
        setNewItemPrice('');
        setNewItemAssigned(['me']);
        toast.success('Sesi berhasil dikosongkan. Siap untuk patungan baru!');
    }

    // ── Scan Result ───────────────────────────────────────────────────────────
    function handleScanResult(result) {
        // API response: { success: true, data: { merchant_name, total_amount, items: [{name, price}] } }
        const data = result.data || result;
        if (data.merchant_name) setBillName(data.merchant_name);
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
            setSplitMode('itemized');
            setItems(data.items.map((it, idx) => ({
                id: Date.now() + idx,
                name: it.name || `Item ${idx + 1}`,
                price: parseFloat(it.price) || 0,
                assignedTo: ['me']
            })));
        } else if (data.total_amount) {
            setManualTotalBill(String(data.total_amount));
        }
    }

    // Status variables
    const payableFriends = friends.filter(f => !f.cantPay);
    const unpaidFriends = payableFriends.filter(f => !f.paid);
    const unpaidTotal = unpaidFriends.reduce((s, f) => s + (calculation.personTotals[f.id]?.total || 0), 0);
    const paidCount = payableFriends.filter(f => f.paid).length;
    const allDone = payableFriends.length > 0 && unpaidFriends.length === 0;

    // Check if any friends have Rp 0 in itemized mode
    const zeroFriends = splitMode === 'itemized'
        ? friends.filter(f => !f.cantPay && (calculation.personTotals[f.id]?.base || 0) === 0)
        : [];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-display font-bold text-slate-900">Split Bill & Patungan</h2>
                        <p className="text-xs text-slate-500">Bagi tagihan adil per menu pesanan atau bagi rata + kirim ke WhatsApp</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={resetSession}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold hover:bg-slate-200 transition-all cursor-pointer"
                            title="Kosongkan seluruh data untuk membuat patungan baru"
                        >
                            <RotateCcw size={14} className="text-slate-600" /> Sesi Baru / Reset
                        </button>
                        <button
                            onClick={() => setScanOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold hover:bg-amber-100 transition-all cursor-pointer"
                        >
                            <Camera size={14} /> Scan Struk AI
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Split Bill — FinanceOS" />

            <ScanModal
                isOpen={scanOpen}
                onClose={() => setScanOpen(false)}
                onResult={handleScanResult}
            />

            <CantPayModal
                isOpen={!!cantPayTarget}
                friend={cantPayTarget}
                onClose={() => setCantPayTarget(null)}
                onConfirm={handleCantPay}
            />

            {/* Warning if friends have Rp 0 */}
            {zeroFriends.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3"
                >
                    <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 text-xs">
                        <p className="font-bold text-amber-900">
                            Perhatian: {zeroFriends.map(f => f.name).join(' & ')} belum memiliki pesanan (Rp 0)!
                        </p>
                        <p className="text-amber-700 mt-0.5">
                            Pada daftar menu di bawah, klik tombol nama <b>{zeroFriends.map(f => f.name).join(', ')}</b> pada menu yang mereka pesan agar nominalnya terhitung otomatis.
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Selesai Banner */}
            <AnimatePresence>
                {(allDone || sessionDone) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mb-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-4"
                    >
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-emerald-900">Seluruh Tagihan Selesai</p>
                                <p className="text-xs text-emerald-700">Semua peserta yang bisa bayar telah berstatus lunas.</p>
                            </div>
                        </div>
                        <button
                            onClick={resetSession}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 border border-emerald-300 bg-white hover:bg-emerald-50 cursor-pointer flex-shrink-0"
                        >
                            <RotateCcw size={13} /> Reset Sesi
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT 2 COLUMNS: Setup & Mode Selection */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Mode Selector Tabs */}
                    <div className="glass-card p-4 bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Pilih Metode Split Bill:</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setSplitMode('itemized')}
                                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    splitMode === 'itemized' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Utensils size={14} className="text-emerald-600" /> Per Pesanan / Menu
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitMode('equal')}
                                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    splitMode === 'equal' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Calculator size={14} className="text-blue-600" /> Bagi Rata
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitMode('custom')}
                                className={`py-2.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                    splitMode === 'custom' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60' : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Percent size={14} className="text-purple-600" /> Kustom Manual
                            </button>
                        </div>
                    </div>

                    {/* Bill Basics */}
                    <div className="glass-card p-5 bg-white border border-slate-200">
                        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                            <Receipt size={16} className="text-emerald-600" /> Info Tagihan & Diskon
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Tempat / Acara</label>
                                <input
                                    type="text" value={billName}
                                    onChange={e => setBillName(e.target.value)}
                                    placeholder="Contoh: Kopi Kenangan, Kafe..."
                                    className="input-luxury text-xs py-2"
                                />
                            </div>

                            {splitMode !== 'itemized' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Total Tagihan Struk (Rp)</label>
                                    <input
                                        type="number" value={manualTotalBill}
                                        onChange={e => setManualTotalBill(e.target.value)}
                                        placeholder="Contoh: 150000"
                                        className="input-luxury text-xs py-2 font-mono font-bold"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Pajak Restoran / PB1 (%)</label>
                                <div className="flex gap-2">
                                    {[0, 5, 10, 11].map(v => (
                                        <button key={v} type="button" onClick={() => setTaxPercent(v)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${taxPercent === v ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                            {v}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Biaya Layanan / Service (%)</label>
                                <div className="flex gap-2">
                                    {[0, 5, 10].map(v => (
                                        <button key={v} type="button" onClick={() => setServiceCharge(v)}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${serviceCharge === v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                                            {v}%
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">Potongan / Diskon Promo</label>
                                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('percent')}
                                            className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${discountType === 'percent' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            % Persentase
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDiscountType('fixed')}
                                            className={`px-2.5 py-0.5 rounded-md transition-all cursor-pointer ${discountType === 'fixed' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                                        >
                                            Rp Nominal
                                        </button>
                                    </div>
                                </div>

                                {discountType === 'percent' ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-1.5">
                                            {[0, 10, 20, 30, 50, 70].map(pct => (
                                                <button
                                                    key={pct}
                                                    type="button"
                                                    onClick={() => setDiscountPercent(pct)}
                                                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                        discountPercent === pct
                                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {pct}%
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs text-emerald-900 font-semibold">Kustom:</span>
                                                <input
                                                    type="number"
                                                    value={discountPercent || ''}
                                                    onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                                                    placeholder="0"
                                                    className="w-16 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-center focus:outline-none"
                                                />
                                                <span className="text-xs font-bold text-emerald-900">%</span>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-emerald-700">
                                                Hemat: {formatCurrency(calculation.discountAmount)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="number"
                                            value={discountFixed}
                                            onChange={e => setDiscountFixed(e.target.value)}
                                            placeholder="Masukkan nominal diskon (Contoh: 25000)..."
                                            className="input-luxury text-xs py-2 font-mono"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* MODE 1: ITEMIZED LIST (PER PESANAN) */}
                    {splitMode === 'itemized' && (
                        <div className="glass-card p-5 bg-white border border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        <Utensils size={16} className="text-emerald-600" /> Daftar Menu & Pemesan
                                    </h3>
                                    <p className="text-xs text-slate-500">Klik nama pemesan pada setiap menu di bawah:</p>
                                </div>
                                <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Subtotal: {formatCurrency(calculation.subtotal)}
                                </span>
                            </div>

                            {/* Item list */}
                            <div className="space-y-3 mb-4">
                                {items.map((item) => {
                                    const assigned = item.assignedTo || [];
                                    const assignedNames = assigned.map(id => allParticipants.find(p => p.id === id)?.name || id).join(', ');

                                    return (
                                        <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                                                        <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                                            Pemesan: <b className="text-emerald-700">{assignedNames || 'Belum dipilih'}</b>
                                                        </span>
                                                    </div>
                                                    <p className="text-xs font-mono font-bold text-emerald-700 mt-0.5">{formatCurrency(item.price)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            {/* Assigned buttons */}
                                            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200/60">
                                                <span className="text-[11px] text-slate-500 font-semibold mr-1">Pilih Pemesan:</span>
                                                {allParticipants.map(p => {
                                                    const isSelected = assigned.includes(p.id);
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => toggleItemAssignee(item.id, p.id)}
                                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                                                isSelected
                                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                            }`}
                                                        >
                                                            {isSelected ? <Check size={12} className="stroke-[3]" /> : null}
                                                            {p.name}
                                                        </button>
                                                    );
                                                })}
                                                <button
                                                    type="button"
                                                    onClick={() => setAllItemAssignee(item.id)}
                                                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold border border-dashed border-slate-300 text-slate-600 hover:bg-slate-100 cursor-pointer ml-auto"
                                                    title="Bagi rata menu ini ke semua orang"
                                                >
                                                    Patungan Semua
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Add Item Form */}
                            <div className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800">Tambah Menu Baru:</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <input
                                        type="text"
                                        value={newItemName}
                                        onChange={e => setNewItemName(e.target.value)}
                                        placeholder="Nama makanan/minuman..."
                                        className="input-luxury text-xs py-2 sm:col-span-2"
                                    />
                                    <input
                                        type="number"
                                        value={newItemPrice}
                                        onChange={e => setNewItemPrice(e.target.value)}
                                        placeholder="Harga (Rp)..."
                                        className="input-luxury text-xs py-2 font-mono font-bold"
                                    />
                                </div>

                                <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] text-slate-600 font-semibold">Pemesan:</span>
                                        {allParticipants.map(p => {
                                            const isSelected = newItemAssigned.includes(p.id);
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const has = newItemAssigned.includes(p.id);
                                                        setNewItemAssigned(has ? (newItemAssigned.length > 1 ? newItemAssigned.filter(x => x !== p.id) : [p.id]) : [...newItemAssigned, p.id]);
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                                                        isSelected
                                                            ? 'bg-slate-900 text-white border-slate-900'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {p.name}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="btn-primary text-xs py-2 px-4 ml-auto"
                                    >
                                        <Plus size={14} /> Tambah Menu
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Participants Card */}
                    <div className="glass-card p-5 bg-white border border-slate-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Users size={16} className="text-blue-600" /> Rincian Beban Pembayaran Per Orang
                            </h3>
                            <span className="text-xs text-slate-500">
                                {payableFriends.length + 1} Orang Terdaftar
                            </span>
                        </div>

                        {/* Me */}
                        <div className="p-3.5 rounded-xl bg-slate-900 text-white mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center">
                                    <UserCheck size={16} className="text-white" />
                                </div>
                                <div>
                                    <input
                                        type="text" value={myName}
                                        onChange={e => setMyName(e.target.value)}
                                        className="bg-transparent text-white text-xs font-bold w-24 focus:outline-none border-b border-white/30"
                                        placeholder="Nama Anda"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-0.5">Pembayar Utama</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-sm font-mono font-bold text-emerald-400">
                                    {formatCurrency((calculation.personTotals['me']?.total || 0) + myExtraShare)}
                                </span>
                                {splitMode === 'itemized' && (
                                    <p className="text-[10px] text-slate-400">
                                        Makan: {formatCurrency(calculation.personTotals['me']?.base || 0)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Friend List */}
                        <div className="space-y-2.5">
                            {friends.map(f => {
                                const pInfo = calculation.personTotals[f.id];
                                const personTotal = pInfo?.total || 0;
                                const hasZero = splitMode === 'itemized' && (pInfo?.base || 0) === 0 && !f.cantPay;

                                return (
                                    <motion.div
                                        key={f.id} layout
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                                            f.cantPay
                                                ? 'bg-rose-50 border-rose-200 opacity-70'
                                                : hasZero
                                                    ? 'bg-amber-50/80 border-amber-200'
                                                    : f.paid
                                                        ? 'bg-emerald-50 border-emerald-200'
                                                        : 'bg-white border-slate-200'
                                        }`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${f.cantPay ? 'grayscale opacity-50' : ''}`}
                                            style={{ backgroundColor: f.color }}
                                        >
                                            {f.name[0]?.toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xs font-bold truncate ${f.cantPay ? 'line-through text-slate-400' : f.paid ? 'text-slate-500' : 'text-slate-900'}`}>
                                                {f.name}
                                            </p>
                                            {f.cantPay ? (
                                                <p className="text-[11px] text-rose-600 font-semibold mt-0.5">
                                                    {f.cantPayMode === 'absorb' ? `Ditanggung ${myName}` : f.cantPayMode === 'redistribute' ? 'Dibagi ke peserta lain' : 'Dikeluarkan'}
                                                </p>
                                            ) : splitMode === 'custom' ? (
                                                <input
                                                    type="number" value={f.customAmount}
                                                    onChange={e => setFriends(prev => prev.map(x => x.id === f.id ? { ...x, customAmount: e.target.value } : x))}
                                                    placeholder="Nominal manual..."
                                                    className="text-[11px] font-mono text-slate-700 border-b border-dashed border-slate-300 focus:outline-none w-full mt-0.5 bg-transparent"
                                                />
                                            ) : (
                                                <div>
                                                    <p className={`text-xs font-mono font-bold mt-0.5 ${hasZero ? 'text-amber-700' : 'text-emerald-700'}`}>
                                                        {formatCurrency(personTotal)}
                                                    </p>
                                                    {hasZero ? (
                                                        <p className="text-[10px] text-amber-600 font-semibold">
                                                            Belum memilih menu di atas!
                                                        </p>
                                                    ) : splitMode === 'itemized' && pInfo?.items?.length > 0 ? (
                                                        <p className="text-[10px] text-slate-500 truncate">
                                                            {pInfo.items.map(it => it.name).join(', ')}
                                                        </p>
                                                    ) : null}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {!f.cantPay && (
                                                <button
                                                    type="button" onClick={() => togglePaid(f.id)}
                                                    title={f.paid ? 'Tandai Belum Lunas' : 'Tandai Sudah Lunas'}
                                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${f.paid ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'}`}
                                                >
                                                    <Check size={13} />
                                                </button>
                                            )}
                                            {!f.cantPay && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCantPayTarget(f)}
                                                    title="Tidak bisa bayar"
                                                    className="p-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 cursor-pointer transition-all"
                                                >
                                                    <Ban size={13} />
                                                </button>
                                            )}
                                            {f.cantPay && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFriends(prev => prev.map(x => x.id === f.id ? { ...x, cantPay: false, cantPayMode: null } : x));
                                                        toast.success(`${f.name} dikembalikan ke daftar.`);
                                                    }}
                                                    title="Batalkan"
                                                    className="p-1.5 rounded-lg bg-rose-100 text-rose-600 border border-rose-200 hover:bg-rose-200 cursor-pointer transition-all"
                                                >
                                                    <RotateCcw size={13} />
                                                </button>
                                            )}
                                            <button
                                                type="button" onClick={() => removeFriend(f.id)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-all"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Add Friend */}
                        <div className="flex gap-2 mt-3">
                            <input
                                type="text" value={newFriendName}
                                onChange={e => setNewFriendName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addFriend()}
                                placeholder="Nama teman baru... (Tekan Enter)"
                                className="input-luxury text-xs py-2 flex-1"
                            />
                            <button type="button" onClick={addFriend} className="btn-primary text-xs px-4">
                                <Plus size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Transfer Info */}
                    <div className="glass-card p-5 bg-white border border-slate-200">
                        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                            <CreditCard size={16} className="text-slate-700" /> Info Rekening Tujuan Transfer (Untuk WA)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Bank / Dompet Digital</label>
                                <input type="text" value={myBank} onChange={e => setMyBank(e.target.value)}
                                    placeholder="BCA, Mandiri, Shopeepay..." className="input-luxury text-xs py-2" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Nomor Rekening / HP</label>
                                <input type="text" value={myAccount} onChange={e => setMyAccount(e.target.value)}
                                    placeholder="Nomor rekening atau HP..." className="input-luxury text-xs py-2 font-mono" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Summary & Action */}
                <div className="space-y-5">
                    <div className="glass-card p-5 bg-white border border-slate-200 sticky top-24">
                        <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                            <Calculator size={16} className="text-amber-600" /> Ringkasan Pembagian
                        </h3>

                        <div className="space-y-2 text-xs mb-4">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal Pesanan</span>
                                <span className="font-mono font-semibold">{formatCurrency(calculation.subtotal)}</span>
                            </div>
                            {calculation.taxAmount > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Pajak ({taxPercent}%)</span>
                                    <span className="font-mono text-amber-600">+{formatCurrency(calculation.taxAmount)}</span>
                                </div>
                            )}
                            {calculation.serviceAmount > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Layanan ({serviceCharge}%)</span>
                                    <span className="font-mono text-amber-600">+{formatCurrency(calculation.serviceAmount)}</span>
                                </div>
                            )}
                            {calculation.discountAmount > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Diskon</span>
                                    <span className="font-mono text-emerald-600">-{formatCurrency(calculation.discountAmount)}</span>
                                </div>
                            )}
                            <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900 text-sm">
                                <span>TOTAL TAGIHAN</span>
                                <span className="font-mono text-emerald-700">{formatCurrency(calculation.grandTotal)}</span>
                            </div>
                        </div>

                        {/* Payment Status */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                            <div className="flex justify-between text-xs mb-2">
                                <span className="font-bold text-slate-700">Status Pembayaran</span>
                                <span className="text-emerald-600 font-bold">{paidCount}/{payableFriends.length} Lunas</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: payableFriends.length > 0 ? `${(paidCount / payableFriends.length) * 100}%` : '0%' }}
                                />
                            </div>
                            {unpaidFriends.length > 0 && (
                                <p className="text-[11px] text-rose-600 font-semibold mt-2">
                                    Sisa belum lunas: {formatCurrency(unpaidTotal)}
                                </p>
                            )}
                            {allDone && (
                                <p className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
                                    <CheckCircle2 size={12} /> Semua peserta sudah lunas!
                                </p>
                            )}
                        </div>

                        {/* WhatsApp Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => openWhatsApp()}
                            className="w-full py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold flex items-center justify-center gap-2.5 hover:bg-[#1fbd59] transition-all cursor-pointer shadow-xs mb-2"
                        >
                            <MessageCircle size={16} /> Kirim Rincian ke WhatsApp
                        </motion.button>

                        {/* Copy Text Button */}
                        <button
                            type="button"
                            onClick={copyOnlyText}
                            className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-200 cursor-pointer transition-all mb-2"
                        >
                            <Copy size={14} className="text-slate-600" /> Salin Teks ke Clipboard
                        </button>

                        {/* Selesaikan Tagihan */}
                        {!allDone && payableFriends.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    setFriends(prev => prev.map(f => f.cantPay ? f : { ...f, paid: true }));
                                    setSessionDone(true);
                                    toast.success('Sesi tagihan diselesaikan.');
                                }}
                                className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 cursor-pointer transition-all"
                            >
                                <CheckCircle2 size={14} className="text-emerald-600" /> Selesaikan Tagihan
                            </button>
                        )}

                        <p className="text-[10px] text-slate-400 text-center mt-2.5 leading-relaxed">
                            {splitMode === 'itemized'
                                ? 'Pajak & service dibagi proporsional sesuai nominal konsumsi masing-masing.'
                                : 'Tagihan dibagi rata atau kustom sesuai pengaturan Anda.'}
                        </p>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
