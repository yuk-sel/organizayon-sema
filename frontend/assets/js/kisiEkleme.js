console.log("kisiEkleme.js çalıştı");

const API_BASE = window.location.origin + '/api';

/* =========================================================
   ELEMANLAR
   ========================================================= */
const yeniKisiEKleButon = document.getElementById("newPersonBtn");
const yeniKisiFormBolumu = document.getElementById("personFormSection");
const yeniKisiEklemeForm = document.getElementById("personForm");

const duzenleModal = document.getElementById("editModal");
const kisiGuncellemeForm = document.getElementById("editPersonForm");

const altKisiModal = document.getElementById("childPersonModal");
const altKisiEklemeForm = document.getElementById("childPersonForm");

const aramaButonu = document.getElementById("searchBtn");
const aramaInput = document.getElementById("searchInput");

const kisilerList = document.getElementById("kisiListesi");
const cizgiKatmani = document.getElementById("cizgiKatmani");

const sayfaSekmeleri = document.getElementById("sayfaSekmeleri");
const yeniSayfaButonu = document.getElementById("newPageBtn");
const adDegistirButonu = document.getElementById("renamePageBtn");
const sayfaSilButonu = document.getElementById("deletePageBtn");
const sayfaModal = document.getElementById("pageModal");
const sayfaForm = document.getElementById("pageForm");
const sayfaModalBaslik = document.getElementById("pageModalTitle");
const sayfaAdiInput = document.getElementById("pageName");

const pdfButonu = document.getElementById("pdfBtn");
const otoDuzenButonu = document.getElementById("autoLayoutBtn");

/* =========================================================
   AYARLAR VE DURUM
   ========================================================= */
const YATAY_ARALIK = 280;   // kutular arası yatay mesafe
const DIKEY_ARALIK = 290;   // seviyeler arası dikey mesafe
const BOSLUK = 40;          // alanın kenarından başlangıç boşluğu
const SAYFA_ANAHTARI = "orgSemaAktifSayfa";

// Fotoğrafı olmayan kişilerin baş harf dairesi için renkler (arka plan, yazı)
const AVATAR_RENKLERI = [
    { arka: "#dbeafe", yazi: "#1e40af" },
    { arka: "#dcfce7", yazi: "#166534" },
    { arka: "#fef3c7", yazi: "#92400e" },
    { arka: "#fce7f3", yazi: "#9d174d" },
    { arka: "#ede9fe", yazi: "#5b21b6" },
    { arka: "#ccfbf1", yazi: "#115e59" }
];

let sayfalar = [];          // sunucudaki tüm sayfalar
let aktifSayfaId = null;    // o an açık olan sayfa
let sayfaModalModu = "yeni"; // "yeni" ya da "ad"

let kutular = {};           // kisi_id -> kutu elemanı
let konumlar = {};          // kisi_id -> { x, y }
let guncelKisiler = [];     // aktif sayfanın kişileri

let suruklenen = null;      // o an sürüklenen kutu
let surukleOfsetX = 0;
let surukleOfsetY = 0;

/* =========================================================
   YARDIMCI FONKSİYONLAR
   ========================================================= */
async function istek(yol, method, govde) {
    const ayarlar = {
        method: method,
        headers: { "Content-Type": "application/json" }
    };
    if (govde !== undefined) {
        ayarlar.body = JSON.stringify(govde);
    }

    const res = await fetch(`${API_BASE}${yol}`, ayarlar);

    let veri = null;
    try {
        veri = await res.json();
    } catch (e) {
        // cevap JSON değilse boş geç
    }

    if (!res.ok) {
        const mesaj = veri && (veri.error || veri.message);
        throw new Error(mesaj || `Sunucu hatası (${res.status})`);
    }
    return veri;
}

function cocuklariBul(kisi, liste) {
    return liste.filter(function (k) {
        return k.parent_id != null && Number(k.parent_id) === Number(kisi.kisi_id);
    });
}

function modalAc(modal) {
    modal.style.display = "flex";
}

function modalKapat(modal) {
    modal.style.display = "none";
}

function yeniKisiFormunuKapat() {
    yeniKisiFormBolumu.style.display = "none";
    yeniKisiEklemeForm.reset();
    fotoYeni.sifirla();
}

function aktifSayfayiBul() {
    return sayfalar.find(function (s) {
        return Number(s.sayfa_id) === Number(aktifSayfaId);
    });
}

function ekraniTemizle() {
    kisilerList.innerHTML = "";
    cizgiKatmani.innerHTML = "";
    kutular = {};
    konumlar = {};
    guncelKisiler = [];
}

/* =========================================================
   FOTOĞRAF VE BAŞ HARFLER
   ========================================================= */

// "mine bal" -> "MB", "Ayşe Nur Yılmaz" -> "AY", "Mine" -> "M"
function baslangicHarfleri(isim) {
    const parcalar = (isim || "").trim().split(/\s+/).filter(Boolean);
    if (parcalar.length === 0) return "";

    const ilk = Array.from(parcalar[0])[0];
    if (parcalar.length === 1) {
        return ilk.toLocaleUpperCase("tr");
    }
    const son = Array.from(parcalar[parcalar.length - 1])[0];
    return (ilk + son).toLocaleUpperCase("tr");
}

