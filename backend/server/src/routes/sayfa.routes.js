const express = require('express');
const router = express.Router();
const sayfaController = require('../controllers/sayfaController');

router.get('/tumSayfalar', sayfaController.getTumSayfalar);
router.post('/yeniSayfa', sayfaController.createSayfa);
router.patch('/sayfaGuncelle/:sayfa_id', sayfaController.updateSayfa);
router.delete('/sayfaSil/:sayfa_id', sayfaController.deleteSayfa);

module.exports = router;