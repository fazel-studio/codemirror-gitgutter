# PLAN — `@fazelstudio/codemirror-gitgutter`

> Git-blame-style inline diff gutter untuk CodeMirror 6, meniru perilaku **Source Control Decorations** (dirty diff) milik VSCode.
> Dokumen ini adalah instruksi build untuk AI Agent. Ikuti urutan fase secara berurutan — jangan lompat fase sebelum acceptance criteria fase sebelumnya terpenuhi.

---

## 0. Referensi konsep (bukan source code, karena lisensi)

Perilaku target direplikasi dari arsitektur **VSCode SCM Dirty Diff**, yang secara konsep terdiri dari:

- `dirtydiffDecorator.ts` (workbench) — berisi:
  - `DirtyDiffModel` — menghitung diff antara isi file saat ini vs isi file di HEAD git, meng-cache hasil, dan mem-broadcast event saat diff berubah.
  - `DirtyDiffController` — menempelkan model ke satu editor instance, mendaftarkan gutter decoration, dan menangani klik gutter.
  - `DirtyDiffWidget` — **peek view**: widget yang membelah tampilan editor secara vertikal di posisi baris, menampilkan potongan kode versi original (HEAD) berdampingan dengan navigasi next/prev serta tombol stage/revert.
  - `dirtydiffDecorator.css` — styling garis gutter (warna kuning/oranye = modified, hijau = added, merah kecil segitiga = deleted) dengan transisi halus.
  - Menggunakan `MenuId.SCMChangeContext` — kontribusi menu/toolbar kontekstual untuk aksi Stage Change / Revert Change / Next Change / Previous Change yang muncul di toolbar widget.

Kita **tidak** menyalin kode ini (lisensi MIT VSCode tetap mengharuskan atribusi & tidak boleh sekadar copy-paste tanpa tujuan), kita **mereplikasi arsitektur & UX-nya** di atas primitif CodeMirror 6 murni.

### Alur kerja end-to-end ala VSCode (yang harus direplikasi)

1. Editor dibuka dengan file yang berada di dalam repo git.
2. Plugin mengambil **isi file versi HEAD** (baseline) — di VSCode ini didapat dari Git extension API; di lingkungan kita (web/CM6, tanpa akses filesystem git langsung) ini harus disediakan **dari luar** via callback/provider yang dipasang host app (misalnya hasil `git show HEAD:path/to/file` yang dieksekusi di backend/Node/Electron, lalu dikirim ke editor sebagai string).
3. Plugin menjalankan **line-based diff** antara baseline vs dokumen saat ini → menghasilkan daftar "changes" (`added` | `modified` | `deleted`), masing-masing punya rentang baris di dokumen baru dan rentang baris di baseline.
4. Setiap "change" dirender sebagai **marker di gutter** (bukan di kolom line-number, tapi kolom terpisah di sebelahnya) dengan warna berbeda per tipe:
   - Hijau solid = baris baru ditambahkan.
   - Biru/oranye solid = baris dimodifikasi.
   - Segitiga merah kecil di tepi atas/bawah baris = baris dihapus (karena garis yang dihapus tidak punya baris fisik untuk ditempeli, jadi ditandai di sambungan antar baris).
5. **Klik pada marker gutter** → membuka **peek view**: sebuah widget block yang disisipkan **di antara baris dokumen** (bukan modal/popup mengambang bebas), mendorong baris-baris di bawahnya turun (persis seperti "block widget" yang membelah editor). Isi peek view:
   - Panel kiri/atas: potongan kode versi baseline (read-only, dengan syntax highlight sama seperti editor utama).
   - Panel kanan/bawah atau inline: kode versi saat ini pada rentang yang sama.
   - Toolbar di widget: tombol **Stage Change**, **Revert Change**, **Previous Change**, **Next Change**, dan tombol close (×).
6. Navigasi **Next/Previous Change** memindahkan fokus + scroll ke marker berikutnya/sebelumnya, dan jika peek view sedang terbuka, isi peek view ikut berpindah ke change tersebut tanpa harus klik ulang gutter.
7. **Stage Change** → memanggil callback host app (`onStageHunk(hunk)`) yang bertanggung jawab menjalankan `git apply --cached` pada hunk tersebut. Plugin sendiri tidak menjalankan git — ia hanya menyediakan data hunk yang presisi (line ranges + isi teks).
8. **Revert Change** → mengembalikan rentang baris di dokumen CM6 saat ini menjadi sama dengan versi baseline untuk hunk tersebut (ini murni transaksi CM6 lokal, tidak butuh git, karena baseline sudah ada di memori).
9. Semua ini harus tetap reaktif: setiap kali dokumen berubah (user mengetik), diff dihitung ulang (dengan debounce), gutter marker & peek view (jika terbuka) diperbarui.