function avatarRengi(isim) {
    const metin = (isim || "").trim();
    let toplam = 0;
    for (let i = 0; i < metin.length; i++) {
        toplam = (toplam * 31 + metin.charCodeAt(i)) >>> 0;
    }
    return AVATAR_RENKLERI[toplam % AVATAR_RENKLERI.length];
}

// Daireyi doldurur: fotoğraf varsa fotoğraf, yoksa baş harfler
function avatarDoldur(eleman, foto, isim) {
    eleman.textContent = "";
    eleman.style.backgroundImage = "";
    eleman.style.backgroundColor = "";
    eleman.style.color = "";
    eleman.removeAttribute("role");
    eleman.removeAttribute("aria-label");

    if (foto) {
        eleman.style.backgroundImage = `url("${foto}")`;
        eleman.setAttribute("role", "img");
        eleman.setAttribute("aria-label", isim || "Fotoğraf");
    } else {
        const renk = avatarRengi(isim);
        eleman.style.backgroundColor = renk.arka;
        eleman.style.color = renk.yazi;
        eleman.textContent = baslangicHarfleri(isim) || "?";
    }
}

function avatarOlustur(kisi) {
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatarDoldur(avatar, kisi.foto, kisi.isim);
    return avatar;
}

// Seçilen resmi kare şeklinde kırpıp küçültür (veritabanı ve PDF için hafif olsun)
function fotografiKucult(dosya) {
    const HEDEF = 256;

    return new Promise(function (coz, reddet) {
        if (!dosya.type || !dosya.type.startsWith("image/")) {
            reddet(new Error("Lütfen bir resim dosyası seç."));
            return;
        }

        const okuyucu = new FileReader();
        okuyucu.onerror = function () {
            reddet(new Error("Dosya okunamadı."));
        };
        okuyucu.onload = function () {
            const resim = new Image();
            resim.onerror = function () {
                reddet(new Error("Bu resim açılamadı. JPG ya da PNG dene."));
            };
            resim.onload = function () {
                const kenar = Math.min(resim.width, resim.height);
                const kaynakX = (resim.width - kenar) / 2;
                const kaynakY = (resim.height - kenar) / 2;

                const tuval = document.createElement("canvas");
                tuval.width = HEDEF;
                tuval.height = HEDEF;
                const ctx = tuval.getContext("2d");
                ctx.fillStyle = "#ffffff"; // şeffaf PNG'lerde zemin beyaz olsun
                ctx.fillRect(0, 0, HEDEF, HEDEF);
                ctx.drawImage(resim, kaynakX, kaynakY, kenar, kenar, 0, 0, HEDEF, HEDEF);

                let kalite = 0.85;
                let veri = tuval.toDataURL("image/jpeg", kalite);
                while (veri.length > 120000 && kalite > 0.4) {
                    kalite -= 0.1;
                    veri = tuval.toDataURL("image/jpeg", kalite);
                }
                coz(veri);
            };
            resim.src = okuyucu.result;
        };
        okuyucu.readAsDataURL(dosya);
    });
}

// Bir formdaki fotoğraf alanını (seç, önizle, kaldır) çalıştırır.
// onek: "input" (yeni kişi), "edit" (düzenle), "child" (alt kişi)
function fotoAlaniniBagla(onek) {
    const dosyaInput = document.getElementById(onek + "Photo");
    const onizleme = document.getElementById(onek + "PhotoPreview");
    const kaldirButonu = document.getElementById(onek + "PhotoRemove");
    const isimInput = document.getElementById(onek + "Name");

    const durum = { foto: null, degisti: false };

    function yenile() {
        avatarDoldur(onizleme, durum.foto, isimInput.value);
        kaldirButonu.style.display = durum.foto ? "inline-block" : "none";
    }

    dosyaInput.addEventListener("change", async function () {
        const dosya = dosyaInput.files[0];
        if (!dosya) return;

        try {
            durum.foto = await fotografiKucult(dosya);
            durum.degisti = true;
            yenile();
        } catch (err) {
            alert(err.message);
        }
        dosyaInput.value = ""; // aynı dosya tekrar seçilebilsin
    });

    kaldirButonu.addEventListener("click", function () {
        durum.foto = null;
        durum.degisti = true;
        yenile();
    });

    // İsim yazıldıkça baş harfler canlı güncellensin
    isimInput.addEventListener("input", yenile);

    yenile();

    return {
        // Mevcut fotoğrafı göster (düzenleme için)
        ayarla: function (foto) {
            durum.foto = foto || null;
            durum.degisti = false;
            yenile();
        },
        sifirla: function () {
            durum.foto = null;
            durum.degisti = false;
            yenile();
        },
        getir: function () {
            return { foto: durum.foto, degisti: durum.degisti };
        }
    };
}

const fotoYeni = fotoAlaniniBagla("input");
const fotoDuzenle = fotoAlaniniBagla("edit");
const fotoAlt = fotoAlaniniBagla("child");

/* =========================================================
   KONUM HESAPLAMA (konumlar veritabanında x, y olarak tutulur)
   ========================================================= */

