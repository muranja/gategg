# Cloudflare Pages Deployment Guide for Nuclear-Nebula

## ✅ Current Status
- **Repository:** https://github.com/muranja/gategg
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Framework:** Astro 5.16.0

## 🚀 Cloudflare Pages Setup Steps

### 1. Connect Your Repository
1. Go to https://dash.cloudflare.com
2. Navigate to **Workers & Pages** → **Pages** → **Create application**
3. Select **Connect to Git**
4. Authorize Cloudflare to access your GitHub account
5. Select `muranja/gategg` repository
6. Choose branch: `main`

### 2. Configure Build Settings (Already Done ✅)
```
Framework preset: Astro
Build command: npm run build
Build output directory: dist
```

### 3. Environment Variables (Optional but Recommended)

Click "Environment variables (advanced)" and add:

```
PUBLIC_GA4_ID = G-XXXXXXXXXX
```

Replace `G-XXXXXXXXXX` with your actual Google Analytics 4 Measurement ID.

### 4. Deploy
1. Click **"Save and Deploy"**
2. Wait for build to complete (typically 1-2 minutes)
3. Your site will be live at `*.pages.dev` domain

---

## 📊 Expected Build Output

When Cloudflare deploys, it will:
1. Clone the gategg repository
2. Run: `npm install`
3. Run: `npm run build`
4. Generate 11 HTML pages + optimized images
5. Deploy the `dist` folder

**Build should complete in:** 30-60 seconds

---

## 🔗 Custom Domain Setup

### Option A: Use Cloudflare DNS
1. In Cloudflare dashboard, go to **DNS**
2. Add DNS records:
   - Type: `CNAME`
   - Name: `solitairecc` (or your subdomain)
   - Target: `gategg.pages.dev`
3. Update `astro.config.mjs`:
   ```javascript
   site: 'https://solitairecc.com',
   ```
4. Redeploy

### Option B: Use External Registrar
1. Point your domain's nameservers to Cloudflare
2. Add DNS record in Cloudflare dashboard
3. SSL certificate auto-provisioned (free)

---

## 🔐 Security Headers (Auto-Enabled)

Cloudflare automatically provides:
- ✅ HTTPS/SSL
- ✅ HSTS header
- ✅ DDoS protection
- ✅ Rate limiting
- ✅ WAF (Web Application Firewall)

---

## 📈 Post-Deployment Checklist

### Immediate (Day 1)
- [ ] Verify site loads at `*.pages.dev`
- [ ] Test all 11 pages load correctly
- [ ] Check 404 page works
- [ ] Verify images load properly

### SEO (Day 2-3)
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify Google Analytics is tracking
- [ ] Test mobile responsiveness

### DNS/Domain (Day 3-7)
- [ ] Connect custom domain (if applicable)
- [ ] Verify SSL certificate installed
- [ ] Update DNS records
- [ ] Test HTTPS redirect

---

## 🧪 Testing Commands Before Deployment

```bash
# Verify build works locally
npm run build

# Test production build locally
npm run preview

# Check for build errors
npm run build 2>&1 | grep -i error
```

---

## 📝 Site Details for Cloudflare

**Project Name:** nuclear-nebula  
**Repository:** muranja/gategg  
**Branch:** main  
**Build Command:** npm run build  
**Output Directory:** dist  
**Node Version:** 18+ (auto-selected by Cloudflare)  

---

## 🎯 What Gets Deployed

- ✅ 11 HTML pages (homepage, about, blog posts, 404)
- ✅ Optimized WebP images (11 images)
- ✅ Auto-generated sitemap
- ✅ RSS feed
- ✅ Favicon
- ✅ All CSS and JavaScript

**Total Size:** ~2-3 MB (very small, great for Cloudflare)

---

## 💡 Pro Tips

1. **Automatic Deployments:** Every push to `main` triggers automatic rebuild
2. **Preview Deployments:** Each PR gets a preview URL
3. **Rollback:** Easy to rollback to previous deployments
4. **Analytics:** Cloudflare provides free analytics dashboard
5. **Caching:** Static sites cache perfectly (no TTL needed)

---

## Troubleshooting

### Build Fails
1. Check **Deployment log** in Cloudflare dashboard
2. Verify `npm run build` works locally
3. Check all dependencies in `package.json`

### Site Won't Load
1. Verify DNS records are correct
2. Check SSL certificate is provisioned
3. Clear browser cache
4. Try incognito mode

### Images Not Loading
1. Verify image paths in markdown files
2. Check image files exist in `src/assets/`
3. Verify Astro Image component is used

---

## Next Steps

1. ✅ Repository pushed to muranja/gategg
2. 🔄 Connect repository to Cloudflare Pages (follow Step 1 above)
3. 🚀 Deploy and monitor first build
4. 📊 Submit sitemap to search engines
5. 🎯 Configure custom domain (optional)

**Your site is ready to deploy!** 🎉

---

Last Updated: November 30, 2025