---

## 1. Tujuan paket & batasan scope

**Nama paket:** `@fazelstudio/codemirror-gitgutter`
**Target:** CodeMirror 6 (`@codemirror/state`, `@codemirror/view`, `@codemirror/language` opsional untuk syntax highlight di peek view).

**Yang menjadi tanggung jawab plugin (in-scope):**
- Menghitung & menampilkan diff gutter markers (added/modified/deleted).
- Peek view widget ala VSCode (split view in-editor, bukan modal terpisah).
- Navigasi next/prev change.
- Revert hunk lokal (manipulasi teks di CM6 — ini murni operasi dokumen, tidak butuh git).
- Expose API/hooks agar host app bisa "stage" hunk (plugin memberi data, host app yang eksekusi git).
- Theming via CSS variables agar bisa dikustom user.

**Yang BUKAN tanggung jawab plugin (out-of-scope, harus disediakan host app):**
- Menjalankan perintah git apapun (`git show`, `git diff`, `git apply`, `git add`) — plugin tidak boleh mengasumsikan Node.js `child_process` tersedia, karena CM6 dipakai di browser murni juga.
- Watching filesystem / auto-refresh saat file di HEAD berubah di luar editor.

Host app menyediakan baseline content via sebuah **Facet**, plugin murni fungsi dari `(baseline, currentDoc) → gutter + peek view`.

---

## 2. Dependensi paket resmi CodeMirror yang dipakai

```json
{
  "peerDependencies": {
    "@codemirror/state": "^6.0.0",
    "@codemirror/view": "^6.0.0"
  },
  "dependencies": {
    "@codemirror/language": "^6.0.0"
  }
}
```

Rasional pemilihan API inti (bukan tebakan — ini primitif yang memang didesain untuk use-case ini):

| Kebutuhan | API CM6 yang dipakai |
|---|---|
| Menyimpan hasil diff sebagai bagian dari state editor, ikut ter-mapping saat dokumen berubah | `StateField` (dari `@codemirror/state`) |
| Trigger perhitungan ulang diff setiap transaksi dokumen berubah | `StateField.update` + cek `tr.docChanged` |
| Marker warna di gutter kolom terpisah (bukan line-number) | `gutter()` + `GutterMarker` (dari `@codemirror/view`) |
| Highlight background baris (opsional, untuk baris modified) | `Decoration.line()` |
| Peek view yang "membelah" editor & mendorong baris di bawahnya | `Decoration.widget()` dengan `block: true`, di-attach sebagai `WidgetType` custom |
| Toolbar tombol di dalam peek view | DOM manual di dalam `WidgetType.toDOM()` — CM6 tidak punya toolbar bawaan |
| Command next/prev change + keybinding | `keymap.of([...])` (dari `@codemirror/view`) + `EditorView.commands` pattern (`(view: EditorView) => boolean`) |
| Baseline content sebagai konfigurasi yang bisa di-reconfigure host app | `Facet.define()` |
| Debounce perhitungan diff saat mengetik cepat | `ViewPlugin` dengan `requestAnimationFrame`/`setTimeout` internal, bukan bagian dari `StateField` murni (karena StateField harus pure/sync) |
| Syntax highlighting di dalam peek view (opsional tapi disarankan agar "ala VSCode") | Buat instance `EditorView` read-only kecil di dalam widget, reuse `language` facet dari editor utama |

---

## 3. Algoritma diff yang dipakai

**Jangan implementasi ulang algoritma diff dari nol.** Gunakan pustaka diff line-based yang sudah stabil:

- Rekomendasi: `diff` (npm package `diff`, fungsi `diffLines`) — ringan, battle-tested, hasilnya berupa array `{ value, added?, removed? }` yang mudah dikonversi ke hunk.
- Alternatif: ekstrak logika Myers diff sendiri jika ingin zero-dependency, tapi ini menambah risiko bug — untuk v1 pakai `diff` npm package dulu, optimasi belakangan jika perlu.

Konversi hasil `diffLines` menjadi struktur `Hunk`:

