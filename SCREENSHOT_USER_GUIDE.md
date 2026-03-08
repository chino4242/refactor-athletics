# 📸 Screenshot Upload - User Guide

## How to Use Screenshot Upload

### 🥗 Nutrition Tracking

1. **Open the Nutrition Log Modal**
   - Go to the Track page
   - Click the "🥗 Log Nutrition" button in the Daily Quest section

2. **Upload Screenshot**
   - Look for the **"Upload Screenshot"** button at the top of the modal
   - Click it and select a screenshot from:
     - MyFitnessPal daily summary
     - Cronometer nutrition log
     - Any nutrition tracking app

3. **Review & Log**
   - The form fields will auto-fill with extracted data
   - Review the numbers (protein, carbs, fat, water)
   - Click individual LOG buttons to save

### 🏋️ Workout Tracking

1. **Go to Training Page**
   - Navigate to the Training/Workout page

2. **Upload Screenshot**
   - Look for the **"Upload Screenshot"** button below "TRAINING LOG" header
   - Click it and select a workout screenshot from:
     - Strong app
     - Apple Fitness
     - Any workout tracking app

3. **Review & Log**
   - Exercises will automatically be added to your session queue
   - Sets and reps will be pre-filled
   - Click "Complete Session" to save all exercises

## 📱 Best Screenshot Practices

### For Nutrition:
- ✅ Capture the full daily summary screen
- ✅ Make sure macro numbers are clearly visible
- ✅ Include protein, carbs, fat, and water if possible
- ❌ Avoid blurry or cropped screenshots

### For Workouts:
- ✅ Capture the complete workout summary
- ✅ Include exercise names, sets, reps, and weights
- ✅ One workout per screenshot works best
- ❌ Avoid screenshots with overlapping text

## 🎯 What Gets Extracted

### Nutrition Screenshot → Auto-fills:
- Protein (grams)
- Carbs (grams)
- Fat (grams)
- Water (ounces)
- Calories (auto-calculated)

### Workout Screenshot → Auto-fills:
- Exercise names (matched to your catalog)
- Number of sets
- Reps per set
- Weight per set

## 💡 Tips

1. **Take clear screenshots** - Better image quality = better accuracy
2. **Review before logging** - Always check the extracted data
3. **Edit if needed** - You can manually adjust any auto-filled values
4. **Works with most apps** - MyFitnessPal, Strong, Apple Fitness, Fitbit, etc.

## 🔧 Troubleshooting

**"Upload Screenshot" button not visible?**
- Make sure you've added your `ANTHROPIC_API_KEY` to `.env.local`
- Restart your dev server after adding the key

**Data not extracting correctly?**
- Try a clearer screenshot
- Make sure text is readable and not cut off
- Check that the app language is English

**Exercise not matching?**
- The system tries to match exercise names to your catalog
- If no match found, it won't add that exercise
- You can manually add it using the search dropdown

## 💰 Cost
- ~$0.003 per screenshot
- First $5 free with new Anthropic account
- Typical usage: $1-2/month

## 🆘 Need Help?
If the screenshot upload isn't working, you can always manually enter your data using the regular input fields.
