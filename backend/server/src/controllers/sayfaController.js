const Sayfa = require('../models/sayfa');

function adTemizle(ad) {
    return typeof ad === 'string' ? ad.trim() : '';
}

async function getTumSayfalar(req, res) {
    try {
        const sayfalar = await Sayfa.tumSayfalar();
        res.json(sayfalar);
    } catch (err) {
        res.status(500).json({ error: err.message });
        console.error(err);
    }
}

async function createSayfa(req, res) {
    const ad = adTemizle(req.body.ad);
    if (!ad) {
        return res.status(400).json({ message: 'Sayfa adı boş olamaz' });
    }
    if (ad.length > 100) {
        return res.status(400).json({ message: 'Sayfa adı en fazla 100 karakter olabilir' });
    }

    try {
        const yeniSayfa = await Sayfa.createSayfa(ad);
        res.status(201).json(yeniSayfa);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function updateSayfa(req, res) {
    const sayfa_id = req.params.sayfa_id;
    const ad = adTemizle(req.body.ad);
    if (!ad) {
        return res.status(400).json({ message: 'Sayfa adı boş olamaz' });
    }
    if (ad.length > 100) {
        return res.status(400).json({ message: 'Sayfa adı en fazla 100 karakter olabilir' });
    }

    try {
        const guncellenen = await Sayfa.updateSayfa(sayfa_id, ad);
        if (!guncellenen) {
            return res.status(404).json({ message: 'Sayfa bulunamadı' });
        }
        res.json(guncellenen);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function deleteSayfa(req, res) {
    const sayfa_id = req.params.sayfa_id;
    try {
        const silinen = await Sayfa.deleteSayfa(sayfa_id);
        if (!silinen) {
            return res.status(404).json({ message: 'Sayfa bulunamadı' });
        }
        res.json({ message: 'Sayfa ve içindeki kişiler silindi' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    getTumSayfalar,
    createSayfa,
    updateSayfa,
    deleteSayfa
};