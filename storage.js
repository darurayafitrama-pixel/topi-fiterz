// js/storage.js
import { CONFIG } from "./config.js";
import { isStartDateValid, parseDateComponents } from "./cart.js";

/**
 * Membaca keranjang dari localStorage secara aman
 */
export function loadSavedCart(catalog) {
  const fallback = {
    schemaVersion: CONFIG.SCHEMA_VERSION,
    items: [],
    startDate: "",
    endDate: "",
  };

  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    if (parsed.schemaVersion !== CONFIG.SCHEMA_VERSION) return fallback;

    // Validasi daftar item
    const validItems = [];
    if (Array.isArray(parsed.items)) {
      for (const item of parsed.items) {
        if (!item || typeof item !== "object") continue;
        const exists = catalog.some((p) => p.id === item.productId);
        const qty = Math.floor(Number(item.quantity));
        if (exists && qty >= 1 && qty <= 99) {
          validItems.push({ productId: item.productId, quantity: qty });
        }
      }
    }

    // Validasi tanggal
    let startDate = "";
    let endDate = "";
    if (typeof parsed.startDate === "string" && parseDateComponents(parsed.startDate)) {
      // Sesuai SOP: tanggal yang sudah lewat otomatis dihapus
      if (isStartDateValid(parsed.startDate)) {
        startDate = parsed.startDate;
        if (typeof parsed.endDate === "string" && parseDateComponents(parsed.endDate)) {
          endDate = parsed.endDate;
        }
      }
    }

    return {
      schemaVersion: CONFIG.SCHEMA_VERSION,
      items: validItems,
      startDate,
      endDate,
    };
  } catch (err) {
    console.warn("Storage membaca gagal, memulihkan state kosong:", err);
    return fallback;
  }
}

/**
 * Menyimpan keranjang ke localStorage
 */
export function saveCart(state) {
  try {
    const payload = {
      schemaVersion: CONFIG.SCHEMA_VERSION,
      items: state.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
      })),
      startDate: state.startDate || "",
      endDate: state.endDate || "",
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn("Penyimpanan localStorage gagal:", err);
    return false;
  }
}
