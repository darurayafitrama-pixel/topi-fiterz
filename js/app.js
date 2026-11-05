// js/app.js
import { CONFIG } from "./config.js";
import { CATALOG } from "./data.js";
import {
  getLocalTodayString,
  calculateDuration,
  calculateTotals,
  addToCart,
  updateItemQuantity,
  removeFromCart,
  formatIDR,
} from "./cart.js";
import { loadSavedCart, saveCart } from "./storage.js";
import { validateOrderForm, generateWhatsAppUrl } from "./checkout.js";

// State Aplikasi
const state = {
  items: [],
  startDate: "",
  endDate: "",
  searchQuery: "",
  selectedCategory: "all",
  isReviewing: false,
};

// Selektor Elemen DOM
const dom = {
  catalogGrid: document.getElementById("catalog-grid"),
  catalogCount: document.getElementById("catalog-count"),
  searchInput: document.getElementById("search-input"),
  searchClearBtn: document.getElementById("search-clear-btn"),
  categoryButtons: document.querySelectorAll(".category-btn"),
  resetFilterBtn: document.getElementById("reset-filter-btn"),
  emptyCatalogMsg: document.getElementById("empty-catalog-msg"),

  cartItemsList: document.getElementById("cart-items-list"),
  cartEmptyMsg: document.getElementById("cart-empty-msg"),
  cartHeaderCount: document.getElementById("cart-header-count"),
  floatingCartBadge: document.getElementById("floating-cart-badge"),

  startDateInput: document.getElementById("start-date"),
  endDateInput: document.getElementById("end-date"),
  durationDisplay: document.getElementById("duration-display"),
  totalCostDisplay: document.getElementById("total-cost-display"),
  priceNoteDisplay: document.getElementById("price-note"),

  checkoutForm: document.getElementById("checkout-form"),
  customerNameInput: document.getElementById("customer-name"),
  customerPhoneInput: document.getElementById("customer-phone"),

  btnReviewOrder: document.getElementById("btn-review-order"),
  reviewSection: document.getElementById("review-section"),
  reviewContent: document.getElementById("review-content"),
  btnEditOrder: document.getElementById("btn-edit-order"),
  btnSendWhatsapp: document.getElementById("btn-send-whatsapp"),

  formErrorAlert: document.getElementById("form-error-alert"),
  storageStatusAlert: document.getElementById("storage-status-alert"),
  statusLiveRegion: document.getElementById("status-live"),
};

/**
 * Mengumumkan pesan status untuk screen reader via aria-live
 */
function announceStatus(message) {
  if (dom.statusLiveRegion) {
    dom.statusLiveRegion.textContent = message;
  }
}

/**
 * Menyimpan state dan menampilkan pesan jika storage dinonaktifkan
 */
function persistState() {
  const ok = saveCart(state);
  if (!ok && dom.storageStatusAlert) {
    dom.storageStatusAlert.classList.remove("hidden");
  } else if (dom.storageStatusAlert) {
    dom.storageStatusAlert.classList.add("hidden");
  }
}

/**
 * Membatalkan status review saat pengguna mengubah keranjang/tanggal
 */
function invalidateReview() {
  if (state.isReviewing) {
    state.isReviewing = false;
    dom.reviewSection.classList.add("hidden");
    dom.btnReviewOrder.classList.remove("hidden");
  }
}

/**
 * Render kartu produk katalog
 */
