/* CuanTenang - logika kalkulator dan grafik.
   Persentase di bawah SAMA dengan tabel profil alokasi di dalam file template Excel.
   Kalau kamu mengubah angka di template, ubah juga di sini. */

var TIERS = [
  { no: 1, name: "Awal", label: "Sampai Rp10 juta", max: 10000000, file: "Tier1_gaji-sampai-10jt" },
  { no: 2, name: "Bertumbuh", label: "Rp10 - 50 juta", max: 50000000, file: "Tier2_gaji-10-sampai-50jt" },
  { no: 3, name: "Mapan", label: "Rp50 - 100 juta", max: 100000000, file: "Tier3_gaji-50-sampai-100jt" },
  { no: 4, name: "Mandiri", label: "Di atas Rp100 juta", max: Infinity, file: "Tier4_gaji-di-atas-100jt" }
];

/* [batas gaji per bulan, persen per kelompok] */
var BANDS = {
  pengeluaran: {
    groups: ["Kebutuhan", "Keinginan", "Tabungan & investasi"],
    tiers: [
      [[3000000, 75, 15, 10], [5000000, 70, 15, 15], [7500000, 65, 15, 20], [10000000, 60, 20, 20]],
      [[20000000, 55, 25, 20], [30000000, 50, 30, 20], [50000000, 45, 30, 25]],
      [[75000000, 40, 30, 30], [100000000, 35, 30, 35]],
      [[200000000, 30, 30, 40], [Infinity, 25, 30, 45]]
    ]
  },
  cicilan: {
    groups: ["Cicilan & utang", "Kebutuhan", "Keinginan", "Tabungan & investasi"],
    tiers: [
      [[3000000, 30, 45, 10, 15], [5000000, 30, 40, 10, 20], [7500000, 30, 35, 15, 20], [10000000, 30, 30, 20, 20]],
      [[20000000, 30, 30, 20, 20], [30000000, 30, 25, 20, 25], [50000000, 25, 25, 20, 30]],
      [[75000000, 25, 20, 20, 35], [100000000, 20, 20, 20, 40]],
      [[200000000, 20, 15, 20, 45], [Infinity, 15, 15, 20, 50]]
    ]
  }
};

function tierFor(salary) {
  for (var i = 0; i < TIERS.length; i++) {
    if (salary <= TIERS[i].max) return TIERS[i];
  }
  return TIERS[TIERS.length - 1];
}

function profileFor(salary, mode) {
  var set = BANDS[mode];
  var tier = tierFor(salary);
  var bands = set.tiers[tier.no - 1];
  var row = bands[bands.length - 1];
  for (var i = 0; i < bands.length; i++) {
    if (bands[i][0] >= salary) { row = bands[i]; break; }
  }
  var groups = set.groups.map(function (name, j) {
    var pct = row[1 + j];
    return { name: name, pct: pct, amount: Math.round(salary * pct / 100) };
  });
  return { tier: tier, groups: groups };
}

function rupiah(n) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

function parseRupiah(text) {
  var digits = String(text).replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function templateLinks(tier) {
  return {
    cicilan: "templates/" + tier.file + "_Banyak-Cicilan.xlsx",
    pengeluaran: "templates/" + tier.file + "_Banyak-Pengeluaran.xlsx"
  };
}

/* ---------------- kalkulator ---------------- */
var BAR_COLORS = ["bg-primary-container", "bg-secondary", "bg-primary-fixed-dim", "bg-tertiary-fixed-dim"];

function renderCalc(root) {
  var input = root.querySelector("[data-salary]");
  var out = root.querySelector("[data-results]");
  var info = root.querySelector("[data-tier-info]");
  var links = root.querySelector("[data-links]");
  var mode = root.getAttribute("data-mode") || "pengeluaran";
  var salary = parseRupiah(input.value);

  if (salary <= 0) {
    out.innerHTML = '<p class="text-body-md text-on-surface-variant">Isi gaji bersih per bulan untuk melihat pembagiannya.</p>';
    if (info) info.textContent = "";
    if (links) links.innerHTML = "";
    return;
  }
  var p = profileFor(salary, mode);
  var html = "";
  p.groups.forEach(function (g, i) {
    html += '<div class="bg-surface-container-lowest rounded-xl border border-outline-variant/50 p-space-md">' +
      '<div class="flex items-baseline justify-between gap-space-sm">' +
      '<span class="font-label-lg text-label-lg text-on-surface-variant">' + g.name + '</span>' +
      '<span class="font-label-lg text-label-lg text-secondary">' + g.pct + '%</span></div>' +
      '<p class="font-display text-headline-sm text-primary mt-space-xs">' + rupiah(g.amount) + '</p>' +
      '<div class="mt-space-sm h-2 rounded bg-surface-container overflow-hidden">' +
      '<div class="h-2 ' + BAR_COLORS[i % BAR_COLORS.length] + '" style="width:' + g.pct + '%"></div></div></div>';
  });
  out.innerHTML = html;
  if (info) {
    info.textContent = "Gaji " + rupiah(salary) + " masuk Tier " + p.tier.no + " (" + p.tier.name + ", " + p.tier.label + " per bulan).";
  }
  if (links) {
    var l = templateLinks(p.tier);
    links.innerHTML =
      '<a download href="' + l.pengeluaran + '" class="inline-flex items-center gap-space-xs rounded-lg bg-secondary text-on-secondary px-space-md py-space-sm font-label-lg text-label-lg hover:opacity-90">Unduh template Banyak Pengeluaran</a> ' +
      '<a download href="' + l.cicilan + '" class="inline-flex items-center gap-space-xs rounded-lg bg-primary-container text-on-primary px-space-md py-space-sm font-label-lg text-label-lg hover:opacity-90">Unduh template Banyak Cicilan</a>';
  }
}

function initCalc(root) {
  var input = root.querySelector("[data-salary]");
  function format() {
    var n = parseRupiah(input.value);
    input.value = n ? n.toLocaleString("id-ID") : "";
  }
  input.addEventListener("input", function () { format(); renderCalc(root); });
  root.querySelectorAll("[data-amount]").forEach(function (b) {
    b.addEventListener("click", function () {
      input.value = parseInt(b.getAttribute("data-amount"), 10).toLocaleString("id-ID");
      renderCalc(root);
    });
  });
  root.querySelectorAll("[data-set-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      root.setAttribute("data-mode", b.getAttribute("data-set-mode"));
      root.querySelectorAll("[data-set-mode]").forEach(function (x) {
        var on = x === b;
        x.setAttribute("aria-pressed", on ? "true" : "false");
        x.classList.toggle("bg-primary-container", on);
        x.classList.toggle("text-on-primary", on);
        x.classList.toggle("bg-surface-container", !on);
        x.classList.toggle("text-on-surface", !on);
      });
      var note = root.querySelector("[data-mode-note]");
      if (note) {
        note.textContent = root.getAttribute("data-mode") === "cicilan"
          ? "Versi ini memisahkan cicilan dan utang sebagai kelompok tersendiri. Pedoman umum: total cicilan tidak lebih dari sekitar 30% penghasilan."
          : "Versi ini cocok kalau cicilanmu sedikit tapi pengeluaran harian banyak. Cicilan (kalau ada) dihitung di dalam Kebutuhan.";
      }
      renderCalc(root);
    });
  });
  format();
  renderCalc(root);
}

