# 🔄 Auto-Version & Auto-Commit System

## ✅ AUTOMATIC VERSION INCREMENT + GIT COMMIT ON EVERY REBUILD

This system ensures you **NEVER FORGET** to update versions or commit changes before rebuilding.

---

## 🚀 How It Works

### Every time you rebuild (any method), the system automatically:

1. ✅ **Increments version number** (v2.2.32 → v2.2.33)
2. ✅ **Updates `frontend/src/config/version.ts`**
3. ✅ **Commits to git** with message: `🔄 Auto-increment version to vX.X.X (rebuild safety)`
4. ✅ **Then proceeds with rebuild**

---

## 📋 Affected Tasks (All rebuild tasks now auto-version):

- **� LOCALHOST: Rebuild & Start All Containers**
- **🏗️ Build Frontend**
- **⚡ QUICK: Rebuild Localhost After Changes**
- **🚀 AUTO-VERSION: Build & Deploy (Quick)**
- **🔄 AUTO-VERSION: Rebuild Docker (Full)**
- **🔢 AUTO-VERSION: Increment Version Number** (manual)

---

## 🎯 Benefits

### Safety First
- ✅ **Never lose track of versions** - every rebuild = new version
- ✅ **Auto git commit** - safety backup before every build
- ✅ **Traceable changes** - git history shows exact rebuild timeline

### Zero Effort
- ✅ **Completely automatic** - no manual steps required
- ✅ **Works in background** - you don't even notice it
- ✅ **No extra commands** - just rebuild as normal

### Production Ready
- ✅ **Easy rollback** - git history has every version
- ✅ **Version tracking** - know exactly which build is deployed
- ✅ **Audit trail** - see when each rebuild happened

---

## 📂 Files Involved

### 1. `.vscode/auto-version-and-commit.ps1`
Main script that:
- Reads current version from `frontend/src/config/version.ts`
- Increments patch number (e.g., v2.2.32 → v2.2.33)
- Updates version file
- Commits to git

### 2. `.vscode/tasks.json`
All rebuild tasks now call `.vscode/auto-version-and-commit.ps1` before building.

### 3. `.vscode/settings.json`
VS Code settings to ensure git operations work smoothly.

---

## 🔍 Example Output

When you rebuild, you'll see:

```
✅ Version auto-incremented to v2.2.33
📝 Auto-committing to git...
✅ Git commit successful

🔨 Rebuilding localhost...
```

---

## 🛠️ Manual Version Increment

If you just want to increment version **without rebuilding**:

1. Run task: **🔢 AUTO-VERSION: Increment Version Number**
2. Or run: `.vscode\auto-version-and-commit.ps1`

---

## ⚙️ How to Disable (if needed)

If you ever need to temporarily disable auto-versioning:

1. Open `.vscode/tasks.json`
2. Remove `.vscode\\auto-version-and-commit.ps1;` from task commands
3. The old behavior will return

---

## 📊 Git Commit Format

Every auto-commit follows this format:

```
🔄 Auto-increment version to v2.2.33 (rebuild safety)
```

This makes it easy to identify automated version bumps in git history.

---

## 🎉 Result

**You can now rebuild anytime without worrying about:**
- ❌ Forgetting to update version
- ❌ Losing track of which build is which
- ❌ Missing git commits before rebuilds
- ❌ Version conflicts between localhost and production

Everything is **AUTOMATIC** and **SAFE**! 🚀

---

## 🔗 Related Files

- Version file: `frontend/src/config/version.ts`
- Auto-version script: `.vscode/auto-version-and-commit.ps1`
- Tasks config: `.vscode/tasks.json`
- Git settings: `.vscode/settings.json`
