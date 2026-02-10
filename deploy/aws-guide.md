# Hindsight AWS Deployment Guide (EC2 + Docker)

## Prerequisites
- AWS Account (you have this ✅)
- AWS CLI installed locally
- Docker installed locally (for testing)
- MongoDB Atlas account (free tier works)

---

## Step 1: Prepare MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free M0 cluster
3. Create database user with password
4. Whitelist IP: `0.0.0.0/0` (allows all IPs - for EC2)
5. Get connection string: 
   ```
   mongodb+srv://username:password@cluster.mongodb.net/hindsight
   ```

---

## Step 2: Launch EC2 Instance

### AWS Console Steps:
1. Go to **EC2 Dashboard** → **Launch Instance**
2. Configure:
   - **Name**: `hindsight-backend`
   - **AMI**: Amazon Linux 2023
   - **Instance type**: `t3.micro` (free tier)
   - **Key pair**: Create new or use existing
   - **Security Group**: Allow:
     - SSH (22) from your IP
     - HTTP (80) from anywhere
     - HTTPS (443) from anywhere
     - Custom TCP (5000) from anywhere

3. Launch and note the **Public IP**

---

## Step 3: Connect & Setup EC2

```bash
# Connect via SSH
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Update system
sudo yum update -y

# Install Docker
sudo yum install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again for docker group
exit
```

---

## Step 4: Deploy Backend

```bash
# Reconnect
ssh -i your-key.pem ec2-user@YOUR_EC2_PUBLIC_IP

# Create app directory
mkdir -p ~/hindsight-backend
cd ~/hindsight-backend

# Clone your code (or upload via SCP)
# Option A: Git
git clone https://github.com/YOUR_USERNAME/tradej1.git .

# Option B: SCP from local (run from local machine)
# scp -i your-key.pem -r ./backend/* ec2-user@YOUR_EC2_PUBLIC_IP:~/hindsight-backend/

# Create .env file
cat > .env << 'EOF'
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb+srv://YOUR_USER:YOUR_PASS@cluster.mongodb.net/hindsight
JWT_SECRET=your-super-secret-key-32-chars-minimum
FRONTEND_URL=https://your-frontend-domain.com
DHAN_CLIENT_ID=your_dhan_id
DHAN_CLIENT_SECRET=your_dhan_secret
ANGEL_ONE_API_KEY=your_angel_api
OPENAI_API_KEY=your_openai_key
EOF

# Build and run Docker
docker build -t hindsight-backend .
docker run -d -p 5000:5000 --env-file .env --name hindsight hindsight-backend

# Check logs
docker logs hindsight
```

---

## Step 5: Deploy Frontend to S3 + CloudFront

### Build Frontend:
```bash
cd frontend
npm run build
```

### AWS Console Steps:
1. **Create S3 Bucket**:
   - Bucket name: `hindsight-frontend`
   - Uncheck "Block all public access"
   - Enable static website hosting
   - Index document: `index.html`
   - Error document: `index.html` (for SPA routing)

2. **Upload Build Files**:
   ```bash
   aws s3 sync dist/ s3://hindsight-frontend --acl public-read
   ```

3. **Create CloudFront Distribution**:
   - Origin: Your S3 bucket website endpoint
   - Enable HTTPS
   - Default root object: `index.html`
   - Error pages: 404 → /index.html (for SPA)

4. **Update Frontend API URL**:
   - In `frontend/src/services/api.js`, set baseURL to your EC2 IP:
   ```javascript
   baseURL: 'http://YOUR_EC2_IP:5000'
   ```
   - Rebuild and re-upload

---

## Step 6: Set Up Domain (Optional)

### Route 53 (if you buy domain later):
1. Register domain in Route 53
2. Create hosted zone
3. Add A record pointing to EC2 IP
4. Add CNAME for CloudFront distribution

### Using Free Subdomain:
- Use services like [nip.io](https://nip.io) for testing
- Example: `your-ec2-ip.nip.io`

---

## Step 7: SSL with Let's Encrypt (Optional but Recommended)

```bash
# On EC2, install nginx and certbot
sudo yum install nginx -y
sudo amazon-linux-extras install epel -y
sudo yum install certbot python3-certbot-nginx -y

# Configure nginx as reverse proxy
sudo nano /etc/nginx/conf.d/hindsight.conf
```

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Get SSL certificate
sudo certbot --nginx -d YOUR_DOMAIN
```

---

## Useful Commands

```bash
# View running containers
docker ps

# View logs
docker logs -f hindsight

# Restart container
docker restart hindsight

# Stop and remove
docker stop hindsight && docker rm hindsight

# Rebuild and redeploy
docker build -t hindsight-backend . && \
docker stop hindsight && docker rm hindsight && \
docker run -d -p 5000:5000 --env-file .env --name hindsight hindsight-backend
```

---

## Estimated Monthly Costs

| Service | Cost |
|---------|------|
| EC2 t3.micro | $0 (12 months free) or ~$8/mo |
| MongoDB Atlas M0 | $0 (free tier) |
| S3 (frontend) | ~$0.50/mo |
| CloudFront | ~$1-2/mo |
| Route 53 (optional) | ~$0.50/mo per domain |
| **Total** | **~$0-12/mo** |
