import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZipArchive } from 'archiver';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'dist', 'extension');
const releaseDir = path.join(root, 'dist', 'release');
const requiredFiles = [
  'manifest.json',
  'background.js',
  'adguard-content.js',
  'adguard-assistant.js',
  'filters/catalog.json'
];
await Promise.all(requiredFiles.map((file) => fsp.access(path.join(sourceDir, file))));
const manifestPath = path.join(sourceDir, 'manifest.json');
const manifest = JSON.parse(await fsp.readFile(manifestPath, 'utf8'));
await fsp.mkdir(releaseDir, { recursive: true });

const stablePath = path.join(releaseDir, 'no-cookies-ads.zip');
const versionedPath = path.join(
  releaseDir,
  `no-cookies-ads-v${manifest.version}.zip`
);

await createZip(stablePath);
await fsp.copyFile(stablePath, versionedPath);

console.log(stablePath);
console.log(versionedPath);

function createZip(destination) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destination);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', resolve);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    // Chromium caches indexed rulesets inside unpacked extension directories.
    archive.glob('**/*', { cwd: sourceDir, dot: true, skip: '_metadata' });
    void archive.finalize();
  });
}
