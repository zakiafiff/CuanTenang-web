#!/usr/bin/env python3
"""
Mengambil harga emas Antam 1 gram dari Emas API ID (emas.maulanar.my.id),
menyimpannya ke riwayat (data/antam-history.json), lalu menulis ulang
assets/antam-data.js supaya grafik di pasar.html terisi.

Dijalankan otomatis oleh .github/workflows/update-antam.yml.
Bisa juga dijalankan manual: python3 scripts/update_antam.py
"""
import json
import os
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone

API_URL = "https://emas.maulanar.my.id/api/prices?limit=20"
API_KEY = os.environ.get("EMAS_API_KEY", "")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORY_PATH = os.path.join(ROOT, "data", "antam-history.json")
OUT_PATH = os.path.join(ROOT, "assets", "antam-data.js")
MAX_ENTRIES = 180  # kira-kira 6 bulan kalau diperbarui harian


def fetch_price():
    if not API_KEY:
        print("::error::EMAS_API_KEY belum diset. Tambahkan di GitHub Secrets.")
        sys.exit(1)
    req = urllib.request.Request(API_URL, headers={"X-API-Key": API_KEY})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"::error::Gagal mengambil data (HTTP {e.code}): {e.read().decode('utf-8', 'ignore')}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"::error::Gagal menghubungi API: {e}")
        sys.exit(1)

    items = payload.get("data", [])
    candidates = [
        it for it in items
        if str(it.get("brand", "")).upper() == "ANTAM" and it.get("weight") == 1
    ]
    if not candidates:
        print("::error::Tidak menemukan data ANTAM 1 gram di respons API.")
        print(json.dumps(payload)[:500])
        sys.exit(1)

    item = candidates[0]
    sell = item.get("sell_price")
    buyback = item.get("buyback_price")
    updated_at = item.get("updated_at", "")
    tanggal = updated_at[:10] if updated_at else datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if not isinstance(sell, (int, float)) or sell <= 0:
        print("::error::Harga jual tidak valid dari API.")
        sys.exit(1)

    return {"tanggal": tanggal, "jual": int(sell), "buyback": int(buyback) if buyback else None}


def load_history():
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_history(history):
    os.makedirs(os.path.dirname(HISTORY_PATH), exist_ok=True)
    with open(HISTORY_PATH, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def upsert(history, entry):
    history = [h for h in history if h.get("tanggal") != entry["tanggal"]]
    history.append(entry)
    history.sort(key=lambda h: h["tanggal"])
    return history[-MAX_ENTRIES:]


def write_js(history):
    lines = [
        "/* Data harga emas Antam. Dibuat otomatis oleh scripts/update_antam.py",
        "   lewat .github/workflows/update-antam.yml. Jangan diedit manual,",
        "   karena akan tertimpa saat workflow berjalan lagi. */",
        "window.ANTAM_DATA = [",
    ]
    for h in history:
        buyback = h["buyback"] if h["buyback"] is not None else "null"
        lines.append(
            '  { "tanggal": "%s", "jual": %d, "buyback": %s },' % (h["tanggal"], h["jual"], buyback)
        )
    lines.append("];")
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    entry = fetch_price()
    history = load_history()
    history = upsert(history, entry)
    save_history(history)
    write_js(history)
    print(f"OK: {entry['tanggal']} jual={entry['jual']} buyback={entry['buyback']}")


if __name__ == "__main__":
    main()
