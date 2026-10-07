import random
import os
import time

# ================== KONFIGURASI ==================
UKURAN = 10
KAPAL = {
    "Carrier": 5,
    "Battleship": 4,
    "Cruiser": 3,
    "Submarine": 3,
    "Destroyer": 2,
}
SIMBOL_KOSONG = "🌊"
SIMBOL_KAPAL  = "🚢"
SIMBOL_MISS   = "💦"
SIMBOL_HIT    = "💥"

# ================== WARNA (ANSI TRUECOLOR) ==================
RESET = "\033[0m"

def warna(teks, r, g, b):
    return f"\033[38;2;{r};{g};{b}m{teks}{RESET}"

WARNA_LAUT = (47, 152, 245)
WARNA_HIT  = (217, 15, 15)
WARNA_MISS = (94, 250, 10)

# ================== UTIL ==================
def bersihkan_layar():
    os.system("cls" if os.name == "nt" else "clear")

def buat_papan():
    return [[SIMBOL_KOSONG for _ in range(UKURAN)] for _ in range(UKURAN)]

def tampilkan_papan(papan, daftar_kapal=None, sembunyikan_kapal=False, judul="PAPAN"):
    print(f"\n=== {judul} ===")
    print("   " + " ".join(f"{i:2}" for i in range(UKURAN)))

    # --- Panel status: HANYA kapal yang sudah hancur ---
    status_lines = []
    if daftar_kapal is not None:
        kapal_hancur = [k for k in daftar_kapal if k["hancur"]]
        if kapal_hancur:
            status_lines.append(" Kapal Hancur:")
            for kapal in kapal_hancur:
                status_lines.append(
                    " " + warna(f"💀 {kapal['nama']}", *WARNA_HIT)
                )

    # --- Gambar papan ---
    for r in range(UKURAN):
        baris = []
        for c in range(UKURAN):
            sel = papan[r][c]
            if sembunyikan_kapal and sel == SIMBOL_KAPAL:
                sel = SIMBOL_KOSONG
            if sel == SIMBOL_KOSONG:
                sel = warna(sel, *WARNA_LAUT)
            elif sel == SIMBOL_HIT:
                sel = warna(sel, *WARNA_HIT)
            elif sel == SIMBOL_MISS:
                sel = warna(sel, *WARNA_MISS)
            baris.append(f"{sel} ")

        line = f"{r:2} " + "".join(baris)
        if status_lines and r < len(status_lines):
            line += "  " + status_lines[r]
        print(line)

# ================== PENEMPATAN KAPAL ==================
def bisa_ditempatkan(papan, baris, kolom, ukuran, horizontal):
    if horizontal:
        if kolom + ukuran > UKURAN:
            return False
        for c in range(kolom, kolom + ukuran):
            if papan[baris][c] != SIMBOL_KOSONG:
                return False
    else:
        if baris + ukuran > UKURAN:
            return False
        for r in range(baris, baris + ukuran):
            if papan[r][kolom] != SIMBOL_KOSONG:
                return False
    return True

def tempatkan_kapal(papan, baris, kolom, ukuran, horizontal):
    """Tempatkan kapal, kembalikan daftar koordinatnya."""
    koordinat = []
    if horizontal:
        for c in range(kolom, kolom + ukuran):
            papan[baris][c] = SIMBOL_KAPAL
            koordinat.append((baris, c))
    else:
        for r in range(baris, baris + ukuran):
            papan[r][kolom] = SIMBOL_KAPAL
            koordinat.append((r, kolom))
    return koordinat

def tempatkan_kapal_random(papan):
    """Return: daftar_kapal (list of dict)."""
    daftar = []
    for nama, ukuran in KAPAL.items():
        while True:
            horizontal = random.choice([True, False])
            baris = random.randint(0, UKURAN - 1)
            kolom = random.randint(0, UKURAN - 1)
            if bisa_ditempatkan(papan, baris, kolom, ukuran, horizontal):
                koord = tempatkan_kapal(papan, baris, kolom, ukuran, horizontal)
                daftar.append({
                    "nama": nama,
                    "ukuran": ukuran,
                    "koordinat": koord,
                    "hancur": False,
                })
                break
    return daftar

def tempatkan_kapal_manual(papan):
    daftar = []
    for nama, ukuran in KAPAL.items():
        while True:
            tampilkan_papan(papan, judul="PAPANMU")
            print(f"\nTempatkan {nama} (ukuran {ukuran})")
            try:
                inp = input("Masukkan (baris kolom orientasi[h/v]): ").split()
                baris = int(inp[0])
                kolom = int(inp[1])
                orientasi = inp[2].lower()
                horizontal = orientasi == "h"
                if not (0 <= baris < UKURAN and 0 <= kolom < UKURAN):
                    print("Koordinat di luar papan!")
                    continue
                if bisa_ditempatkan(papan, baris, kolom, ukuran, horizontal):
                    koord = tempatkan_kapal(papan, baris, kolom, ukuran, horizontal)
                    daftar.append({
                        "nama": nama,
                        "ukuran": ukuran,
                        "koordinat": koord,
                        "hancur": False,
                    })
                    break
                else:
                    print("Tidak bisa ditempatkan di sana!")
            except (ValueError, IndexError):
                print("Input tidak valid! Contoh: 3 5 h")
    return daftar

