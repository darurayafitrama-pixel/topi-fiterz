// js/cart.js

/**
 * Mengambil tanggal lokal hari ini dalam format 'YYYY-MM-DD'
 * Menghindari penggunaan toISOString() yang rentan pergeseran UTC terhadap waktu lokal.
 */
export function getLocalTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Memecah string 'YYYY-MM-DD' menjadi komponen angka valid
 */
export function parseDateComponents(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  // Validasi batas kalender
  if (month < 1 || month > 12) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null;

  return { year, month, day };
}

/**
 * Menghitung selisih hari kalender murni menggunakan Date.UTC
 * Mengembalikan 0 jika tanggal tidak valid atau endDate <= startDate
 */
export function calculateDuration(startDateStr, endDateStr) {
  const start = parseDateComponents(startDateStr);
  const end = parseDateComponents(endDateStr);
  if (!start || !end) return 0;

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);

  if (endUtc <= startUtc) return 0;

  const diffMs = endUtc - startUtc;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Validasi apakah tanggal sewa tidak mendahului tanggal hari ini pada browser
 */
export function isStartDateValid(startDateStr) {
  const todayStr = getLocalTodayString();
  const start = parseDateComponents(startDateStr);
  const today = parseDateComponents(todayStr);
  if (!start || !today) return false;

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const todayUtc = Date.UTC(today.year, today.month - 1, today.day);
  return startUtc >= todayUtc;
}

/**
 * Format mata uang Rupiah integer
 */
export function formatIDR(amount) {
  const num = typeof amount === "number" && !Number.isNaN(amount) ? amount : 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Menambahkan atau memperbarui jumlah produk dalam keranjang (1–99)
 */
export function addToCart(items, productId, quantity = 1) {
  const validQty = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)));
  const existingIndex = items.findIndex((i) => i.productId === productId);

  if (existingIndex > -1) {
    const updated = [...items];
    const newQty = Math.min(99, updated[existingIndex].quantity + validQty);
    updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
    return updated;
  }
  return [...items, { productId, quantity: validQty }];
}

/**
 * Mengubah jumlah spesifik barang (1–99)
 */
export function updateItemQuantity(items, productId, newQuantity) {
  const validQty = Math.max(1, Math.min(99, Math.floor(Number(newQuantity) || 1)));
  return items.map((item) =>
    item.productId === productId ? { ...item, quantity: validQty } : item
  );
}

/**
 * Menghapus barang dari keranjang
 */
export function removeFromCart(items, productId) {
  return items.filter((item) => item.productId !== productId);
}

/**
 * Menghitung rincian biaya: subtotal per item dan total keseluruhan
 */
export function calculateTotals(items, catalog, duration) {
  const safeDuration = duration > 0 ? duration : 0;
  let totalCost = 0;
  let totalUnits = 0;

  const itemDetails = items
    .map((item) => {
      const product = catalog.find((p) => p.id === item.productId);
      if (!product) return null;
      const subtotal = product.dailyPrice * item.quantity * safeDuration;
      totalCost += subtotal;
      totalUnits += item.quantity;
      return {
        ...item,
        product,
        subtotal,
      };
    })
    .filter(Boolean);

  return {
    itemDetails,
    totalUnits,
    duration: safeDuration,
    totalCost,
  };
}
