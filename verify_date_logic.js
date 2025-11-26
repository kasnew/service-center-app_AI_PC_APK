const JDN_EPOCH = 2440587.5;
const MS_PER_DAY = 86400 * 1000;

function toJsDate(jdn) {
    if (!jdn) return null;
    const timestamp = (jdn - JDN_EPOCH) * MS_PER_DAY;
    return new Date(timestamp).toISOString();
}

function toDelphiDate(isoDate) {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return null;
    const timestamp = date.getTime();
    return (timestamp / MS_PER_DAY) + JDN_EPOCH;
}

// Test cases
// 2025-11-26 is approx JDN 2461006
const testVal = 2461006.5;
const jsDate = toJsDate(testVal);
console.log(`JDN: ${testVal} -> JS: ${jsDate}`);

const backToJdn = toDelphiDate(jsDate);
console.log(`JS: ${jsDate} -> JDN: ${backToJdn}`);

if (Math.abs(testVal - backToJdn) < 0.00001) {
    console.log('SUCCESS: Conversion is reversible.');
} else {
    console.log('FAILURE: Conversion mismatch.');
}

// Test Epoch
const epoch = toJsDate(2440587.5);
console.log(`JDN: 2440587.5 -> JS: ${epoch}`);