```ts
type ChangeType = 'added' | 'modified' | 'deleted';

interface Hunk {
  type: ChangeType;
  fromA: number; // baris awal di baseline (1-based), inklusif
  toA: number;   // baris akhir di baseline
  fromB: number; // baris awal di dokumen saat ini (1-based)
  toB: number;   // baris akhir di dokumen saat ini
  baselineText: string; // isi baris baseline untuk hunk ini (untuk revert & peek view)
}
```

Aturan klasifikasi (ikuti persis logika VSCode):
- Jika hanya ada insersi (tidak ada baris baseline yang hilang di posisi itu) → `added`.
- Jika hanya ada delesi (tidak ada baris baru di posisi itu) → `deleted`.
- Jika insersi & delesi terjadi berdekatan di posisi yang sama (baris lama diganti baris baru) → `modified`.

---

## 4. Struktur modul (arsitektur file)

```
packages/codemirror-gitgutter/
├── src/
│   ├── index.ts                 # entry point, export gitGutter() sebagai fungsi utama
│   ├── facets.ts                 # Facet baseline content, Facet konfigurasi (colors, callbacks)
│   ├── diff/
│   │   ├── computeHunks.ts       # wrapper di atas `diff` npm package → Hunk[]
│   │   └── types.ts              # ChangeType, Hunk
│   ├── state/
│   │   └── hunksField.ts         # StateField<Hunk[]> + StateEffect untuk update hunks
│   ├── gutter/
│   │   ├── gutterMarkers.ts      # GutterMarker subclasses per ChangeType
│   │   └── gutterExtension.ts    # gutter() config, klik handler
│   ├── decorations/
│   │   └── lineDecorations.ts    # Decoration.line() untuk background modified/added (opsional)
│   ├── peekView/
│   │   ├── PeekWidget.ts         # WidgetType custom — block widget peek view
│   │   ├── renderToolbar.ts      # DOM builder toolbar (stage/revert/next/prev/close)
│   │   └── renderBaselinePane.ts # DOM builder panel kode baseline (pakai mini EditorView read-only)
│   ├── commands/
│   │   ├── navigation.ts         # goToNextChange, goToPreviousChange
│   │   ├── revert.ts             # revertHunk command
│   │   └── stage.ts              # stageHunk command (delegasi ke callback host app)
│   ├── theme/
│   │   └── baseTheme.ts          # EditorView.baseTheme() dengan CSS vars, warna default mirip VSCode
│   └── viewPlugin.ts             # ViewPlugin yang mengoordinasikan debounce diff & sinkronisasi field
├── test/
│   └── ...                       # unit test computeHunks, integration test gutter click → peek view
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE (MIT)
```

---

## 5. Fase implementasi (urutan wajib)

### Fase 1 — Setup proyek & scaffolding
- Inisialisasi paket npm scoped `@fazelstudio/codemirror-gitgutter`, TypeScript, bundler (tsup atau rollup — pilih **tsup** untuk kesederhanaan ESM+CJS dual build).
- Setup `peerDependencies` seperti di atas, `devDependencies` termasuk `@codemirror/state`, `@codemirror/view`, `codemirror` (untuk testing lokal), `diff`.
- Setup basic playground `examples/basic/index.html` pakai Vite, untuk uji manual selama development (karena ini butuh visual verification terus-menerus).

**Acceptance:** `npm run build` sukses menghasilkan `dist/index.js` (ESM) + `dist/index.cjs`. Playground bisa render editor CM6 kosong.

---

### Fase 2 — Diff engine murni (tanpa UI)
- Implementasi `computeHunks(baseline: string, current: string): Hunk[]` menggunakan `diffLines` dari package `diff`.
- Tulis unit test dengan kasus: pure addition, pure deletion, pure modification, mixed (kombinasi ketiganya di satu file), file identik (hasil kosong), file kosong→terisi, file terisi→kosong.

**Acceptance:** Semua unit test hijau. Fungsi ini pure (tidak menyentuh DOM/CM6 state sama sekali) — supaya mudah ditest & di-reuse.

---