# ================== LOGIKA SERANGAN ==================
def serang(papan, baris, kolom):
    if not (0 <= baris < UKURAN and 0 <= kolom < UKURAN):
        return "invalid"
    sel = papan[baris][kolom]
    if sel in (SIMBOL_MISS, SIMBOL_HIT):
        return "invalid"
    if sel == SIMBOL_KAPAL:
        papan[baris][kolom] = SIMBOL_HIT
        return "hit"
    papan[baris][kolom] = SIMBOL_MISS
    return "miss"

def masih_ada_kapal(papan):
    for r in range(UKURAN):
        for c in range(UKURAN):
            if papan[r][c] == SIMBOL_KAPAL:
                return True
    return False

def cek_kapal_hancur(daftar_kapal, papan):
    """Return daftar nama kapal yang BARU hancur."""
    baru_hancur = []
    for kapal in daftar_kapal:
        if kapal["hancur"]:
            continue
        if all(papan[r][c] == SIMBOL_HIT for r, c in kapal["koordinat"]):
            kapal["hancur"] = True
            baru_hancur.append(kapal["nama"])
    return baru_hancur

# ================== AI SEDERHANA ==================

class Bot:
    def __init__(self, kesulitan="normal"):
        self.kesulitan = kesulitan
        self.belum_dicoba = [(r, c) for r in range(UKURAN) for c in range(UKURAN)]
        self.bidikan = []       # target prioritas
        self.hits_aktif = []    # hit pada kapal yang belum tenggelam

    # ---------- Pemilihan target ----------
    def pilih_target(self):
        # EASY: acak murni
        if self.kesulitan == "easy":
            return random.choice(self.belum_dicoba)

        # NORMAL & HARD: dahulukan bidikan
        if self.bidikan:
            return self.bidikan.pop(0)

        # HARD: pola catur saat mencari
        if self.kesulitan == "hard":
            kandidat = [c for c in self.belum_dicoba if (c[0] + c[1]) % 2 == 0]
            if not kandidat:
                kandidat = self.belum_dicoba
            return random.choice(kandidat)

        # NORMAL: acak biasa
        return random.choice(self.belum_dicoba)

    # ---------- Umpan balik hasil tembakan ----------
    def feedback(self, baris, kolom, hasil):
        if (baris, kolom) in self.belum_dicoba:
            self.belum_dicoba.remove((baris, kolom))

        if hasil != "hit":
            return

        # EASY tidak pernah belajar
        if self.kesulitan == "easy":
            return

        self.hits_aktif.append((baris, kolom))

        # HARD: kalau sudah tahu arah, lanjutkan sepanjang garis
        if self.kesulitan == "hard" and len(self.hits_aktif) >= 2:
            self._bidik_sepanjang_garis()
        else:
            # NORMAL & HARD (hit pertama): coba 4 tetangga
            for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                r, c = baris + dr, kolom + dc
                if (r, c) in self.belum_dicoba and (r, c) not in self.bidikan:
                    self.bidikan.append((r, c))

    # ---------- Strategi HARD: lacak garis ----------
    def _bidik_sepanjang_garis(self):
        (r1, c1), (r2, c2) = self.hits_aktif[0], self.hits_aktif[1]

        if r1 == r2:  # horizontal
            baris = r1
            koloms = sorted(c for r, c in self.hits_aktif if r == baris)
            kiri, kanan = min(koloms) - 1, max(koloms) + 1
            for k in (kiri, kanan):
                if 0 <= k < UKURAN and (baris, k) in self.belum_dicoba:
                    self.bidikan.insert(0, (baris, k))
        elif c1 == c2:  # vertikal
            kolom = c1
            bariss = sorted(r for r, c in self.hits_aktif if c == kolom)
            atas, bawah = min(bariss) - 1, max(bariss) + 1
            for b in (atas, bawah):
                if 0 <= b < UKURAN and (b, kolom) in self.belum_dicoba:
                    self.bidikan.insert(0, (b, kolom))

    # ---------- Reset saat kapal tenggelam ----------
    def kapal_tenggelam(self):
        """Panggil saat kapal pemain hancur: lupakan bidikan lama."""
        self.hits_aktif = []
        self.bidikan = []