function renderCatalog() {
  const query = state.searchQuery.toLowerCase().trim();
  const cat = state.selectedCategory;

  const filtered = CATALOG.filter((product) => {
    const matchCat = cat === "all" || product.category === cat;
    const matchQuery =
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query) ||
      product.specification.toLowerCase().includes(query);
    return matchCat && matchQuery;
  });

  if (dom.catalogCount) {
    dom.catalogCount.textContent = `Menampilkan ${filtered.length} perlengkapan topi`;
  }

  if (!dom.catalogGrid) return;
  dom.catalogGrid.innerHTML = "";

  if (filtered.length === 0) {
    if (dom.emptyCatalogMsg) dom.emptyCatalogMsg.classList.remove("hidden");
    dom.catalogGrid.classList.add("hidden");
    return;
  }

  if (dom.emptyCatalogMsg) dom.emptyCatalogMsg.classList.add("hidden");
  dom.catalogGrid.classList.remove("hidden");

  filtered.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.setAttribute("aria-label", product.name);

    // Gambar
    const imgWrapper = document.createElement("div");
    imgWrapper.className = "product-image-wrap";
    const img = document.createElement("img");
    img.src = product.image;
    img.alt = product.imageAlt;
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    img.width = 400;
    img.height = 300;
    imgWrapper.appendChild(img);

    if (product.imageCredit && product.imageCreditUrl) {
      const imageCredit = document.createElement("a");
      imageCredit.className = "product-image-credit";
      imageCredit.href = product.imageCreditUrl;
      imageCredit.target = "_blank";
      imageCredit.rel = "noopener noreferrer";
      imageCredit.textContent = `Foto: ${product.imageCredit}`;
      imageCredit.setAttribute("aria-label", `Kredit foto ${product.name}: ${product.imageCredit}`);
      imgWrapper.appendChild(imageCredit);
    }

    // Detail Produk
    const body = document.createElement("div");
    body.className = "product-body";

    const badge = document.createElement("span");
    badge.className = "category-badge";
    badge.textContent = product.category.toUpperCase();

    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = product.name;

    const desc = document.createElement("p");
    desc.className = "product-desc";
    desc.textContent = product.description;

    const spec = document.createElement("p");
    spec.className = "product-spec";
    spec.textContent = `Spesifikasi: ${product.specification}`;

    const priceRow = document.createElement("div");
    priceRow.className = "product-price-row";

    const price = document.createElement("span");
    price.className = "product-price";
    price.textContent = `${formatIDR(product.dailyPrice)} `;
    const priceUnit = document.createElement("small");
    priceUnit.textContent = "/ unit / hari";
    price.appendChild(priceUnit);

    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-primary btn-add-cart";
    btnAdd.textContent = "+ Tambah";
    btnAdd.setAttribute("aria-label", `Tambahkan ${product.name} ke keranjang`);

    btnAdd.addEventListener("click", () => {
      state.items = addToCart(state.items, product.id, 1);
      persistState();
      invalidateReview();
      renderCart();
      announceStatus(`${product.name} ditambahkan ke keranjang.`);
    });

    priceRow.appendChild(price);
    priceRow.appendChild(btnAdd);

    body.appendChild(badge);
    body.appendChild(title);
    body.appendChild(desc);
    body.appendChild(spec);
    body.appendChild(priceRow);

    card.appendChild(imgWrapper);
    card.appendChild(body);
    dom.catalogGrid.appendChild(card);
  });
}

/**
 * Render isi keranjang belanja dan perhitungan total
 */