/* ---------------- grafik Antam (data diisi manual) ---------------- */
function demoAntam() {
  var arr = [], base = 1000000, d = new Date(2026, 0, 1);
  for (var i = 0; i < 30; i++) {
    base += Math.round(Math.sin(i / 3) * 6000 + (i % 5 - 2) * 1500);
    var t = new Date(d.getTime() + i * 86400000);
    arr.push({ tanggal: t.toISOString().slice(0, 10), jual: base + 80000, buyback: base });
  }
  return arr;
}

function renderAntam(root) {
  var demo = /[?&]demo=1/.test(location.search);
  var data = demo ? demoAntam() : (window.ANTAM_DATA || []);
  var empty = root.querySelector("[data-antam-empty]");
  var box = root.querySelector("[data-antam-box]");
  if (!data.length) { empty.classList.remove("hidden"); box.classList.add("hidden"); return; }
  empty.classList.add("hidden"); box.classList.remove("hidden");

  data = data.slice().sort(function (a, b) { return a.tanggal < b.tanggal ? -1 : 1; });
  var last = data[data.length - 1];
  var ids = ["jual", "buyback", "tanggal"];
  root.querySelector("[data-antam-jual]").textContent = rupiah(last.jual) + " / gram";
  root.querySelector("[data-antam-buyback]").textContent = last.buyback ? rupiah(last.buyback) + " / gram" : "-";
  root.querySelector("[data-antam-tanggal]").textContent = last.tanggal;
  var tag = root.querySelector("[data-antam-demo]");
  if (demo) tag.classList.remove("hidden");

  var W = 640, H = 260, L = 64, R = 16, T = 16, B = 32;
  var vals = [];
  data.forEach(function (r) { vals.push(r.jual); if (r.buyback) vals.push(r.buyback); });
  var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  if (max === min) { max += 1; min -= 1; }
  var pad = (max - min) * 0.1; min -= pad; max += pad;
  function x(i) { return L + (data.length === 1 ? (W - L - R) / 2 : i * (W - L - R) / (data.length - 1)); }
  function y(v) { return T + (max - v) * (H - T - B) / (max - min); }
  function line(key, color) {
    var pts = [];
    data.forEach(function (r, i) { if (r[key]) pts.push(x(i).toFixed(1) + "," + y(r[key]).toFixed(1)); });
    return '<polyline fill="none" stroke="' + color + '" stroke-width="2" points="' + pts.join(" ") + '"/>';
  }
  var svg = '<svg viewBox="0 0 ' + W + " " + H + '" class="w-full h-auto" role="img" aria-label="Grafik harga emas Antam">';
  for (var k = 0; k <= 3; k++) {
    var v = min + (max - min) * k / 3, yy = y(v);
    svg += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '" stroke="#c3c6ce" stroke-width="0.5"/>' +
      '<text x="' + (L - 6) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="#43474d">' + Math.round(v / 1000) + ' rb</text>';
  }
  svg += line("jual", "#006c4a") + line("buyback", "#0f2942");
  svg += '<text x="' + L + '" y="' + (H - 8) + '" font-size="11" fill="#43474d">' + data[0].tanggal + '</text>' +
    '<text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" font-size="11" fill="#43474d">' + last.tanggal + '</text></svg>';
  root.querySelector("[data-antam-chart]").innerHTML = svg;
}

if (typeof document !== "undefined") document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll("[data-calc]").forEach(initCalc);
  var a = document.querySelector("[data-antam]");
  if (a) renderAntam(a);
});

if (typeof module !== "undefined") { module.exports = { profileFor: profileFor, tierFor: tierFor, parseRupiah: parseRupiah, rupiah: rupiah }; }
