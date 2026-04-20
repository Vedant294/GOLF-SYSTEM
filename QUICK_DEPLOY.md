# ⚡ Quick Deploy Commands

## 🚀 Replace Old Repo & Deploy (5 Commands)

```bash
# 1. Navigate to your Golff project
cd path/to/golff-platform

# 2. Initialize and commit
git init
git add .
git commit -m "feat: complete Golff platform with all features"

# 3. Connect to your existing GitHub repo
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 4. Force push (replaces old repo)
git push -f origin main

# 5. Done! Vercel auto-deploys
# Visit: https://vercel.com/dashboard to monitor
```

---

## 📋 Replace These Values

- `YOUR_USERNAME` → Your GitHub username
- `YOUR_REPO_NAME` → Your repository name
- `main` → Use `master` if that's your default branch

---

## ✅ Verify Deployment

1. **GitHub:** `https://github.com/YOUR_USERNAME/YOUR_REPO_NAME`
2. **Vercel:** `https://vercel.com/dashboard`
3. **Live App:** Your Vercel URL

---

## 🔧 If Build Fails

```bash
# Test build locally first
npm run build

# Fix errors, then:
git add .
git commit -m "fix: build errors"
git push origin main
```

---

## 🌐 Environment Variables (Vercel Dashboard)

Required variables:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_STRIPE_PUBLIC_KEY
VITE_STRIPE_MONTHLY_PRICE_ID
VITE_STRIPE_YEARLY_PRICE_ID
VITE_APP_URL
```

After adding/updating → Click **Redeploy**

---

## 🧪 Test Credentials

**User:** arjun@test.in / Test@123  
**Admin:** admin@golff.in / Admin@123  
**Card:** 4242 4242 4242 4242

---

## 📄 Export Project Report to PDF

1. Open `project-report.html` in browser
2. Click "Export to PDF" button (bottom right)
3. Or use browser: Ctrl+P → Save as PDF

---

## ⏱️ Expected Timeline

- Local setup: 2 min
- Push to GitHub: 1 min
- Vercel build: 2-3 min
- **Total: ~5 minutes**

---

## 🎯 Success Checklist

- [ ] GitHub shows new files
- [ ] Vercel shows "Ready" status
- [ ] App loads at Vercel URL
- [ ] Can login with test credentials
- [ ] No console errors

---

**That's it! Your app is live! 🎉**
