# 📸 Screenshot Upload - Quick Start

## Where to Find the Upload Buttons

### 1. Nutrition Tracking 🥗

**Location:** Track Page → Daily Quest Section → "Log Nutrition" Modal

```
┌─────────────────────────────────────┐
│  🥗 Log Nutrition              ✕    │
├─────────────────────────────────────┤
│  📤 Upload Screenshot               │  ← CLICK HERE
│  [Upload icon] Upload Screenshot    │
├─────────────────────────────────────┤
│  [+] Add to Total  [=] Set Total    │
│                                     │
│  🍞 Carbs (g)    🥑 Fat (g)        │
│  [input] [LOG]   [input] [LOG]     │
│                                     │
│  🥩 Protein (g)                     │
│  [input] [LOG]                      │
└─────────────────────────────────────┘
```

**Steps:**
1. Go to **Track** page
2. Click **"🥗 Log Nutrition"** button
3. Look for **"Upload Screenshot"** button at the top
4. Click → Select MyFitnessPal/nutrition app screenshot
5. Wait 2-3 seconds for parsing
6. Review auto-filled values
7. Click LOG buttons to save

---

### 2. Workout Tracking 🏋️

**Location:** Training Page → Below "TRAINING LOG" Header

```
┌─────────────────────────────────────┐
│  TRAINING LOG                       │
│  Build Your Session                 │
│                                     │
│  📤 Upload Screenshot               │  ← CLICK HERE
│  [Upload icon] Upload Screenshot    │
│                                     │
│  [Search exercises...]         📊   │
│                                     │
│  Selected Exercise: Bench Press     │
│  [Add Set] [Remove Set]             │
└─────────────────────────────────────┘
```

**Steps:**
1. Go to **Training** page
2. Look for **"Upload Screenshot"** button below the header
3. Click → Select workout app screenshot (Strong, Apple Fitness, etc.)
4. Wait 2-3 seconds for parsing
5. Exercises automatically added to session queue
6. Review and click **"Complete Session"**

---

## 🎯 What You'll See

### When Uploading:
```
┌─────────────────────────────────┐
│  [⟳] Parsing...                 │  ← Loading state
└─────────────────────────────────┘
```

### After Upload (Nutrition):
```
🥩 Protein (g)
[150] [LOG]  ← Auto-filled!

🍞 Carbs (g)
[200] [LOG]  ← Auto-filled!

🥑 Fat (g)
[65] [LOG]   ← Auto-filled!
```

### After Upload (Workout):
```
Session Queue:
✓ Bench Press - 3 sets added
✓ Squat - 4 sets added
✓ Deadlift - 3 sets added

[Complete Session]
```

---

## 🚀 First Time Setup

**Before you can use screenshot upload:**

1. **Get Anthropic API Key**
   - Visit: https://console.anthropic.com
   - Sign up (free $5 credit)
   - Go to: API Keys → Create Key
   - Copy the key (starts with `sk-ant-`)

2. **Add to `.env.local`**
   ```bash
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Restart Dev Server**
   ```bash
   npm run dev
   ```

4. **Test It!**
   - Take a screenshot of MyFitnessPal
   - Go to Track → Log Nutrition
   - Click "Upload Screenshot"
   - Select your screenshot
   - Watch the magic! ✨

---

## 📱 Supported Apps

### Nutrition:
- ✅ MyFitnessPal
- ✅ Cronometer
- ✅ Lose It!
- ✅ Fitbit
- ✅ Any nutrition tracking app

### Workouts:
- ✅ Strong
- ✅ Apple Fitness
- ✅ Fitbod
- ✅ JEFIT
- ✅ Any workout tracking app

---

## ❓ Troubleshooting

**Don't see the button?**
- Check that `ANTHROPIC_API_KEY` is in `.env.local`
- Restart your dev server
- Hard refresh browser (Cmd+Shift+R)

**Button not working?**
- Check browser console for errors
- Verify API key is valid
- Make sure image file is < 5MB

**Data not accurate?**
- Use clearer screenshots
- Make sure text is readable
- Try cropping to just the relevant section

---

## 💡 Pro Tips

1. **Screenshot the summary page** - Not individual food items
2. **Include all macros** - Protein, carbs, fat in one view
3. **Good lighting** - Clear, readable text
4. **Landscape mode** - Often captures more data
5. **Review before saving** - Always double-check extracted values

---

## 🎉 You're Ready!

The screenshot upload feature saves you time by automatically extracting data from your favorite fitness apps. No more manual typing!

**Cost:** ~$0.003 per screenshot (~$1-2/month for daily use)
