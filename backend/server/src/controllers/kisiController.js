const Kisi = require('../models/kisi');

// Fotoğraf: null (yok) ya da küçültülmüş bir resim (data URL) olmalı
function fotoGecerli(foto) {
    if (foto === null) return true;
    return (
        typeof foto === 'string' &&
        /^data:image\/(jpeg|png|webp);base64,/.test(foto) &&
        foto.length <= 300000
    );
}

async function getKullaniciByIsim(req, res) {
    const { isim } = req.params;
    try {
        const kullanicilar = await Kisi.getKullaniciByIsim(isim);
        if (!kullanicilar || kullanicilar.length === 0) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        res.json(kullanicilar);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sunucu hatası' });
    }
}

async function createKullanici(req, res) {
    const { isim, email, unvan } = req.body;
    const parent_id =
        req.body.parent_id === undefined || req.body.parent_id === null || req.body.parent_id === ''
            ? null
            : Number(req.body.parent_id);
    const sayfa_id =
        req.body.sayfa_id === undefined || req.body.sayfa_id === null || req.body.sayfa_id === ''
            ? null
            : Number(req.body.sayfa_id);

    if (!isim || !unvan) {
        return res.status(400).json({ message: 'İsim ve ünvan zorunlu' });
    }
    if (parent_id === null && sayfa_id === null) {
        return res.status(400).json({ message: 'Kişi için sayfa_id gerekli' });
    }

    const foto = req.body.foto === undefined ? null : req.body.foto;
    if (!fotoGecerli(foto)) {
        return res.status(400).json({ message: 'Fotoğraf geçersiz ya da çok büyük' });
    }

    try {
        const yeniKullanici = await Kisi.createKullanici(isim, email, unvan, parent_id, sayfa_id, foto);
        res.status(201).json(yeniKullanici);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateKullanici(req, res) {
    const kisi_id = req.params.kisi_id;
    const { isim, email, unvan } = req.body;

    if (!isim || !unvan) {
        return res.status(400).json({ message: 'İsim ve ünvan zorunlu' });
    }

    // Gövdede "foto" alanı yoksa mevcut fotoğraf korunur, null ise kaldırılır
    const fotoGuncelle = Object.prototype.hasOwnProperty.call(req.body, 'foto');
    const foto = fotoGuncelle ? req.body.foto : null;
    if (fotoGuncelle && !fotoGecerli(foto)) {
        return res.status(400).json({ message: 'Fotoğraf geçersiz ya da çok büyük' });
    }

    try {
        const updatedKullanici = await Kisi.updateKullanici(kisi_id, isim, email, unvan, fotoGuncelle, foto);
        if (!updatedKullanici) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        res.json(updatedKullanici);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteKullanici(req, res) {
    const kisi_id = req.params.kisi_id;
    try {
        const deletedKullanici = await Kisi.deleteKullanici(kisi_id);
        if (!deletedKullanici) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }
        res.json({ message: 'Kullanıcı ve altındaki kişiler silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function getTumKullanicilar(req, res) {
    const sayfa_id = req.params.sayfa_id;
    try {
        const tumKullanicilar = await Kisi.TumKullanicilar(sayfa_id);
        res.json(tumKullanicilar);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// Gövde: [{ kisi_id, x, y }, ...]
async function konumlariKaydet(req, res) {
    const konumlar = req.body;

    if (!Array.isArray(konumlar)) {
        return res.status(400).json({ message: 'Gövde bir dizi olmalı' });
    }

    const gecerli = konumlar.every(function (k) {
        return (
            k &&
            Number.isInteger(Number(k.kisi_id)) &&
            Number.isFinite(Number(k.x)) &&
            Number.isFinite(Number(k.y))
        );
    });
    if (!gecerli) {
        return res.status(400).json({ message: 'Her eleman kisi_id, x ve y içermeli' });
    }

    try {
        await Kisi.konumlariGuncelle(
            konumlar.map(function (k) {
                return { kisi_id: Number(k.kisi_id), x: Number(k.x), y: Number(k.y) };
            })
        );
        res.json({ message: 'Konumlar kaydedildi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getKullaniciByIsim,
    createKullanici,
    updateKullanici,
    deleteKullanici,
    getTumKullanicilar,
    konumlariKaydet
};