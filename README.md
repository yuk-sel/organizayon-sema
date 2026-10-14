# 🌳 Organizasyon Şeması Yönetim Sistemi

Kişilerin ve organizasyon hiyerarşilerinin uçtan uca yönetilmesini sağlayan modern, web tabanlı bir uygulamadır. 

Kullanıcılar farklı organizasyon sayfaları oluşturabilir, bu sayfalara kişiler ekleyebilir, yöneticilik ilişkilerini belirleyerek organizasyon şemalarını dinamik bir şekilde görselleştirebilir ve düzenleyebilir.

---

## ✨ Özellikler

- 📄 **Sayfa Yönetimi:** Farklı departman veya projeler için organizasyon sayfaları oluşturma, düzenleme ve silme.
- 👥 **Kişi Yönetimi:** Kişi profilleri ekleme, bilgilerini güncelleme ve sistemden silme.
- 📊 **Organizasyon Şeması:** Kişileri hiyerarşik yapıda organize ederek dinamik organizasyon şemasını görselleştirme.
- 🔐 **Güvenli Kimlik Doğrulama:** JWT (JSON Web Token) altyapısı ile güvenli oturum yönetimi.
- 🐘 **PostgreSQL Desteği:** Verilerin ilişkisel veritabanında güvenli ve performanslı saklanması.
- ⚙️ **Yapılandırılabilir Altyapı:** Ortam değişkenleri (`.env`) aracılığıyla farklı PostgreSQL veritabanı ortamlarına esnek bağlantı.

---

## 🛠️ Teknolojiler

Proje mimarisinde kullanılan temel teknoloji ve kütüphaneler:

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Backend:** Node.js, Express.js
- **Veritabanı:** PostgreSQL
- **Kimlik Doğrulama:** JWT (JSON Web Token)

---

## 🚀 Kurulum

### Ön Gereksinimler

Sisteminizde aşağıdaki araçların kurulu olduğundan emin olun:
- [Node.js](https://nodejs.org/) (v14 veya üzeri) & `npm`
- [PostgreSQL](https://www.postgresql.org/) Veritabanı Sunucusu

### Adım Adım Kurulum

1. **Repoyu Klonlayın:**
   ```bash
   git clone https://github.com/yuk-sel/organizayon-sema.git
   cd organizayon-sema

   ```

2. **Bağımlılıkları Yükleyin:**
```bash
npm install

```


3. **Ortam Değişkenlerini Yapılandırın:**
Proje kök dizininde bir `.env` dosyası oluşturun ve aşağıdaki değişkenleri kendi yerel/sunucu veritabanı bilgilerinize göre ayarlayın:
```env
PORT=3000
DATABASE_URL=postgresql://kullanici_adi:sifre@localhost:5432/veritabani_adi
JWT_SECRET=sizin_guvenli_ve_rastgele_jwt_anahtariniz

```
> 💡 **Not:** `DATABASE_URL` değerini kendi PostgreSQL erişim bilgilerinizle değiştirin. `JWT_SECRET` için karmaşık ve rastgele bir metin belirleyin.


4. **Veritabanını Hazırlayın:**
Kendi PostgreSQL veritabanınızı oluşturduktan sonra, projedeki `schema.sql` dosyasını çalıştırarak tablo yapılarını içe aktarın:
```bash
psql "$DATABASE_URL" -f schema.sql

```
> *(Dosya farklı bir dizindeyse komutta ilgili dosya yolunu belirttiğinizden emin olun).*


5. **Uygulamayı Başlatın:**
```bash
node backend/server/src/app.js

```


Uygulama başarıyla başlatıldığında belirlediğiniz `PORT` üzerinden (Varsayılan: `http://localhost:3000`) erişilebilir olacaktır.

---

## ⚙️ Yapılandırma

Uygulamanın veritabanı bağlantısı tamamen `.env` dosyası üzerinden kontrol edilir. Farklı bir PostgreSQL veritabanına geçmek veya canlı ortama (production) dağıtım yapmak için `.env` dosyasındaki `DATABASE_URL` değerini güncellemeniz ve hedef veritabanında `schema.sql` dosyasını bir kez çalıştırmanız yeterlidir.

---