// Hiç kayıtlı konum yokken ağaç düzenini otomatik hesaplar.
// Yaprak kişiler yan yana dizilir, üst kişi çocuklarının ortasında durur.
function otomatikKonumlariHesapla(kisiler) {
    const sonuc = {};
    let sayac = 0;
    const idler = new Set(kisiler.map(function (k) { return Number(k.kisi_id); }));

    function yerlestir(kisi, derinlik) {
        const cocuklar = cocuklariBul(kisi, kisiler);
        let x;

        if (cocuklar.length === 0) {
            x = BOSLUK + sayac * YATAY_ARALIK;
            sayac++;
        } else {
            cocuklar.forEach(function (c) {
                yerlestir(c, derinlik + 1);
            });
            const ilk = sonuc[cocuklar[0].kisi_id].x;
            const son = sonuc[cocuklar[cocuklar.length - 1].kisi_id].x;
            x = (ilk + son) / 2;
        }

        sonuc[kisi.kisi_id] = { x: x, y: BOSLUK + derinlik * DIKEY_ARALIK };
    }

    const kokler = kisiler.filter(function (k) {
        return k.parent_id == null || !idler.has(Number(k.parent_id));
    });
    kokler.forEach(function (k) {
        yerlestir(k, 0);
    });

    return sonuc;
}

// Kayıtlı konum varsa onu kullanır. Konumu olmayan (yeni) kişiyi üst kişisinin altına koyar.
function konumlariBelirle(kisiler) {
    const kayitliVar = kisiler.some(function (k) {
        return k.x != null && k.y != null;
    });
    if (!kayitliVar) {
        return otomatikKonumlariHesapla(kisiler);
    }

    const sonuc = {};
    kisiler.forEach(function (k) {
        if (k.x != null && k.y != null) {
            sonuc[k.kisi_id] = { x: Number(k.x), y: Number(k.y) };
        }
    });

    function konumBul(kisi) {
        const id = kisi.kisi_id;
        if (sonuc[id]) {
            return sonuc[id];
        }

        const ust = kisi.parent_id != null
            ? kisiler.find(function (k) { return Number(k.kisi_id) === Number(kisi.parent_id); })
            : null;

        if (ust) {
            const ustKonum = konumBul(ust);
            const yerlesikKardesler = cocuklariBul(ust, kisiler).filter(function (k) {
                return k.kisi_id !== id && sonuc[k.kisi_id];
            });

            let x = ustKonum.x;
            if (yerlesikKardesler.length > 0) {
                const xler = yerlesikKardesler.map(function (k) { return sonuc[k.kisi_id].x; });
                x = Math.max.apply(null, xler) + YATAY_ARALIK;
            }
            sonuc[id] = { x: x, y: ustKonum.y + DIKEY_ARALIK };
        } else {
            // Yeni kök kişi: en sağdaki kutunun sağına
            const xler = Object.keys(sonuc).map(function (key) { return sonuc[key].x; });
            const x = xler.length > 0 ? Math.max.apply(null, xler) + YATAY_ARALIK : BOSLUK;
            sonuc[id] = { x: x, y: BOSLUK };
        }

        return sonuc[id];
    }

    kisiler.forEach(function (k) {
        konumBul(k);
    });

    return sonuc;
}

// Verilen kişilerin güncel konumunu sunucuya yazar (tek istek).
async function konumlariSunucuyaKaydet(kisiIdleri) {
    const govde = kisiIdleri
        .filter(function (id) { return konumlar[id]; })
        .map(function (id) {
            return { kisi_id: Number(id), x: konumlar[id].x, y: konumlar[id].y };
        });

    if (govde.length === 0) return;

    try {
        await istek("/kisi/konumlariKaydet", "PATCH", govde);
    } catch (err) {
        console.warn("Konumlar kaydedilemedi:", err.message);
    }
}

/* =========================================================
   ÇİZGİLER (SVG)
   ========================================================= */

// Kutunun kenarlarını ve orta noktalarını verir
function kutuOlcusu(kutu) {
    const sol = kutu.offsetLeft;
    const ust = kutu.offsetTop;
    const sag = sol + kutu.offsetWidth;
    const alt = ust + kutu.offsetHeight;
    return {
        sol: sol,
        ust: ust,
        sag: sag,
        alt: alt,
        ortaX: Math.round((sol + sag) / 2),
        ortaY: Math.round((ust + alt) / 2)
    };
}

