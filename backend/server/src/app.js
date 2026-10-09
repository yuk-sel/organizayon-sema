require('dotenv').config(); 
const express = require('express'); 
const cors = require('cors'); 
const pool = require('../config/database');
const kisiRoutes = require('./routes/kisi.routes');
const sayfaRoutes= require('./routes/sayfa.routes');
const app = express(); 
app.use(cors()); 
app.use(express.json()); 
app.use('/api/kisi', kisiRoutes);
app.use('/api/sayfa', sayfaRoutes)

app.get('/', (req, res) => 
    { 
        res.send('UYgulama çalışıyor'); 
    }); 
    pool.query('SELECT NOW()') 
    .then(res => console.log('Veritabanı bağlantısı başarılı:', res.rows[0])) 
    .catch(err => console.error('Veritabanı bağlantı hatası:', err)); 
    const PORT = process.env.PORT || 3000; app.listen(PORT, () => 
        { 
            console.log(`Sunucu ${PORT} portunda çalışıyor`); 
        })
