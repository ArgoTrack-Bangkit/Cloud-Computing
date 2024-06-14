# Gunakan image Node.js sebagai base image
FROM node:20

# Tentukan working directory di dalam container
WORKDIR /app

# Salin file package.json dan package-lock.json ke dalam container
COPY package*.json ./

# Install dependensi aplikasi
RUN npm install

# Salin seluruh kode aplikasi ke dalam container
COPY . .

# Expose port yang digunakan oleh aplikasi
ENV PORT=3000

# Tentukan perintah untuk menjalankan aplikasi
CMD ["node", "index.js"]