### Fase 3 — State management (Facet + StateField)
- `baselineContentFacet`: `Facet<string, string>` — host app set isi file HEAD lewat extension array.
- `gitGutterConfigFacet`: `Facet<GitGutterConfig, Required<GitGutterConfig>>` — berisi opsi warna, `onStageHunk` callback, `debounceMs` (default 150ms), `gutterWidth`.
- `hunksField`: `StateField<Hunk[]>`
  - `create`: hitung hunks awal dari `baselineContentFacet` vs `state.doc`.
  - `update`: jika `tr.docChanged` **dan** tidak ada flag "sedang debounce" (lihat Fase 7 soal ViewPlugin+debounce), hitung ulang. Untuk v1 boleh sinkron dulu (recompute tiap keystroke) lalu optimasi debounce di ViewPlugin setelah fungsional.
- Definisikan `StateEffect<Hunk[]>` bernama `setHunksEffect` supaya ViewPlugin bisa mendorong hasil diff yang dihitung di luar (misal di worker) kembali ke StateField tanpa perlu StateField menghitung ulang sendiri.

**Acceptance:** Mengetik di editor (via test harness `EditorState.update`) menghasilkan `state.field(hunksField)` yang benar dan cocok dengan hasil `computeHunks` langsung.

---

### Fase 4 — Gutter markers ala VSCode
- Buat 3 subclass `GutterMarker`: `AddedMarker`, `ModifiedMarker`, `DeletedMarker` — masing-masing `toDOM()` mengembalikan `<div>` dengan class CSS berbeda.
- Untuk `deleted`, karena tidak ada baris fisik untuk marker, tempelkan marker pada baris **setelah** titik delesi (atau baris terakhir dokumen jika delesi di ujung), dengan class modifier `.cm-gitgutter-deleted-above` yang secara visual digambar sebagai segitiga kecil di tepi atas baris via CSS (`border-top` trick), persis strategi VSCode.
- Buat `gutter({ class: 'cm-gitgutter', markers: ..., initialSpacer: ... })` — gunakan `RangeSet` yang dibangun dari `hunksField` tiap kali field berubah (via `lineMarker` callback pada config gutter, membaca `view.state.field(hunksField)`).
- Klik handler: gunakan opsi `domEventHandlers: { mousedown }` pada `gutter()` config → panggil command `togglePeekView(lineNumber)`.

**Acceptance:** Playground manual test — edit teks, garis warna di gutter muncul/hilang sesuai jenis perubahan, warna sesuai palet VSCode (`#587c0c` added, `#0c7d9d` modified, merah untuk deleted marker).

---

### Fase 5 — Peek View widget (bagian paling kompleks — ikuti sub-langkah persis)

Ini mereplikasi `DirtyDiffWidget` VSCode. Sub-langkah wajib:

1. **Buat class `PeekWidget extends WidgetType`**
   - Constructor menerima `hunk: Hunk`, `languageSupport` (diambil dari state editor utama agar syntax highlight konsisten), dan referensi callback (stage/revert/navigasi/close).
   - `toDOM()`:
     - Buat container `<div class="cm-gitgutter-peek">`.
     - Buat toolbar di bagian atas: 4 tombol ikon (Previous ⬆, Next ⬇, Stage ✓, Revert ↺) + tombol close (×) di kanan — style flat, mirip VSCode command bar, pakai SVG icon inline (jangan bergantung icon font eksternal supaya paket zero-dependency untuk assets).
     - Buat panel bawah toolbar berisi **mini read-only `EditorView`** kedua, diisi `hunk.baselineText`, dengan extension: `EditorState.readOnly.of(true)`, `EditorView.editable.of(false)`, plus `languageSupport` yang sama dengan editor utama (agar syntax highlight seragam) — **ini** yang membuatnya terasa "ala VSCode" dibanding solusi lain yang cuma tampilkan teks polos.
     - Beri label kecil di pojok panel: "Original" (mirip VSCode) untuk konteks.
   - `eq(other)`: bandingkan berdasarkan `hunk` identity (posisi + isi) supaya CM6 tidak me-remount widget tiap kali tidak perlu (penting untuk performa & agar mini-EditorView di dalamnya tidak dibuat ulang terus).
   - `estimatedHeight`: kembalikan estimasi tinggi berdasarkan jumlah baris `baselineText` × line-height, supaya CM6 bisa reserve ruang scroll dengan benar sebelum widget benar-benar diukur (mengurangi layout jump).
   - `destroy(dom)`: pastikan mini `EditorView` di dalam widget dipanggil `.destroy()` untuk mencegah memory leak.