// Tüm üst-alt bağlantıları dik (köşeli) çizgiler olarak hesaplar.
// Her yol, noktaların listesidir: [[x, y], [x, y], ...]
// Aynı üst kişinin çocukları ortak bir yatay çizgiyi paylaşır
// (organizasyon şemasındaki gibi: aşağı in, yatay git, çocuğa in).
function cizgiYollariniHesapla() {
    const yollar = [];
    const MIN_ARALIK = 24; // dikey bağlantı için gereken en az boşluk

    guncelKisiler.forEach(function (ust) {
        const ustKutu = kutular[ust.kisi_id];
        if (!ustKutu) return;

        const cocuklar = cocuklariBul(ust, guncelKisiler).filter(function (c) {
            return kutular[c.kisi_id];
        });
        if (cocuklar.length === 0) return;

        const u = kutuOlcusu(ustKutu);
        const olculer = cocuklar.map(function (c) {
            return kutuOlcusu(kutular[c.kisi_id]);
        });

        const asagidakiler = olculer.filter(function (o) { return o.ust >= u.alt + MIN_ARALIK; });
        const yukaridakiler = olculer.filter(function (o) { return o.alt <= u.ust - MIN_ARALIK; });

        // Ortak yatay çizginin yüksekliği (en yakın çocukla üst kişinin ortası)
        let altYatayY = null;
        if (asagidakiler.length > 0) {
            const enYakin = Math.min.apply(null, asagidakiler.map(function (o) { return o.ust; }));
            altYatayY = Math.round(u.alt + (enYakin - u.alt) / 2);
        }
        let ustYatayY = null;
        if (yukaridakiler.length > 0) {
            const enYakin = Math.max.apply(null, yukaridakiler.map(function (o) { return o.alt; }));
            ustYatayY = Math.round(u.ust - (u.ust - enYakin) / 2);
        }

        olculer.forEach(function (o) {
            if (o.ust >= u.alt + MIN_ARALIK) {
                // Çocuk aşağıda: üst kişinin altından çık, yatay git, çocuğun üstüne in
                yollar.push([
                    [u.ortaX, u.alt], [u.ortaX, altYatayY],
                    [o.ortaX, altYatayY], [o.ortaX, o.ust]
                ]);
            } else if (o.alt <= u.ust - MIN_ARALIK) {
                // Çocuk yukarıda: üst kişinin üstünden çık
                yollar.push([
                    [u.ortaX, u.ust], [u.ortaX, ustYatayY],
                    [o.ortaX, ustYatayY], [o.ortaX, o.alt]
                ]);
            } else if (o.sol >= u.sag) {
                // Çocuk sağda ve aynı hizada: yandan bağlan
                const ortaX = Math.round((u.sag + o.sol) / 2);
                yollar.push([
                    [u.sag, u.ortaY], [ortaX, u.ortaY],
                    [ortaX, o.ortaY], [o.sol, o.ortaY]
                ]);
            } else if (o.sag <= u.sol) {
                // Çocuk solda ve aynı hizada
                const ortaX = Math.round((o.sag + u.sol) / 2);
                yollar.push([
                    [u.sol, u.ortaY], [ortaX, u.ortaY],
                    [ortaX, o.ortaY], [o.sag, o.ortaY]
                ]);
            } else {
                // Kutular üst üste binmiş: merkezden merkeze (kutuların altında kalır)
                yollar.push([[u.ortaX, u.ortaY], [o.ortaX, o.ortaY]]);
            }
        });
    });

    return yollar;
}

function cizgileriCiz() {
    cizgiKatmani.innerHTML = "";

    cizgiYollariniHesapla().forEach(function (noktalar) {
        const d = noktalar
            .map(function (p, i) {
                return (i === 0 ? "M " : "L ") + p[0] + " " + p[1];
            })
            .join(" ");

        const yol = document.createElementNS("http://www.w3.org/2000/svg", "path");
        yol.setAttribute("d", d);
        cizgiKatmani.appendChild(yol);
    });
}

/* =========================================================
   SÜRÜKLEME
   ========================================================= */
function surukleyiBagla(kutu, kisi) {
    kutu.addEventListener("pointerdown", function (e) {
        if (e.button !== 0) return;
        if (e.target.closest("button")) return; // butonlar sürüklemeyi başlatmasın

        const alan = kisilerList.getBoundingClientRect();
        suruklenen = kutu;
        surukleOfsetX = e.clientX - alan.left - kutu.offsetLeft;
        surukleOfsetY = e.clientY - alan.top - kutu.offsetTop;

        kutu.setPointerCapture(e.pointerId);
        kutu.classList.add("dragging");
    });

    kutu.addEventListener("pointermove", function (e) {
        if (suruklenen !== kutu) return;

        const alan = kisilerList.getBoundingClientRect();
        let x = e.clientX - alan.left - surukleOfsetX;
        let y = e.clientY - alan.top - surukleOfsetY;

        x = Math.max(0, Math.min(x, kisilerList.clientWidth - kutu.offsetWidth));
        y = Math.max(0, Math.min(y, kisilerList.clientHeight - kutu.offsetHeight));

        kutu.style.left = x + "px";
        kutu.style.top = y + "px";
        konumlar[kisi.kisi_id] = { x: x, y: y };

        cizgileriCiz();
    });

    function surukleBitir(e) {
        if (suruklenen !== kutu) return;

        suruklenen = null;
        kutu.classList.remove("dragging");
        if (kutu.hasPointerCapture(e.pointerId)) {
            kutu.releasePointerCapture(e.pointerId);
        }

        // Yeni konumu hem hafızada hem sunucuda güncelle
        if (konumlar[kisi.kisi_id]) {
            kisi.x = konumlar[kisi.kisi_id].x;
            kisi.y = konumlar[kisi.kisi_id].y;
        }
        konumlariSunucuyaKaydet([kisi.kisi_id]);
    }

    kutu.addEventListener("pointerup", surukleBitir);
    kutu.addEventListener("pointercancel", surukleBitir);
}

/* =========================================================
   KİŞİ KUTUSU
   ========================================================= */
function butonOlustur(yazi, sinif) {
    const buton = document.createElement("button");
    buton.type = "button";
    buton.className = sinif;
    buton.textContent = yazi;
    return buton;
}

