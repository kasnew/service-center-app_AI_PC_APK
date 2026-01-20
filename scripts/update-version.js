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

pkg.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Updated package.json version to: ${newVersion}`);