2. **State untuk widget yang sedang terbuka**
   - Tambah `StateField<Hunk | null>` bernama `activePeekField`, di-toggle via `StateEffect` (`openPeekEffect`, `closePeekEffect`).
   - `Decoration.widget({ widget: new PeekWidget(...), block: true, side: 1 })` di-attach di posisi baris terakhir hunk +1, sebagai bagian dari `StateField<DecorationSet>` terpisah bernama `peekDecorationField` yang membaca `activePeekField`.
   - **Kunci UX "membelah editor"**: karena `block: true` pada `Decoration.widget`, CM6 otomatis mendorong baris-baris berikutnya ke bawah — ini native behavior CM6, tidak perlu hack tambahan.

3. **Toolbar action wiring**
   - Tombol Next/Previous memanggil command yang mencari hunk berikutnya/sebelumnya dari `hunksField`, lalu dispatch `closePeekEffect` + `openPeekEffect(hunkBaru)` + `EditorView.scrollIntoView` ke posisi hunk baru — semuanya dalam satu transaksi agar tidak flicker.
   - Tombol Stage memanggil `config.onStageHunk(hunk)` (callback host app, wajib ada di config, kalau tidak diisi tombol di-disable dengan tooltip "Staging not configured").
   - Tombol Revert memanggil command lokal `revertHunk(hunk)`:
     - Buat `TransactionSpec` yang mengganti range `[fromB, toB]` di dokumen saat ini dengan `hunk.baselineText`.
     - Dispatch transaksi, lalu tutup peek view (dispatch `closePeekEffect`).
   - Tombol Close dispatch `closePeekEffect`.

**Acceptance:** Klik marker gutter → editor "terbelah", muncul potongan kode baseline dengan syntax highlight + toolbar 5 tombol. Klik Next/Prev berpindah antar hunk tanpa perlu klik gutter lagi. Klik Revert mengubah dokumen sesuai baseline & menutup peek view. Resize/scroll tetap mulus (tidak ada jump layout signifikan).

---

### Fase 6 — Commands & Keybindings publik
- Export command murni (bertipe `(view: EditorView) => boolean`, mengikuti konvensi `@codemirror/commands`):
  - `gitGutterGoToNextChange`
  - `gitGutterGoToPreviousChange`
  - `gitGutterToggleWidget` (buka/tutup peek view untuk hunk di posisi cursor saat ini)
  - `gitGutterRevertChange`
  - `gitGutterStageChange`
- Sediakan `gitGutterKeymap: readonly KeyBinding[]` opsional yang bisa di-import terpisah (jangan dipaksa aktif otomatis — biarkan host app pilih apakah mau pasang keybinding atau tidak), dengan default mirip VSCode: `Alt-F3` next change, `Shift-Alt-F3` previous, `Ctrl-Shift-Backspace` (Cmd di Mac) revert.

**Acceptance:** Semua command bisa dipanggil manual dari `EditorView.dispatch` test harness dan menghasilkan state yang benar tanpa perlu klik mouse.

---

### Fase 7 — Debounce & performa
- Bungkus perhitungan diff dalam `ViewPlugin` (bukan langsung di `StateField.update`) untuk dokumen besar:
  - `ViewPlugin` mendengarkan `update.docChanged`, set timer `debounceMs` (dari config facet, default 150ms), lalu setelah timer selesai, hitung `computeHunks` dan `view.dispatch({ effects: setHunksEffect.of(newHunks) })`.
  - `hunksField` sendiri **tidak** menghitung diff lagi di `update()` — ia hanya bereaksi terhadap `setHunksEffect`. Ini memisahkan "state murni" dari "side-effect komputasi berat", sesuai filosofi CM6.
- Untuk dokumen sangat besar (>5000 baris), pertimbangkan menjalankan `computeHunks` di **Web Worker** — sediakan opsi config `useWorker: boolean` (default `false` di v1, dokumentasikan sebagai "future work" jika belum sempat diimplementasi penuh).

**Acceptance:** Mengetik cepat di file besar (test dengan file ~3000 baris) tidak menyebabkan input lag terasa (diff dihitung setelah user berhenti mengetik, bukan tiap keystroke).

---

### Fase 8 — Theming
- `baseTheme.ts` pakai `EditorView.baseTheme()` dengan CSS custom properties agar bisa dioverride user:
  ```css
  .cm-gitgutter-added   { background: var(--cm-gitgutter-added-color, #587c0c); }
  .cm-gitgutter-modified { background: var(--cm-gitgutter-modified-color, #0c7d9d); }
  .cm-gitgutter-deleted  { border-top-color: var(--cm-gitgutter-deleted-color, #b5152b); }
  ```
