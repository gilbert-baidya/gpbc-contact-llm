# 🔒 SECURITY GUIDE

## ⚠️ CRITICAL: Immediate Actions Required

If you've pushed code to GitHub before reading this, **ALL SECRETS MUST BE ROTATED IMMEDIATELY**.

### 1. Rotate All Secrets Now

Treat the following as compromised if ever committed to git:

- **Twilio Auth Token** - Regenerate at https://console.twilio.com/
- **OpenAI API Key** - Regenerate at https://platform.openai.com/api-keys
- **JWT SECRET_KEY** - Generate new: `openssl rand -hex 32`
- **Database Credentials** - Change all passwords
- **Default User Passwords** - Change via admin panel or database

### 2. Secure Your Environment Files

```bash
# Create your .env file from the example
cp .env.example backend/.env

# Generate a secure SECRET_KEY
openssl rand -hex 32

# Edit backend/.env with your actual credentials
nano backend/.env
```

**NEVER commit .env files!** They are in .gitignore already.

### 3. Update .gitignore (Already Done)

The following files are ignored:
- `.env`, `.env.local`, `.env.*.local`
- `backend/.env`, `frontend/.env`
- `*.db`, `*.sqlite`, `*.sqlite3`
- `church_contacts.db`
- `venv/`, `.venv/`, `__pycache__/`

### 4. Remove Secrets from Git History

If you've accidentally committed secrets:

```bash
# Remove ALL sensitive files from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch --force backend/.env frontend/.env .env" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (WARNING: This rewrites history!)
git push origin --force --all

# Clean up local refs
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

**Better Option:** Delete and recreate the repository if it's early in development.

---

## 🛡️ Security Best Practices

### Environment Variables

**DO:**
✅ Use `.env` files for all secrets (never commit them)
✅ Use `.env.example` as a template with placeholder values
✅ Generate unique, random values for SECRET_KEY
✅ Use environment-specific configs (.env.development, .env.production)
✅ Use platform-managed secrets (Railway, Render, GitHub Actions)

**DON'T:**
❌ Hardcode secrets in source code
❌ Commit .env files to git
❌ Use weak or default passwords
❌ Share secrets in documentation or README
❌ Use the same SECRET_KEY across environments

### Password Security

**Initial Setup (backend/init_auth.py):**

```bash
# Set in backend/.env
DEFAULT_ADMIN_EMAIL=admin@yourchurch.org
DEFAULT_ADMIN_NAME=Administrator
DEFAULT_ADMIN_PASSWORD=use-a-strong-random-password-here
```

**After first login:**
1. Change the default password immediately
2. Enable 2FA for admin accounts
3. Remove DEFAULT_ADMIN_PASSWORD from .env
4. Delete demo users from frontend (AuthContext.tsx)

### Frontend Authentication

The current implementation uses demo credentials for UI testing ONLY.

**For Production:**
1. Remove DEMO_USERS array from `AuthContext.tsx`
2. Remove quick-login buttons from `LoginPage.tsx`
3. Connect login to backend API `/api/auth/login`
4. Store JWT tokens securely (httpOnly cookies preferred)
5. Implement token refresh logic

**Example secure login:**

```typescript
// frontend/src/context/AuthContext.tsx
const login = async (email: string, password: string) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // for httpOnly cookies
    body: JSON.stringify({ email, password })
  });
  
  if (!response.ok) throw new Error('Login failed');
  
  const data = await response.json();
  setUser(data.user);
  // Backend sets httpOnly cookie with JWT
};
```

---

## 🔍 Secret Scanning

### Install Gitleaks (Local Scanning)

```bash
# macOS
brew install gitleaks

# Scan your repo
gitleaks detect --source . --verbose

# Scan before committing
gitleaks protect --staged
```

### Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
gitleaks protect --staged
if [ $? -eq 1 ]; then
  echo "⚠️  Gitleaks found secrets! Commit aborted."
  exit 1
fi
```

```bash
chmod +x .git/hooks/pre-commit
```

### GitHub Secret Scanning

GitHub automatically scans public repositories. For private repos:

1. Go to repository Settings → Security → Code security and analysis
2. Enable "Secret scanning"
3. Enable "Push protection" (blocks commits with secrets)

---

## 📋 Security Checklist

Before deploying to production:

### Secrets Management
- [ ] All secrets stored in `.env` files (not in code)
- [ ] `.env` files listed in `.gitignore`
- [ ] Unique SECRET_KEY generated for each environment
- [ ] All API keys rotated (if ever committed)
- [ ] Default passwords changed
- [ ] Secrets stored in platform (Railway/Render/etc.)

### Authentication
- [ ] Demo users removed from frontend
- [ ] Quick-login buttons removed
- [ ] Frontend connected to backend auth API
- [ ] JWT tokens stored securely (httpOnly cookies)
- [ ] 2FA enabled for admin accounts
- [ ] Password reset flow uses email (not tokens in URL)

### Database
- [ ] SQLite → PostgreSQL for production
- [ ] Database backups configured
- [ ] Database password is strong (20+ chars)
- [ ] Database not publicly accessible

### Code
- [ ] No hardcoded secrets in any file
- [ ] No test credentials in documentation
- [ ] Gitleaks installed and scanning
- [ ] Pre-commit hooks active
- [ ] GitHub secret scanning enabled

### Deployment
- [ ] HTTPS enabled (Let's Encrypt)
- [ ] CORS properly configured
- [ ] DEBUG=False in production
- [ ] Rate limiting enabled on auth endpoints
- [ ] Security headers configured (CSP, HSTS, etc.)

---

## 🚨 What If Secrets Were Exposed?

### If you accidentally committed secrets:

1. **STOP pushing immediately**
2. **Rotate all exposed secrets** (get new ones)
3. **Remove from git history** (see commands above)
4. **Force push** to overwrite remote history
5. **Verify removal** with `gitleaks detect`
6. **Monitor accounts** for unauthorized access

### If secrets were in a public repo:

1. **Assume compromised** - rotate everything
2. **Check Twilio usage logs** for unauthorized calls
3. **Check OpenAI usage** for unexpected API calls
4. **Review database logs** for suspicious activity
5. **Consider making repo private** or deleting/recreating it

---

## 📞 Security Contacts

- **Twilio Security:** https://www.twilio.com/help/security
- **OpenAI Security:** https://platform.openai.com/docs/guides/safety-best-practices
- **GitHub Security:** https://docs.github.com/en/code-security

---

## ✅ Quick Start (Secure Setup)

```bash
# 1. Copy environment template
cp .env.example backend/.env

# 2. Generate secure SECRET_KEY
openssl rand -hex 32

# 3. Edit backend/.env with your values
nano backend/.env

# 4. Set a strong admin password
# Add to backend/.env:
DEFAULT_ADMIN_PASSWORD=your-very-secure-password-here

# 5. Initialize database
cd backend
python init_auth.py

# 6. Remove demo users from frontend
# Edit frontend/src/context/AuthContext.tsx
# Delete or comment out DEMO_USERS array

# 7. Verify no secrets in git
gitleaks detect

# 8. Start servers
python main.py  # backend
cd ../frontend && npm run dev  # frontend
```

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Python Dotenv](https://github.com/theskumar/python-dotenv)

---

**Remember:** Security is an ongoing process, not a one-time setup. Regularly review access logs, update dependencies, and rotate secrets.
