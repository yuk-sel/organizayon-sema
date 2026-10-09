const express = require('express');
const router = express.Router();
const kisiController = require('../controllers/kisiController');

router.get('/kisiBul/:isim', kisiController.getKullaniciByIsim);
router.post('/yeniKisi', kisiController.createKullanici);
router.patch('/kisiGuncelle/:kisi_id', kisiController.updateKullanici);
router.delete('/kisiSil/:kisi_id', kisiController.deleteKullanici);
router.get('/tumKisiler/:sayfa_id', kisiController.getTumKullanicilar);
router.patch('/konumlariKaydet', kisiController.konumlariKaydet);

module.exports = router;