- Sediakan juga preset `gitGutterDarkTheme` dan `gitGutterLightTheme` opsional yang mengatur warna peek view (background panel baseline, warna label "Original") agar cocok dipasang berdampingan dengan tema populer (`@uiw/codemirror-theme-*` dsb) tanpa bentrok.

**Acceptance:** Warna bisa diubah total hanya lewat CSS variable tanpa perlu fork paket.

---

### Fase 9 — Public API & entry point akhir

`src/index.ts` harus mengekspor fungsi utama tunggal, mengikuti konvensi ekosistem CM6 (mirip pola `@replit/codemirror-minimap`'s `showMinimap`):

```ts
export function gitGutter(config: GitGutterConfig): Extension;

export interface GitGutterConfig {
  baseline: string;                       // isi file versi HEAD, WAJIB
  onStageHunk?: (hunk: Hunk) => void;      // opsional, jika tidak ada tombol Stage disabled
  colors?: Partial<{
    added: string; modified: string; deleted: string;
  }>;
  debounceMs?: number;                     // default 150
  gutterWidth?: string;                    // default '4px', mirip lebar garis VSCode
}

// commands (opsional dipakai user untuk custom keymap)
export {
  gitGutterGoToNextChange,
  gitGutterGoToPreviousChange,
  gitGutterToggleWidget,
  gitGutterRevertChange,
  gitGutterStageChange,
  gitGutterKeymap,
};

// types
export type { Hunk, ChangeType, GitGutterConfig };
```

Contoh pemakaian (harus persis semudah ini untuk end user, dan **ini** yang ditaruh sebagai contoh utama di README):

```ts
import { EditorView, basicSetup } from 'codemirror';
import { gitGutter } from '@fazelstudio/codemirror-gitgutter';

const view = new EditorView({
  doc: currentFileContent,
  extensions: [
    basicSetup,
    gitGutter({
      baseline: headFileContent, // didapat host app dari `git show HEAD:file`
      onStageHunk: (hunk) => myBackend.stageHunk(filePath, hunk),
    }),
  ],
  parent: document.querySelector('#editor'),
});
```

**Acceptance:** Contoh di atas benar-benar jalan copy-paste di playground tanpa modifikasi tambahan.

---

## 6. Non-functional requirements

- **Zero runtime dependency selain `diff`** — jangan tambah lodash/dsb, cukup pakai fitur JS/TS native.
- **Tree-shakeable**: build ESM dengan `sideEffects: false` di `package.json` kecuali file CSS/theme.
- **TypeScript strict mode** aktif, semua export publik punya JSDoc.
- **Tidak boleh menyalin kode VSCode secara verbatim** dari `dirtydiffDecorator.ts`/`.css` — hanya mereplikasi *arsitektur & perilaku*, penamaan class CSS dan struktur kode harus original.
- **Lisensi**: MIT, tambahkan `NOTICE` singkat di README yang menyebutkan bahwa UX peek-view terinspirasi dari VSCode Source Control decorations, sebagai bentuk atribusi yang baik (bukan kewajiban hukum karena tidak menyalin kode, tapi etis untuk proyek open source).

---

## 7. Definisi selesai (Definition of Done) untuk v1.0.0

- [ ] Semua 9 fase di atas lolos acceptance criteria masing-masing.
- [ ] README lengkap: instalasi, contoh dasar, API reference, cara integrasi git backend (Node.js `simple-git` contoh untuk `baseline` & `onStageHunk`).
- [ ] Playground live demo (bisa di-deploy ke GitHub Pages via Vite build) yang mensimulasikan baseline vs current tanpa perlu git asli (pakai 2 string hardcoded) — supaya siapapun bisa coba tanpa clone backend.
- [ ] Publish dry-run `npm publish --dry-run` sukses tanpa warning.
- [ ] CI: GitHub Actions workflow `test.yml` (lint + unit test) dan `publish.yml` (publish ke npm saat tag release).

---

## 8. Urutan eksekusi untuk AI Agent

Jalankan fase 1 → 9 secara linear. Setelah tiap fase selesai, jalankan build + test yang relevan, laporkan hasil acceptance criteria sebelum lanjut fase berikutnya. Jangan menggabungkan Fase 5 dengan fase lain — ini fase paling berisiko bug dan butuh verifikasi visual manual di playground sebelum lanjut.