# New Mac Setup — Refactor Athletics

## 1. Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
After install, follow the instructions it prints to add brew to your PATH.

## 2. Install Node.js (v22)
```bash
brew install node@22
```
Verify:
```bash
node -v   # should show v22.x
npm -v    # should show 11.x
```

## 3. Install Git (newer than Apple's built-in)
```bash
brew install git
```

## 4. Configure Git
```bash
git config --global user.name "chino4242"
git config --global user.email "ryanj.contino@gmail.com"
```

## 5. Set up GitHub SSH key (recommended)
```bash
ssh-keygen -t ed25519 -C "ryanj.contino@gmail.com"
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```
Copy the output → go to https://github.com/settings/keys → New SSH key → paste it.

## 6. Clone the repo
```bash
cd ~/Documents
git clone git@github.com:chino4242/refactor-athletics.git
cd refactor-athletics
```

## 7. Install dependencies
```bash
npm install
```

## 8. Create `.env.local`
Copy this file from your old Mac. It lives at:
```
~/Documents/refactor-athletics/.env.local
```

It contains these keys (grab values from old Mac or Supabase dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
USDA_API_KEY=
```

Easiest way: on your OLD Mac, run:
```bash
cat ~/Documents/refactor-athletics/.env.local | pbcopy
```
Then on your NEW Mac, run:
```bash
pbpaste > ~/Documents/refactor-athletics/.env.local
```

## 9. Verify everything works
```bash
npm run dev        # should start on http://localhost:3000
npm test           # should pass 182+ tests
```

## 10. Install your editor
```bash
brew install --cask visual-studio-code
```

## 11. Install Kiro CLI
Follow the install instructions from your Kiro setup.

## Done!
You're ready to develop. All branches are on GitHub — `git pull` gets you current.
