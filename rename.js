const fs = require('fs');
let content = fs.readFileSync('src/components/WorkoutBuilder.tsx', 'utf8');

content = content.replace(/WorkoutProgram/g, 'Workout');
content = content.replace(/Program/g, 'Workout');
content = content.replace(/program/g, 'workout');

fs.writeFileSync('src/components/WorkoutBuilder.tsx', content);
console.log('Renamed successfully');