function duzenleModaliniAc(kisi) {
    document.getElementById("editPersonId").value = kisi.kisi_id;
    document.getElementById("editName").value = kisi.isim;
    document.getElementById("editEmail").value = kisi.email || "";
    document.getElementById("editTitle").value = kisi.unvan;
    fotoDuzenle.ayarla(kisi.foto);
    modalAc(duzenleModal);
}

function altKisiModaliniAc(kisi) {
    altKisiEklemeForm.reset();
    fotoAlt.sifirla();
    document.getElementById("parentPersonId").value = kisi.kisi_id;
    modalAc(altKisiModal);
}

async function kisiyiSil(kisi) {
    const altiVar = cocuklariBul(kisi, guncelKisiler).length > 0;
    const mesaj = altiVar
        ? `${kisi.isim} silinsin mi? Altındaki tüm kişiler de silinecek.`
        : `${kisi.isim} silinsin mi?`;

    if (!confirm(mesaj)) return;

    try {
        await istek(`/kisi/kisiSil/${kisi.kisi_id}`, "DELETE");
    } catch (err) {
        alert("Silinemedi: " + err.message);
        return;
    }
    await loadKisiler();
}

function kisiKutusuOlustur(kisi) {
    const kutu = document.createElement("div");
    kutu.classList.add("kisi-item");
    kutu.dataset.id = kisi.kisi_id;

    const avatar = avatarOlustur(kisi);
    avatar.classList.add("avatar-buyuk");

    const kart = document.createElement("div");
    kart.className = "kisi-kart";

    const baslik = document.createElement("h3");
    baslik.textContent = kisi.isim;

    const unvan = document.createElement("p");
    unvan.className = "kisi-unvan";
    unvan.textContent = kisi.unvan;

    const email = document.createElement("p");
    email.className = "kisi-email";
    email.textContent = kisi.email;

    const butonlar = document.createElement("div");
    butonlar.className = "kisi-butonlar";

    const duzenleBtn = butonOlustur("Düzenle", "edit-btn");
    const silBtn = butonOlustur("Sil", "delete-btn");
    const altKisiBtn = butonOlustur("Alt Kişi Ekle", "add-child-btn");

    duzenleBtn.addEventListener("click", function () {
        duzenleModaliniAc(kisi);
    });
    silBtn.addEventListener("click", function () {
        kisiyiSil(kisi);
    });
    altKisiBtn.addEventListener("click", function () {
        altKisiModaliniAc(kisi);
    });

    butonlar.append(duzenleBtn, silBtn, altKisiBtn);
    kart.append(baslik, unvan);
    if (kisi.email) {
        kart.append(email);
    }
    kart.append(butonlar);
    kutu.append(avatar, kart);

    surukleyiBagla(kutu, kisi);

    return kutu;
}

/* =========================================================
   AKTİF SAYFANIN KİŞİLERİNİ YÜKLE VE ÇİZ
   ========================================================= */
async function loadKisiler() {
    if (aktifSayfaId == null) {
        ekraniTemizle();
        return;
    }

    const istenenSayfa = aktifSayfaId;
    let kisiler;
    try {
        const veri = await istek(`/kisi/tumKisiler/${istenenSayfa}`, "GET");
        kisiler = Array.isArray(veri) ? veri : [];
    } catch (err) {
        console.error("Kişiler yüklenemedi:", err);
        alert("Kişiler yüklenemedi: " + err.message);
        return;
    }

    // Yanıt beklenirken başka sekmeye geçildiyse bu sonucu at
    if (istenenSayfa !== aktifSayfaId) return;

    guncelKisiler = kisiler;
    kisilerList.innerHTML = "";
    kutular = {};
    konumlar = konumlariBelirle(guncelKisiler);

    guncelKisiler.forEach(function (kisi) {
        const konum = konumlar[kisi.kisi_id];
        const kutu = kisiKutusuOlustur(kisi);

        kutu.style.left = konum.x + "px";
        kutu.style.top = konum.y + "px";

        kisilerList.appendChild(kutu);
        kutular[kisi.kisi_id] = kutu;
    });

    cizgileriCiz();

    // Konumu henüz kaydedilmemiş (yeni) kişilerin konumunu sunucuya yaz
    const yeniler = [];
    guncelKisiler.forEach(function (kisi) {
        if (kisi.x == null || kisi.y == null) {
            kisi.x = konumlar[kisi.kisi_id].x;
            kisi.y = konumlar[kisi.kisi_id].y;
            yeniler.push(kisi.kisi_id);
        }
    });
    if (yeniler.length > 0) {
        konumlariSunucuyaKaydet(yeniler);
    }
}

/* =========================================================
   SAYFALAR VE SEKMELER
   ========================================================= */
function sekmeleriCiz() {
    sayfaSekmeleri.innerHTML = "";

    sayfalar.forEach(function (sayfa) {
        const sekme = document.createElement("button");
        sekme.type = "button";
        sekme.className = "tab";
        if (Number(sayfa.sayfa_id) === Number(aktifSayfaId)) {
            sekme.classList.add("active");
        }
        sekme.textContent = sayfa.ad;

        sekme.addEventListener("click", function () {
            sayfayiAc(sayfa.sayfa_id);
        });

        sayfaSekmeleri.appendChild(sekme);
    });

    const sayfaVar = sayfalar.length > 0;
    adDegistirButonu.disabled = !sayfaVar;
    sayfaSilButonu.disabled = !sayfaVar;
    otoDuzenButonu.disabled = !sayfaVar;
}

