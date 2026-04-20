# 🚀 Your Deployment Steps for https://github.com/Vedant294/golf-charity

## ⚡ Quick Commands (Copy & Paste These)

Open your terminal (Git Bash, PowerShell, or Command Prompt) in the `D:\golff` folder and run these commands one by one:

---

### Step 1: Initialize Git (if not already done)

```bash
git init
```

**Expected output:** `Initialized empty git repository` or `Reinitialized existing Git repository`

---

### Step 2: Add All Files

```bash
git add .
```

**Expected output:** (No output means success)

---

### Step 3: Create Commit

```bash
git commit -m "feat: complete Golff platform with all features - PRD 90% coverage"
```

**Expected output:** Shows files changed and insertions

---

### Step 4: Connect to Your GitHub Repository

```bash
git remote add origin https://github.com/Vedant294/golf-charity.git
```

**Expected output:** (No output means success)

**If you get "remote origin already exists" error, run:**
```bash
git remote set-url origin https://github.com/Vedant294/golf-charity.git
```

---

### Step 5: Check Your Default Branch Name

```bash
git branch
```

**Expected output:** Shows `* main` or `* master`

---

### Step 6: Force Push to Replace Old Repository

**⚠️ WARNING: This will replace ALL content in your GitHub repository!**

If your branch is `main`:
```bash
git push -f origin main
```

If your branch is `master`:
```bash
git push -f origin master
```

**Expected output:** 
```
Enumerating objects: 100, done.
Counting objects: 100% (100/100), done.
Writing objects: 100% (100/100), done.
Total 100 (delta 0), reused 0 (delta 0)
To https://github.com/Vedant294/golf-charity.git
 + abc1234...def5678 main -> main (forced update)
```

---

## ✅ Verification Steps

### 1. Check GitHub
Visit: https://github.com/Vedant294/golf-charity

You should see:
- ✅ All your Golff project files
- ✅ Updated README.md
- ✅ project-report.html
- ✅ All source code in `src/` folder

---

### 2. Check Vercel Deployment

1. Go to: https://vercel.com/dashboard
2. Find your project (should be named `golf-charity`)
3. You should see a new deployment starting automatically
4. Wait 2-3 minutes for "Ready" status

---

### 3. Update Vercel Environment Variables

1. In Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure these are set:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STRIPE_PUBLIC_KEY=pk_test_...
VITE_STRIPE_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_YEARLY_PRICE_ID=price_...
VITE_APP_URL=https://golf-charity.vercel.app
```

3. If you updated any variables, click **Redeploy**

---

## 🧪 Test Your Live App

Once Vercel shows "Ready":

1. Visit your Vercel URL (e.g., `https://golf-charity.vercel.app`)
2. Test with these credentials:

**User Account:**
- Email: `arjun@test.in`
- Password: `Test@123`

**Admin Account:**
- Email: `admin@golff.in`
- Password: `Admin@123`

**Test Payment:**
- Card: `4242 4242 4242 4242`
- Expiry: `12/28`
- CVC: `123`

---

## 🐛 Troubleshooting

### Problem: "Permission denied" when pushing

**Solution:**
```bash
# You may need to authenticate with GitHub
# Use GitHub Desktop or set up SSH keys
# Or use: git push -f https://YOUR_GITHUB_TOKEN@github.com/Vedant294/golf-charity.git main
```

---

### Problem: "remote origin already exists"

**Solution:**
```bash
git remote remove origin
git remote add origin https://github.com/Vedant294/golf-charity.git
git push -f origin main
```

---

### Problem: Vercel build fails

**Solution:**
1. Check build logs in Vercel dashboard
2. Test locally: `npm run build`
3. Fix any errors
4. Commit and push again:
```bash
git add .
git commit -m "fix: build errors"
git push origin main
```

---

### Problem: Can't see new files on GitHub

**Solution:**
1. Refresh the GitHub page
2. Check you pushed to the correct branch
3. Verify with: `git log --oneline`

---

## 📋 Complete Command Sequence (All at Once)

If you want to run everything in one go:

```bash
git init
git add .
git commit -m "feat: complete Golff platform with all features"
git remote add origin https://github.com/Vedant294/golf-charity.git
git push -f origin main
```

---

## ⏱️ Timeline

- Commands 1-4: **2 minutes**
- Push to GitHub: **1 minute**
- Vercel auto-deploy: **2-3 minutes**
- **Total: ~5-6 minutes**

---

## 🎯 Success Indicators

You'll know it worked when:

1. ✅ GitHub shows all new Golff files at https://github.com/Vedant294/golf-charity
2. ✅ Vercel dashboard shows "Ready" deployment
3. ✅ Your live URL loads the Golff landing page
4. ✅ You can login with test credentials
5. ✅ No errors in browser console

---

## 📞 Next Steps After Deployment

1. ✅ Test all features on live site
2. ✅ Open `project-report.html` in browser
3. ✅ Click "Export to PDF" button
4. ✅ Submit GitHub URL + Live URL + PDF report

---

## 🎉 Your Submission Package

**GitHub Repository:**
https://github.com/Vedant294/golf-charity

**Live Application:**
https://golf-charity.vercel.app (or your custom domain)

**Project Report:**
`project-report.pdf` (exported from project-report.html)

**Test Credentials:**
- User: arjun@test.in / Test@123
- Admin: admin@golff.in / Admin@123
- Card: 4242 4242 4242 4242

---

**Ready to deploy! Just copy and paste the commands above! 🚀**