function renderCart() {
  const duration = calculateDuration(state.startDate, state.endDate);
  const { itemDetails, totalUnits, totalCost } = calculateTotals(
    state.items,
    CATALOG,
    duration
  );

  // Update indikator kuantitas
  if (dom.cartHeaderCount) {
    dom.cartHeaderCount.textContent = `(${totalUnits} unit)`;
  }
  if (dom.floatingCartBadge) {
    dom.floatingCartBadge.textContent = String(totalUnits);
  }

  // Tampilan item keranjang
  if (!dom.cartItemsList) return;
  dom.cartItemsList.innerHTML = "";
  if (itemDetails.length === 0) {
    if (dom.cartEmptyMsg) dom.cartEmptyMsg.classList.remove("hidden");
    dom.cartItemsList.classList.add("hidden");
  } else {
    if (dom.cartEmptyMsg) dom.cartEmptyMsg.classList.add("hidden");
    dom.cartItemsList.classList.remove("hidden");

    itemDetails.forEach(({ product, quantity, subtotal }) => {
      const li = document.createElement("li");
      li.className = "cart-item";

      const thumb = document.createElement("img");
      thumb.className = "cart-item-thumb";
      thumb.src = product.image;
      thumb.alt = "";
      thumb.setAttribute("aria-hidden", "true");
      thumb.referrerPolicy = "no-referrer";
      thumb.width = 48;
      thumb.height = 38;
      li.appendChild(thumb);

      const info = document.createElement("div");
      info.className = "cart-item-info";

      const name = document.createElement("h4");
      name.className = "cart-item-title";
      name.textContent = product.name;

      const rate = document.createElement("p");
      rate.className = "cart-item-rate";
      rate.textContent = `${formatIDR(product.dailyPrice)} / hari`;

      info.appendChild(name);
      info.appendChild(rate);

      // Kontrol Jumlah
      const controls = document.createElement("div");
      controls.className = "cart-item-controls";

      const btnDec = document.createElement("button");
      btnDec.type = "button";
      btnDec.className = "btn-qty";
      btnDec.textContent = "−";
      btnDec.setAttribute("aria-label", `Kurangi jumlah ${product.name}`);
      btnDec.disabled = quantity <= 1;
      btnDec.addEventListener("click", () => {
        state.items = updateItemQuantity(state.items, product.id, quantity - 1);
        persistState();
        invalidateReview();
        renderCart();
      });

      const qtySpan = document.createElement("span");
      qtySpan.className = "cart-qty-value";
      qtySpan.textContent = String(quantity);

      const btnInc = document.createElement("button");
      btnInc.type = "button";
      btnInc.className = "btn-qty";
      btnInc.textContent = "+";
      btnInc.setAttribute("aria-label", `Tambah jumlah ${product.name}`);
      btnInc.disabled = quantity >= 99;
      btnInc.addEventListener("click", () => {
        state.items = updateItemQuantity(state.items, product.id, quantity + 1);
        persistState();
        invalidateReview();
        renderCart();
      });

      const btnRemove = document.createElement("button");
      btnRemove.type = "button";
      btnRemove.className = "btn-remove-item";
      btnRemove.textContent = "Hapus";
      btnRemove.setAttribute("aria-label", `Hapus ${product.name} dari keranjang`);
      btnRemove.addEventListener("click", () => {
        state.items = removeFromCart(state.items, product.id);
        persistState();
        invalidateReview();
        renderCart();
        announceStatus(`${product.name} dihapus dari keranjang.`);
      });

      controls.appendChild(btnDec);
      controls.appendChild(qtySpan);
      controls.appendChild(btnInc);
      controls.appendChild(btnRemove);

      // Subtotal per baris
      const subtotalCol = document.createElement("div");
      subtotalCol.className = "cart-item-subtotal";
      subtotalCol.textContent = duration > 0 ? formatIDR(subtotal) : "-";

      li.appendChild(info);
      li.appendChild(controls);
      li.appendChild(subtotalCol);
      dom.cartItemsList.appendChild(li);
    });
  }

  // Update ringkasan durasi dan total
  if (dom.durationDisplay && dom.totalCostDisplay && dom.priceNoteDisplay) {
    if (state.startDate && state.endDate) {
      if (duration > 0) {
        dom.durationDisplay.textContent = `${duration} Hari Kalender`;
        dom.totalCostDisplay.textContent = formatIDR(totalCost);
        dom.priceNoteDisplay.textContent =
          "Estimasi biaya sewa (belum termasuk deposit & biaya pengantaran).";
      } else {
        dom.durationDisplay.textContent = "-";
        dom.totalCostDisplay.textContent = formatIDR(0);
        dom.priceNoteDisplay.textContent =
          "Tanggal pengembalian harus setelah tanggal pengambilan.";
      }
    } else {
      dom.durationDisplay.textContent = "-";
      dom.totalCostDisplay.textContent = formatIDR(0);
      dom.priceNoteDisplay.textContent = "Pilih tanggal untuk menghitung biaya.";
    }
  }
}

/**
 * Pasang seluruh event listener UI
 */
