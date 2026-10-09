-- Hiyerarşik Kişi Yönetim Sistemi Veritabanı Şeması (PostgreSQL)

-- 1. Tablonun Temizlenmesi (Eğer önceden varsa siler)
DROP TABLE IF EXISTS kisi CASCADE;

-- 2. 'kisi' Tablosunun Oluşturulması
CREATE TABLE kisi (
kisi_id SERIAL PRIMARY KEY,
parent_id INT REFERENCES kisi(kisi_id) ON DELETE CASCADE,
isim VARCHAR(100) NOT NULL,
email VARCHAR(150) NOT NULL,
unvan VARCHAR(100) NOT NULL,
renk VARCHAR(20) DEFAULT 'blue',
olusturulma_tarihi TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
guncellenme_tarihi TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Performans ve Arama Hızlandırma İndeksleri
-- Hiyerarşik sorgulamaları hızlandırmak için parent_id indeksi
CREATE INDEX idx_kisi_parent_id ON kisi(parent_id);

-- Arama çubuğunda isim bazlı hızlı arama yapabilmek için harf büyüklüğüne duyarsız (ILIKE) indeks
CREATE INDEX idx_kisi_isim_lower ON kisi(LOWER(isim));

-- 4. Güncelleme Tarihini Otomatik Güncelleyen Fonksiyon ve Trigger
CREATE OR REPLACE FUNCTION update_guncellenme_tarihi()
RETURNS TRIGGER AS $$ BEGIN     NEW.guncellenme_tarihi = CURRENT_TIMESTAMP;     RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kisi_guncellenme
BEFORE UPDATE ON kisi
FOR EACH ROW
EXECUTE FUNCTION update_guncellenme_tarihi();

-- =========================================================
-- ORGANİZASYON ŞEMASI: SAYFA DESTEĞİ (PostgreSQL)
-- Tüm dosyayı seçip tek seferde çalıştır.
-- Kişi tablosunun adı "kisi" değilse aşağıdaki "kisi" yazan
-- yerleri kendi tablo adınla değiştir.
-- =========================================================

-- 1) Sayfalar tablosu
CREATE TABLE IF NOT EXISTS sayfalar (
    sayfa_id         SERIAL PRIMARY KEY,
    ad               VARCHAR(100) NOT NULL,
    olusturma_tarihi TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2) Kişi tablosuna yeni sütunlar (önce boş olabilir)
ALTER TABLE kisi ADD COLUMN IF NOT EXISTS sayfa_id INTEGER;
ALTER TABLE kisi ADD COLUMN IF NOT EXISTS x DOUBLE PRECISION;
ALTER TABLE kisi ADD COLUMN IF NOT EXISTS y DOUBLE PRECISION;

-- 3) Mevcut kişiler için varsayılan sayfa
INSERT INTO sayfalar (ad)
SELECT 'İnsan Kaynakları'
WHERE NOT EXISTS (SELECT 1 FROM sayfalar);

UPDATE kisi
SET sayfa_id = (SELECT MIN(sayfa_id) FROM sayfalar)
WHERE sayfa_id IS NULL;

-- 4) Sütunu zorunlu yap ve sayfalara bağla.
--    Sayfa silinince içindeki kişiler de silinir.
ALTER TABLE kisi ALTER COLUMN sayfa_id SET NOT NULL;

ALTER TABLE kisi
    ADD CONSTRAINT kisi_sayfa_fk
    FOREIGN KEY (sayfa_id) REFERENCES sayfalar (sayfa_id)
    ON DELETE CASCADE;

ALTER TABLE kisi ADD COLUMN IF NOT EXISTS foto TEXT;
ALTER TABLE kisi ALTER COLUMN email DROP NOT NULL;