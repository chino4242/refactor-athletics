const fs = require('fs');
let text = fs.readFileSync('src/components/WorkoutBuilder.tsx', 'utf8');

text = text.replace(/WorkoutBlocks/g, 'workoutBlocks');
text = text.replace(/Workout\.id/g, 'workout.id');
text = text.replace(/Workout\.name/g, 'workout.name');
text = text.replace(/Workout\.description/g, 'workout.description');
text = text.replace(/\(Workout\)/g, '(workout)');

fs.writeFileSync('src/components/WorkoutBuilder.tsx', text);
console.log('Fixed');