async function sayfayiAc(sayfaId) {
    aktifSayfaId = sayfaId;
    try {
        localStorage.setItem(SAYFA_ANAHTARI, String(sayfaId));
    } catch (e) {
        // localStorage kullanılamıyorsa devam et
    }
    aramaInput.value = "";
    sekmeleriCiz();
    await loadKisiler();
}

async function loadSayfalar() {
    try {
        const veri = await istek("/sayfa/tumSayfalar", "GET");
        sayfalar = Array.isArray(veri) ? veri : [];
    } catch (err) {
        console.error("Sayfalar yüklenemedi:", err);
        alert("Sayfalar yüklenemedi: " + err.message);
        return;
    }

    if (sayfalar.length === 0) {
        aktifSayfaId = null;
        ekraniTemizle();
        sekmeleriCiz();
        sayfaModaliniAc("yeni");
        return;
    }

    const aktifHalaVar = sayfalar.some(function (s) {
        return Number(s.sayfa_id) === Number(aktifSayfaId);
    });

    if (!aktifHalaVar) {
        let kayitli = null;
        try {
            kayitli = Number(localStorage.getItem(SAYFA_ANAHTARI));
        } catch (e) {
            kayitli = null;
        }
        const kayitliVar = sayfalar.some(function (s) {
            return Number(s.sayfa_id) === kayitli;
        });
        aktifSayfaId = kayitliVar ? kayitli : sayfalar[0].sayfa_id;
    }

    sekmeleriCiz();
    await loadKisiler();
}

function sayfaModaliniAc(mod) {
    sayfaModalModu = mod;

    if (mod === "ad") {
        const sayfa = aktifSayfayiBul();
        if (!sayfa) return;
        sayfaModalBaslik.textContent = "Sayfa Adını Değiştir";
        sayfaAdiInput.value = sayfa.ad;
    } else {
        sayfaModalBaslik.textContent = "Yeni Sayfa";
        sayfaAdiInput.value = "";
    }

    modalAc(sayfaModal);
    sayfaAdiInput.focus();
    sayfaAdiInput.select();
}

yeniSayfaButonu.addEventListener("click", function () {
    sayfaModaliniAc("yeni");
});

adDegistirButonu.addEventListener("click", function () {
    sayfaModaliniAc("ad");
});

document.getElementById("closePageModalBtn").addEventListener("click", function () {
    modalKapat(sayfaModal);
});
document.getElementById("cancelPageBtn").addEventListener("click", function () {
    modalKapat(sayfaModal);
});

sayfaForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const ad = sayfaAdiInput.value.trim();
    if (!ad) return;

    try {
        if (sayfaModalModu === "ad") {
            await istek(`/sayfa/sayfaGuncelle/${aktifSayfaId}`, "PATCH", { ad: ad });
        } else {
            const yeni = await istek("/sayfa/yeniSayfa", "POST", { ad: ad });
            aktifSayfaId = yeni.sayfa_id;
            try {
                localStorage.setItem(SAYFA_ANAHTARI, String(yeni.sayfa_id));
            } catch (e) {
                // önemli değil
            }
        }
    } catch (err) {
        alert("Sayfa kaydedilemedi: " + err.message);
        return;
    }

    modalKapat(sayfaModal);
    await loadSayfalar();
});

sayfaSilButonu.addEventListener("click", async function () {
    const sayfa = aktifSayfayiBul();
    if (!sayfa) return;

    const onay = confirm(
        `"${sayfa.ad}" sayfası ve içindeki tüm kişiler silinecek. Bu işlem geri alınamaz. Emin misin?`
    );
    if (!onay) return;

    try {
        await istek(`/sayfa/sayfaSil/${sayfa.sayfa_id}`, "DELETE");
    } catch (err) {
        alert("Sayfa silinemedi: " + err.message);
        return;
    }

    aktifSayfaId = null;
    await loadSayfalar();
});

/* =========================================================
   OTOMATİK DÜZENLE
   Tüm kutuları ağaç düzenine geri dizer.
   ========================================================= */
async function otomatikDuzenle() {
    if (guncelKisiler.length === 0) return;

    const onay = confirm(
        "Bu sayfadaki tüm kutular otomatik düzene dizilecek. Elle yerleştirdiğin konumlar kaybolur. Devam edilsin mi?"
    );
    if (!onay) return;

    konumlar = otomatikKonumlariHesapla(guncelKisiler);

    guncelKisiler.forEach(function (kisi) {
        const konum = konumlar[kisi.kisi_id];
        const kutu = kutular[kisi.kisi_id];
        if (!konum || !kutu) return;

        kutu.style.left = konum.x + "px";
        kutu.style.top = konum.y + "px";
        kisi.x = konum.x;
        kisi.y = konum.y;
    });

    cizgileriCiz();
    await konumlariSunucuyaKaydet(
        guncelKisiler.map(function (k) { return k.kisi_id; })
    );
}