# ================== GAMEPLAY ==================
def main():
    bersihkan_layar()
    print("=" * 40)
    print("     ⚓  BATTLE SHIP CLI  ⚓")
    print("=" * 40)
    print("Keterangan simbol:")
    print(f"  {warna(SIMBOL_KOSONG, *WARNA_LAUT)} = lautan")
    print(f"  {SIMBOL_KAPAL} = kapal")
    print(f"  {warna(SIMBOL_MISS, *WARNA_MISS)} = meleset")
    print(f"  {warna(SIMBOL_HIT, *WARNA_HIT)} = kena!")
    print()

    papan_pemain = buat_papan()
    papan_bot = buat_papan()

    while True:
        pilihan = input("Tempatkan kapal manual? (y/n) [Enter=random]: ").strip().lower()
        if pilihan == "":
            pilihan = "n"
        if pilihan in ("y", "n"):
            break
        print("Masukkan 'y', 'n', atau tekan Enter.")


    if pilihan == "y":
        daftar_kapal_pemain = tempatkan_kapal_manual(papan_pemain)
    else:
        daftar_kapal_pemain = tempatkan_kapal_random(papan_pemain)


    daftar_kapal_bot = tempatkan_kapal_random(papan_bot)

    # --- Pilih kesulitan ---
    print()
    print("Pilih tingkat kesulitan:")
    print("  1. easy   — bot menembak acak (pemula)")
    print("  2. normal — bot membidik setelah kena (standar)")
    print("  3. hard   — bot pakai pola & melacak arah kapal (sulit)")

    while True:
        pilih = input("Pilihan (1/2/3) [Enter=normal]: ").strip().lower()
        if pilih == "":
            kesulitan = "normal"
            break
        if pilih in ("1", "easy"):
            kesulitan = "easy"
            break
        if pilih in ("2", "normal"):
            kesulitan = "normal"
            break
        if pilih in ("3", "hard"):
            kesulitan = "hard"
            break
        print("❌ Pilihan tidak valid. Masukkan 1, 2, atau 3.")

    print(f"\nKesulitan dipilih: {kesulitan.upper()}")

    bot = Bot(kesulitan=kesulitan)
    giliran_pemain = True

    while True:
        bersihkan_layar()
        print("=" * 40)
        print("       STATUS PERTEMPURAN")
        print(f"       (Kesulitan: {kesulitan.upper()})")
        print("=" * 40)

        tampilkan_papan(papan_bot, daftar_kapal_bot,
                        sembunyikan_kapal=True, judul="PAPAN MUSUH")
        tampilkan_papan(papan_pemain, daftar_kapal_pemain,
                        judul="PAPANMU")

        if giliran_pemain:
            print("\n>>> GILIRANMU <<<")
            try:
                inp = input("Serang (baris kolom): ").split()
                baris, kolom = int(inp[0]), int(inp[1])
            except (ValueError, IndexError):
                print("Input tidak valid!")
                time.sleep(1)
                continue

            hasil = serang(papan_bot, baris, kolom)
            if hasil == "invalid":
                print("Koordinat tidak valid atau sudah diserang!")
                time.sleep(1)
                continue

            print("HASIL:", "KENA!" if hasil == "hit" else "MELESET")

            for nama in cek_kapal_hancur(daftar_kapal_bot, papan_bot):
                print(warna(f"💥 KAPAL {nama.upper()} HANCUR!", *WARNA_HIT))

            if not masih_ada_kapal(papan_bot):
                bersihkan_layar()
                tampilkan_papan(papan_bot, daftar_kapal_bot,
                                judul="PAPAN MUSUH (TERBUKA)")
                print("\n🎉 SELAMAT! Kamu menenggelamkan semua kapal musuh!")
                break
            time.sleep(0.8)
            giliran_pemain = False

        else:
            print("\n>>> GILIRAN MUSUH <<<")
            time.sleep(0.4)
            baris, kolom = bot.pilih_target()
            hasil = serang(papan_pemain, baris, kolom)
            bot.feedback(baris, kolom, hasil)
            print(f"Musuh menyerang ({baris}, {kolom}):", "KENA!" if hasil == "hit" else "MELESET")

            hancur = cek_kapal_hancur(daftar_kapal_pemain, papan_pemain)
            for nama in hancur:
                print(warna(f"💥 KAPAL {nama.upper()} HANCUR!", *WARNA_HIT))
            if not hancur:
                bot.kapal_tenggelam()   # reset strategi bot

            if not masih_ada_kapal(papan_pemain):
                bersihkan_layar()
                tampilkan_papan(papan_pemain, daftar_kapal_pemain,
                                judul="PAPANMU")
                print("\n💥 Kamu kalah! Semua kapalmu tenggelam.")
                break
            time.sleep(0.8)
            giliran_pemain = True

if __name__ == "__main__":
    main()