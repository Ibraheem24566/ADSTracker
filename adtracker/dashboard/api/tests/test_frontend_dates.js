// Test what the frontend sends to the API

function todayMinus(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

console.log('Testing frontend date generation:');
console.log(`todayMinus(7): ${todayMinus(7)}`);
console.log(`todayMinus(0): ${todayMinus(0)}`);

// Test what happens when HTML date input sends a value
const testInput = '2026-07-23';
console.log(`\nHTML date input sends: ${testInput}`);
console.log(`Type: ${typeof testInput}`);

// Test if there's any conversion happening
const dateObj = new Date(testInput);
console.log(`new Date('${testInput}'): ${dateObj.toISOString()}`);
console.log(`toISOString().slice(0,10): ${dateObj.toISOString().slice(0,10)}`);

// The issue might be that the frontend is converting the date input value
// Let's check if the API receives the correct string
console.log('\n--- Expected behavior ---');
console.log('User selects: 2026-07-23 in date input');
console.log('Frontend should send: from=2026-07-23');
console.log('API should receive: "2026-07-23" (string)');
console.log('Database query should return: 2026-07-23 data');