function setupEvents() {
  // Input Pencarian
  if (dom.searchInput && dom.searchClearBtn) {
    dom.searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      dom.searchClearBtn.classList.toggle("hidden", state.searchQuery === "");
      renderCatalog();
    });

    dom.searchClearBtn.addEventListener("click", () => {
      dom.searchInput.value = "";
      state.searchQuery = "";
      dom.searchClearBtn.classList.add("hidden");
      dom.searchInput.focus();
      renderCatalog();
    });
  }

  // Tombol Kategori
  dom.categoryButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      dom.categoryButtons.forEach((b) => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("active");
      btn.setAttribute("aria-pressed", "true");
      state.selectedCategory = btn.dataset.category || "all";
      renderCatalog();
    });
  });

  // Reset Filter
  if (dom.resetFilterBtn) {
    dom.resetFilterBtn.addEventListener("click", () => {
      if (dom.searchInput) dom.searchInput.value = "";
      state.searchQuery = "";
      state.selectedCategory = "all";
      if (dom.searchClearBtn) dom.searchClearBtn.classList.add("hidden");
      dom.categoryButtons.forEach((b) => {
        const isAll = b.dataset.category === "all";
        b.classList.toggle("active", isAll);
        b.setAttribute("aria-pressed", isAll ? "true" : "false");
      });
      renderCatalog();
    });
  }

  // Input Tanggal Mulai & Selesai
  const todayStr = getLocalTodayString();
  if (dom.startDateInput && dom.endDateInput) {
    dom.startDateInput.min = todayStr;
    dom.endDateInput.min = todayStr;

    dom.startDateInput.addEventListener("change", (e) => {
      state.startDate = e.target.value;
      if (state.startDate) {
        dom.endDateInput.min = state.startDate;
      }
      persistState();
      invalidateReview();
      renderCart();
    });

    dom.endDateInput.addEventListener("change", (e) => {
      state.endDate = e.target.value;
      persistState();
      invalidateReview();
      renderCart();
    });
  }

  // Periksa Pengajuan
  if (dom.btnReviewOrder) {
    dom.btnReviewOrder.addEventListener("click", () => {
      const nameVal = dom.customerNameInput ? dom.customerNameInput.value : "";
      const phoneVal = dom.customerPhoneInput ? dom.customerPhoneInput.value : "";

      const validation = validateOrderForm({
        name: nameVal,
        phone: phoneVal,
        items: state.items,
        startDate: state.startDate,
        endDate: state.endDate,
      });

      if (!validation.isValid) {
        const firstKey = Object.keys(validation.errors)[0];
        const errorMsg = validation.errors[firstKey];
        if (dom.formErrorAlert) {
          dom.formErrorAlert.textContent = errorMsg;
          dom.formErrorAlert.classList.remove("hidden");
        }

        // Pindahkan fokus ke input yang bermasalah sesuai WCAG
        if (firstKey === "name" && dom.customerNameInput) dom.customerNameInput.focus();
        else if (firstKey === "phone" && dom.customerPhoneInput) dom.customerPhoneInput.focus();
        else if (firstKey === "startDate" && dom.startDateInput) dom.startDateInput.focus();
        else if (firstKey === "endDate" && dom.endDateInput) dom.endDateInput.focus();
        return;
      }

      if (dom.formErrorAlert) dom.formErrorAlert.classList.add("hidden");
      state.isReviewing = true;

      // Render Ringkasan Review
      const duration = calculateDuration(state.startDate, state.endDate);
      const { itemDetails, totalCost } = calculateTotals(state.items, CATALOG, duration);

      // Aman dari XSS: Render teks murni ke elemen DOM
      if (dom.reviewContent) {
        dom.reviewContent.innerHTML = "";

        const dl = document.createElement("dl");
        dl.className = "review-dl";

        const addDlRow = (term, desc) => {
          const dt = document.createElement("dt");
          dt.textContent = term;
          const dd = document.createElement("dd");
          dd.textContent = desc;
          dl.appendChild(dt);
          dl.appendChild(dd);
        };

        addDlRow("Nama Penyewa:", nameVal.trim());
        addDlRow("Nomor WhatsApp:", phoneVal.trim());
        addDlRow("Periode Sewa:", `${state.startDate} s/d ${state.endDate} (${duration} hari)`);
        addDlRow(
          "Daftar Topi:",
          itemDetails.map((i) => `${i.product.name} (${i.quantity}x)`).join(", ")
        );
        addDlRow("Total Estimasi:", formatIDR(totalCost));

        dom.reviewContent.appendChild(dl);
      }

      // Cek ketersediaan nomor usaha
      const waUrl = generateWhatsAppUrl({
        name: nameVal,
        phone: phoneVal,
        itemDetails,
        duration,
        totalCost,
        startDate: state.startDate,
        endDate: state.endDate,
      });

      if (dom.btnSendWhatsapp) {
        if (!waUrl) {
          dom.btnSendWhatsapp.setAttribute("disabled", "true");
          dom.btnSendWhatsapp.textContent = "Pengajuan Online Belum Siap (Hubungi Toko)";
        } else {
          dom.btnSendWhatsapp.removeAttribute("disabled");
          dom.btnSendWhatsapp.textContent = "Ajukan via WhatsApp ↗";
          dom.btnSendWhatsapp.onclick = () => {
            window.open(waUrl, "_blank", "noopener,noreferrer");
          };
        }
      }

      if (dom.reviewSection) dom.reviewSection.classList.remove("hidden");
      dom.btnReviewOrder.classList.add("hidden");
      if (dom.reviewSection) dom.reviewSection.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Tombol Koreksi Pengajuan
  if (dom.btnEditOrder) {
    dom.btnEditOrder.addEventListener("click", () => {
      invalidateReview();
      if (dom.customerNameInput) dom.customerNameInput.focus();
    });
  }
}

/**
 * Inisialisasi awal saat halaman dimuat
 */
function init() {
  const loaded = loadSavedCart(CATALOG);
  state.items = loaded.items;
  state.startDate = loaded.startDate;
  state.endDate = loaded.endDate;

  if (state.startDate && dom.startDateInput) dom.startDateInput.value = state.startDate;
  if (state.endDate && dom.endDateInput) dom.endDateInput.value = state.endDate;

  setupEvents();
  renderCatalog();
  renderCart();
}

// Jalankan ketika dokumen siap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
