const pool= require('../../config/database');

async function getKullaniciByIsim(isim) {
    const sonuc = await pool.query(
        'SELECT * FROM kisi WHERE isim ILIKE $1 ORDER BY kisi_id',
        [`%${isim}%`]
    );
    return sonuc.rows;
}

// parent_id verilirse kişi, üst kişisinin sayfasına eklenir.
// foto: küçültülmüş resim (data URL) ya da null
async function createKullanici(isim, email, unvan, parent_id, sayfa_id, foto) {
    if (parent_id != null) {
        const ust = await pool.query(
            'SELECT sayfa_id FROM kisi WHERE kisi_id = $1',
            [parent_id]
        );
        if (ust.rows.length === 0) {
            throw new Error('Üst kişi bulunamadı');
        }
        sayfa_id = ust.rows[0].sayfa_id;
    }

    const sonuc = await pool.query(
        `INSERT INTO kisi (isim, email, unvan, parent_id, sayfa_id, foto)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [isim, String(email || '').trim() || null, unvan, parent_id, sayfa_id, foto || null]
    );
    return sonuc.rows[0];
}

// fotoGuncelle false ise mevcut fotoğraf aynen kalır.
// fotoGuncelle true ise foto değeri yazılır (null = fotoğrafı kaldır).
async function updateKullanici(kisi_id, isim, email, unvan, fotoGuncelle, foto) {
    const sonuc = await pool.query(
        `UPDATE kisi
         SET isim = $2, email = $3, unvan = $4,
             foto = CASE WHEN $5::boolean THEN $6::text ELSE foto END
         WHERE kisi_id = $1
         RETURNING *`,
        [kisi_id, isim, String(email || '').trim() || null, unvan, fotoGuncelle, foto || null]
    );
    return sonuc.rows[0];
}

// Kişiyi ve altındaki herkesi (tüm alt ağacı) tek sorguda siler.
async function deleteKullanici(kisi_id) {
    const sonuc = await pool.query(
        `WITH RECURSIVE alt AS (
             SELECT kisi_id FROM kisi WHERE kisi_id = $1
             UNION ALL
             SELECT k.kisi_id FROM kisi k JOIN alt a ON k.parent_id = a.kisi_id
         )
         DELETE FROM kisi
         WHERE kisi_id IN (SELECT kisi_id FROM alt)
         RETURNING kisi_id`,
        [kisi_id]
    );
    return sonuc.rowCount > 0 ? sonuc.rows : null;
}

// Bir sayfadaki tüm kişiler
async function TumKullanicilar(sayfa_id) {
    const sonuc = await pool.query(
        'SELECT * FROM kisi WHERE sayfa_id = $1 ORDER BY kisi_id',
        [sayfa_id]
    );
    return sonuc.rows;
}

// konumlar: [{ kisi_id, x, y }, ...]
async function konumlariGuncelle(konumlar) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const k of konumlar) {
            await client.query(
                'UPDATE kisi SET x = $2, y = $3 WHERE kisi_id = $1',
                [k.kisi_id, k.x, k.y]
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getKullaniciByIsim,
    createKullanici,
    updateKullanici,
    deleteKullanici,
    TumKullanicilar,
    konumlariGuncelle
};