otoDuzenButonu.addEventListener("click", otomatikDuzenle);

/* =========================================================
   ARAMA (aktif sayfadaki isimlere göre)
   ========================================================= */
function kisiAra() {
    Object.keys(kutular).forEach(function (id) {
        kutular[id].classList.remove("bulundu");
    });

    const aranan = aramaInput.value.trim().toLocaleLowerCase("tr");
    if (!aranan) return;

    const eslesenler = guncelKisiler.filter(function (k) {
        return (k.isim || "").toLocaleLowerCase("tr").includes(aranan);
    });

    if (eslesenler.length === 0) {
        alert("Kişi bulunamadı.");
        return;
    }

    eslesenler.forEach(function (k) {
        const kutu = kutular[k.kisi_id];
        if (kutu) kutu.classList.add("bulundu");
    });

    const ilkKutu = kutular[eslesenler[0].kisi_id];
    if (ilkKutu) {
        ilkKutu.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }
}

aramaButonu.addEventListener("click", function (event) {
    event.preventDefault();
    kisiAra();
});

aramaInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        kisiAra();
    }
});

/* =========================================================
   YENİ KİŞİ FORMU
   ========================================================= */
yeniKisiEKleButon.addEventListener("click", function () {
    if (aktifSayfaId == null) {
        alert("Önce bir sayfa oluştur.");
        sayfaModaliniAc("yeni");
        return;
    }
    yeniKisiFormBolumu.style.display = "block";
    document.getElementById("inputName").focus();
});

document.getElementById("closePersonFormBtn").addEventListener("click", yeniKisiFormunuKapat);
document.getElementById("cancelPersonFormBtn").addEventListener("click", yeniKisiFormunuKapat);

yeniKisiEklemeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const yeniKisi = {
        isim: document.getElementById("inputName").value,
        email: document.getElementById("inputEmail").value,
        unvan: document.getElementById("inputTitle").value,
        sayfa_id: aktifSayfaId,
        foto: fotoYeni.getir().foto
    };

    try {
        await istek("/kisi/yeniKisi", "POST", yeniKisi);
    } catch (err) {
        alert("Kişi eklenemedi: " + err.message);
        return;
    }

    yeniKisiFormunuKapat();
    await loadKisiler();
});

/* =========================================================
   DÜZENLEME MODALI
   ========================================================= */
document.getElementById("closeEditModalBtn").addEventListener("click", function () {
    modalKapat(duzenleModal);
});
document.getElementById("cancelEditBtn").addEventListener("click", function () {
    modalKapat(duzenleModal);
});

kisiGuncellemeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const kisiId = document.getElementById("editPersonId").value;
    const guncel = {
        isim: document.getElementById("editName").value,
        email: document.getElementById("editEmail").value,
        unvan: document.getElementById("editTitle").value
    };

    // Fotoğrafa dokunulmadıysa gönderme: mevcut fotoğraf korunur.
    // Kaldırıldıysa null gider, yeni seçildiyse yeni resim gider.
    const fotoDurumu = fotoDuzenle.getir();
    if (fotoDurumu.degisti) {
        guncel.foto = fotoDurumu.foto;
    }

    try {
        await istek(`/kisi/kisiGuncelle/${kisiId}`, "PATCH", guncel);
    } catch (err) {
        alert("Güncellenemedi: " + err.message);
        return;
    }

    modalKapat(duzenleModal);
    await loadKisiler();
});

/* =========================================================
   ALT KİŞİ EKLEME MODALI
   ========================================================= */
document.getElementById("closeChildModalBtn").addEventListener("click", function () {
    modalKapat(altKisiModal);
});
document.getElementById("cancelChildBtn").addEventListener("click", function () {
    modalKapat(altKisiModal);
});

altKisiEklemeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const altKisi = {
        isim: document.getElementById("childName").value,
        email: document.getElementById("childEmail").value,
        unvan: document.getElementById("childTitle").value,
        parent_id: Number(document.getElementById("parentPersonId").value),
        sayfa_id: aktifSayfaId,
        foto: fotoAlt.getir().foto
    };

    try {
        await istek("/kisi/yeniKisi", "POST", altKisi);
    } catch (err) {
        alert("Alt kişi eklenemedi: " + err.message);
        return;
    }

    altKisiEklemeForm.reset();
    fotoAlt.sifirla();
    modalKapat(altKisiModal);
    await loadKisiler();
});

/* =========================================================
   PDF İNDİR
   Ekran geçici olarak "PDF modu"na alınır: butonlar kalkar,
   arka plan beyaz olur. Kutuların fotoğrafı çekilir, çizgiler
   ve başlık ayrıca çizilir, sonuç tek sayfalık PDF olur.
   ========================================================= */
