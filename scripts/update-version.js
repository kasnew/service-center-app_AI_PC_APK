import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Formula matches Layout.tsx and updateChecker.ts
const now = new Date();
const start = new Date(now.getFullYear(), 0, 0);
const diff = (now.getTime() - start.getTime()) + ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);
const oneDay = 1000 * 60 * 60 * 24;
const dayOfYear = Math.floor(diff / oneDay);
const minutesSinceStartOfDay = now.getHours() * 60 + now.getMinutes();

const newVersion = `${now.getFullYear()}.${dayOfYear}.${minutesSinceStartOfDay}`;
const newVersionCode = parseInt(`${now.getFullYear() % 100}${dayOfYear < 100 ? '0' + dayOfYear : dayOfYear}${minutesSinceStartOfDay < 1000 ? (minutesSinceStartOfDay < 100 ? (minutesSinceStartOfDay < 10 ? '000' + minutesSinceStartOfDay : '00' + minutesSinceStartOfDay) : '0' + minutesSinceStartOfDay) : minutesSinceStartOfDay}`);
// Simplified versionCode: YYDDDMMMM where DDD is day of year and MMMM is minutes since start of day
const finalVersionCode = (now.getFullYear() % 100) * 10000000 + dayOfYear * 10000 + minutesSinceStartOfDay;

pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Updated package.json version to: ${newVersion}`);

// Update Android version
const buildGradlePath = path.join(__dirname, '..', 'android-app', 'app', 'build.gradle.kts');
if (fs.existsSync(buildGradlePath)) {
    let content = fs.readFileSync(buildGradlePath, 'utf8');

    // Update versionCode
    content = content.replace(/versionCode = \d+/, `versionCode = ${finalVersionCode}`);
    // Update versionName
    content = content.replace(/versionName = "[^"]+"/, `versionName = "${newVersion}"`);

    fs.writeFileSync(buildGradlePath, content);
    console.log(`Updated Android build.gradle.kts to version: ${newVersion} (${finalVersionCode})`);
}
