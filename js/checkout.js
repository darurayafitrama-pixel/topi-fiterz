// js/checkout.js
import { CONFIG } from "./config.js";
import { formatIDR, isStartDateValid, calculateDuration } from "./cart.js";

/**
 * Normalisasi nomor WhatsApp menjadi digit murni dengan kode negara Indonesia
 */
export function normalizeWhatsAppNumber(rawPhone) {
  if (!rawPhone || typeof rawPhone !== "string") return "";
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = "62" + digits.slice(1);
  }
  return digits;
}

/**
 * Validasi form pengajuan sewa
 */
export function validateOrderForm({ name, phone, items, startDate, endDate }) {
  const errors = {};

  const cleanName = (name || "").trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    errors.name = "Nama penyewa harus terdiri dari 2 hingga 80 karakter.";
  }

  const cleanPhone = normalizeWhatsAppNumber(phone);
  if (cleanPhone.length < 9 || cleanPhone.length > 15) {
    errors.phone = "Nomor WhatsApp harus valid (minimal 9–15 digit, contoh: 08123456789).";
  }

  if (!items || items.length === 0) {
    errors.cart = "Keranjang sewa masih kosong. Pilih minimal satu perlengkapan topi.";
  }

  if (!startDate) {
    errors.startDate = "Pilih tanggal pengambilan perlengkapan.";
  } else if (!isStartDateValid(startDate)) {
    errors.startDate = "Tanggal pengambilan tidak boleh sebelum hari ini.";
  }

  if (!endDate) {
    errors.endDate = "Pilih tanggal pengembalian perlengkapan.";
  } else if (startDate && calculateDuration(startDate, endDate) <= 0) {
    errors.endDate = "Tanggal pengembalian harus setelah tanggal pengambilan.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Merakit URL wa.me dengan draft pesan terstruktur dan aman di-encode
 */
export function generateWhatsAppUrl({ name, phone, itemDetails, duration, totalCost, startDate, endDate }) {
  if (!CONFIG.WHATSAPP_NUMBER || CONFIG.WHATSAPP_NUMBER.trim() === "") {
    return null;
  }

  const itemsListText = itemDetails
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.product.name} (${item.quantity} unit) @ ${formatIDR(
          item.product.dailyPrice
        )}/hari = ${formatIDR(item.subtotal)}`
    )
    .join("\n");

  const message = [
    `Halo ${CONFIG.STORE_NAME}, saya ingin mengajukan penyewaan perlengkapan topi:`,
    "",
    "📋 *RINCIAN PENYEWA*",
    `• Nama: ${name.trim()}`,
    `• No. WhatsApp: ${phone.trim()}`,
    "",
    "📅 *JADWAL SEWA*",
    `• Tanggal Ambil: ${startDate}`,
    `• Tanggal Kembali: ${endDate}`,
    `• Durasi: ${duration} hari`,
    "",
    "🧢 *DAFTAR ITEM*",
    itemsListText,
    "",
    `💰 *ESTIMASI TOTAL BIAYA: ${formatIDR(totalCost)}*`,
    "",
    "Keterangan:",
    "Total di atas adalah estimasi sewa alat. Mohon informasi ketersediaan stok fisik dan prosedur pengambilan di toko. Terima kasih!"
  ].join("\n");

  const cleanTargetNumber = CONFIG.WHATSAPP_NUMBER.replace(/\D/g, "");
  return `https://wa.me/${cleanTargetNumber}?text=${encodeURIComponent(message)}`;
}