async function pdfIndir() {
    if (aktifSayfaId == null || guncelKisiler.length === 0) {
        alert("PDF için bu sayfada en az bir kişi olmalı.");
        return;
    }
    if (typeof html2canvas === "undefined" || !window.jspdf) {
        alert("PDF kütüphaneleri yüklenemedi. İnternet bağlantını kontrol edip sayfayı yenile.");
        return;
    }

    const sayfa = aktifSayfayiBul();
    const sayfaAdi = sayfa ? sayfa.ad : "Organizasyon Şeması";

    const alan = document.getElementById("kisiCanvas");
    const kaydirmaAlani = document.querySelector(".canvas-wrapper");
    const eskiKaydirmaX = kaydirmaAlani.scrollLeft;
    const eskiKaydirmaY = kaydirmaAlani.scrollTop;
    const eskiYazi = pdfButonu.textContent;

    pdfButonu.disabled = true;
    pdfButonu.textContent = "Hazırlanıyor...";

    alan.classList.add("pdf-modu");
    cizgiKatmani.style.visibility = "hidden"; // çizgileri kendimiz çizeceğiz
    kaydirmaAlani.scrollLeft = 0;
    kaydirmaAlani.scrollTop = 0;

    try {
        // Tarayıcının yeni görünümü (butonsuz kutular) çizmesini bekle
        await new Promise(function (coz) {
            requestAnimationFrame(function () {
                requestAnimationFrame(coz);
            });
        });

        const KENAR = 40;
        const BASLIK = 80;
        const OLCEK = 2;
        const MIN_GENISLIK = 640;

        // Kutuların kapladığı alanı bul
        let minX = Infinity;
        let minY = Infinity;
        let maxX = 0;
        let maxY = 0;
        Object.keys(kutular).forEach(function (id) {
            const k = kutular[id];
            minX = Math.min(minX, k.offsetLeft);
            minY = Math.min(minY, k.offsetTop);
            maxX = Math.max(maxX, k.offsetLeft + k.offsetWidth);
            maxY = Math.max(maxY, k.offsetTop + k.offsetHeight);
        });

        const x = Math.max(0, minX - KENAR);
        const y = Math.max(0, minY - KENAR);
        const w = Math.min(alan.offsetWidth - x, Math.max(maxX + KENAR - x, MIN_GENISLIK));
        const h = Math.min(alan.offsetHeight - y, maxY + KENAR - y);

        // Sadece kutuları (şeffaf zeminde) fotoğrafla
        const kutuResmi = await html2canvas(alan, {
            x: x,
            y: y,
            width: w,
            height: h,
            scale: OLCEK,
            backgroundColor: null,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: alan.offsetWidth,
            windowHeight: alan.offsetHeight
        });

        // Son görüntü: beyaz zemin + başlık + çizgiler + kutular
        const son = document.createElement("canvas");
        son.width = Math.round(w * OLCEK);
        son.height = Math.round((h + BASLIK) * OLCEK);
        const ctx = son.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, son.width, son.height);

        ctx.fillStyle = "#111827";
        ctx.font = `bold ${26 * OLCEK}px "Segoe UI", Arial, sans-serif`;
        ctx.textBaseline = "middle";
        ctx.fillText(sayfaAdi, KENAR * OLCEK, (BASLIK / 2) * OLCEK);

        ctx.strokeStyle = "#9ca3af";
        ctx.lineWidth = 2 * OLCEK;
        ctx.lineJoin = "miter";
        ctx.lineCap = "butt";
        cizgiYollariniHesapla().forEach(function (noktalar) {
            ctx.beginPath();
            noktalar.forEach(function (p, i) {
                const px = (p[0] - x) * OLCEK;
                const py = (p[1] - y + BASLIK) * OLCEK;
                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    ctx.lineTo(px, py);
                }
            });
            ctx.stroke();
        });

        ctx.drawImage(kutuResmi, 0, BASLIK * OLCEK);

        // PDF'e koy: sayfa boyutu görüntü boyutuna eşit, tek sayfa
        const jsPDF = window.jspdf.jsPDF;
        const sayfaGenislik = w;
        const sayfaYukseklik = h + BASLIK;
        const pdf = new jsPDF({
            orientation: sayfaGenislik >= sayfaYukseklik ? "landscape" : "portrait",
            unit: "px",
            format: [sayfaGenislik, sayfaYukseklik],
            hotfixes: ["px_scaling"]
        });
        pdf.addImage(son.toDataURL("image/png"), "PNG", 0, 0, sayfaGenislik, sayfaYukseklik);

        const temizAd = sayfaAdi.replace(/[\\/:*?"<>|]/g, "").trim() || "organizasyon-semasi";
        pdf.save(temizAd + ".pdf");
    } catch (err) {
        console.error("PDF oluşturulamadı:", err);
        alert("PDF oluşturulamadı: " + err.message);
    } finally {
        // Ne olursa olsun ekranı eski haline getir
        alan.classList.remove("pdf-modu");
        cizgiKatmani.style.visibility = "visible";
        kaydirmaAlani.scrollLeft = eskiKaydirmaX;
        kaydirmaAlani.scrollTop = eskiKaydirmaY;
        cizgileriCiz();
        pdfButonu.disabled = false;
        pdfButonu.textContent = eskiYazi;
    }
}

pdfButonu.addEventListener("click", pdfIndir);

/* =========================================================
   ESC TUŞU: AÇIK PENCERELERİ KAPAT
   ========================================================= */
document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    modalKapat(duzenleModal);
    modalKapat(altKisiModal);
    modalKapat(sayfaModal);
    yeniKisiFormunuKapat();
});

/* =========================================================
   BAŞLAT
   ========================================================= */
loadSayfalar();