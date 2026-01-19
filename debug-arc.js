// Debug script to check ARC data structure
const testDataARC = `Резистор 10кОм


12345




Qty: 5 шт

12.34$


`;

const lines = testDataARC.split('\n');
console.log('Total lines:', lines.length);
lines.forEach((line, i) => {
    console.log(`Line ${i + 1} (block line ${(i % 12) + 1}): '${line}'`);
});
