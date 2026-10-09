const pool= require('../../config/database');

async function tumSayfalar() {
    const sonuc = await pool.query(
        'SELECT sayfa_id, ad, olusturma_tarihi FROM sayfalar ORDER BY sayfa_id'
    );
    return sonuc.rows;
}

async function createSayfa(ad) {
    const sonuc = await pool.query(
        'INSERT INTO sayfalar (ad) VALUES ($1) RETURNING sayfa_id, ad, olusturma_tarihi',
        [ad]
    );
    return sonuc.rows[0];
}

async function updateSayfa(sayfa_id, ad) {
    const sonuc = await pool.query(
        'UPDATE sayfalar SET ad = $2 WHERE sayfa_id = $1 RETURNING sayfa_id, ad, olusturma_tarihi',
        [sayfa_id, ad]
    );
    return sonuc.rows[0];
}

// Sayfa silinince kişiler veritabanındaki ON DELETE CASCADE ile silinir.
async function deleteSayfa(sayfa_id) {
    const sonuc = await pool.query(
        'DELETE FROM sayfalar WHERE sayfa_id = $1 RETURNING sayfa_id',
        [sayfa_id]
    );
    return sonuc.rows[0];
}

module.exports = {
    tumSayfalar,
    createSayfa,
    updateSayfa,
    deleteSayfa
};