# Hidden Gem Explorer — Deployment Guide
## Ubuntu 24.04 + aaPanel + Cloudflare Tunnel

---

## 1. PERSIAPAN VPS

```bash
# Update sistem
apt update && apt upgrade -y

# Install aaPanel
wget -O install.sh https://www.aapanel.com/script/install_6.0_en.sh
bash install.sh aapanel
```

Setelah install, akses aaPanel di `http://IP_VPS:7800`

---

## 2. INSTALL SOFTWARE DI AAPANEL

Di aaPanel → **App Store**, install:
- ✅ Nginx
- ✅ MySQL 8.0
- ✅ Node.js (versi 20.x)
- ✅ PM2 Manager

---

## 3. SETUP DATABASE

aaPanel → **Database** → **Add Database**:
- DB Name: `hidden_gem_explorer`
- Username: `hge_user`
- Password: *(buat password kuat)*

Lalu import schema:
```bash
mysql -u hge_user -p hidden_gem_explorer < /path/to/schema.sql
```

Atau via aaPanel → phpMyAdmin → Import file `schema.sql`

---

## 4. UPLOAD PROJECT

```bash
# Di VPS, buat folder project
mkdir -p /www/wwwroot/hidden-gem-explorer
cd /www/wwwroot/hidden-gem-explorer

# Upload via SFTP atau Git
git clone https://github.com/username/hidden-gem-explorer.git .

# Install dependencies
npm install --production
```

---

## 5. KONFIGURASI .env

```bash
cp .env.example .env
nano .env
```

Isi sesuai konfigurasi:
```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=hge_user
DB_PASSWORD=password_database_kamu
DB_NAME=hidden_gem_explorer
JWT_SECRET=ganti_dengan_random_string_panjang
SESSION_SECRET=ganti_dengan_random_string_lain
APP_URL=https://domain-kamu.com
```

---

## 6. JALANKAN DENGAN PM2

```bash
# Install PM2 global
npm install -g pm2

# Start aplikasi
pm2 start server.js --name hidden-gem-explorer

# Auto-start saat reboot
pm2 startup
pm2 save
```

Cek status:
```bash
pm2 status
pm2 logs hidden-gem-explorer
```

---

## 7. SETUP NGINX DI AAPANEL

aaPanel → **Website** → **Add Site**:
- Domain: `domain-kamu.com`
- Root: `/www/wwwroot/hidden-gem-explorer/frontend`
- PHP: `Pure Static`

Lalu edit konfigurasi Nginx site:

```nginx
server {
    listen 80;
    server_name domain-kamu.com;

    client_max_body_size 10M;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location /images/uploads/ {
        alias /www/wwwroot/hidden-gem-explorer/frontend/images/uploads/;
        expires 7d;
    }
}
```

Klik **Save** → **Reload Nginx**

---

## 8. SSL DENGAN CLOUDFLARE TUNNEL

### Option A: Cloudflare Tunnel (Tanpa Port 80/443 terbuka)

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared-linux-amd64.deb

# Login ke Cloudflare
cloudflared tunnel login

# Buat tunnel
cloudflared tunnel create hidden-gem-explorer

# Buat config
nano ~/.cloudflared/config.yml
```

Isi config:
```yaml
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: domain-kamu.com
    service: http://localhost:3000
  - service: http_status:404
```

```bash
# Jalankan tunnel sebagai service
cloudflared service install
systemctl start cloudflared
```

### Option B: SSL via aaPanel (Let's Encrypt)

aaPanel → Website → domain → **SSL** → **Let's Encrypt** → Apply

---

## 9. SUPERADMIN LOGIN

Setelah deploy, login dengan:
- Email: `superadmin@hiddengemexplorer.id`
- Password: `SuperAdmin@2024!`

⚠️ **Segera ganti password setelah login pertama!**

---

## 10. DOCKER (ALTERNATIF)

Jika ingin deploy dengan Docker:

```bash
# Copy dan edit env
cp .env.example .env

# Build dan jalankan
docker-compose up -d

# Cek status
docker-compose ps
docker-compose logs -f app
```

---

## TROUBLESHOOTING

**App tidak bisa connect ke MySQL:**
```bash
# Cek .env DB credentials
# Pastikan MySQL berjalan
systemctl status mysql
```

**PM2 tidak auto-start:**
```bash
pm2 startup systemd
pm2 save
```

**Upload gambar gagal:**
```bash
chmod 755 /www/wwwroot/hidden-gem-explorer/frontend/images/uploads
chown www-data:www-data /www/wwwroot/hidden-gem-explorer/frontend/images/uploads
```

**Cek log error:**
```bash
pm2 logs hidden-gem-explorer --lines 50
```
