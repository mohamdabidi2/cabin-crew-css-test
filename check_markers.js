const fs = require('fs');

const files = [
    'CABIN CREW QUESTIONS  1.txt',
    'CABIN CREW QUESTIONS  2.txt',
    'CABIN CREW QUESTIONS  3.txt',
    'CABIN CREW QUESTIONS  4.txt'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    const content = fs.readFileSync(file, 'utf8');

    // Find options and the character immediately following them
    const matches = content.matchAll(/([A-D])\s+([^\w\s])\s+/g);
    const markers = {};
    for (const match of matches) {
        const char = match[2];
        markers[char] = (markers[char] || 0) + 1;
    }

    console.log(`Markers in ${file}:`, markers);
});
