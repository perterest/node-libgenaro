'use strict';

const { execSync } = require('child_process');
const stdout = process.stdout;
const stderr = process.stderr;
const path = require('path');
const fs = require('fs');
const basedir = path.resolve(__dirname);
const libgenaro = require('./package.json').libgenaro;
const releases = libgenaro.releases;
const arch = process.arch;
const platform = process.platform;

if(platform !== 'win32'){
  let installed = true;
  try {
    execSync('pkg-config --exists libgenaro');
  } catch (e) {
    installed = false;
  }

  if (installed) {
    stdout.write(`Skipping download of libgenaro, already installed.\n`);
    process.exit(0);
  }
}

const baseUrl = libgenaro.baseUrl;
const filePath = libgenaro.basePath;
let filePathAbsolute = path.resolve(basedir, './' + filePath);

let checksum = null;
let filename = null;
let sha256sum = (platform === 'darwin') ? 'shasum -a 256' : 'sha256sum';

for (var i = 0; i < releases.length; i++) {
  if (releases[i].arch === arch && releases[i].platform === platform) {
    filename = releases[i].filename;
    checksum = releases[i].checksum;
  }
}

if (!filename) {
  stderr.write(`Unable to download libgenaro for platform: ${platform} and arch: ${arch}\n`);
  process.exit(1);
}

const url = baseUrl + '/' + filename;
let target = path.resolve(basedir, './' + filename);
const download = `curl --location --fail --connect-timeout 120 --retry 3 -o "${target}" "${url}"`
const hasher = `${sha256sum} ${target} | awk '{print $1}'`

if (fs.existsSync(target)) {
  stdout.write(`Already downloaded libgenaro \n  at: ${target}\n`);
} else {
  stdout.write(`Downloading libgenaro \n  from: ${url} \n  to: ${target}\n`);
  execSync(download);
}

const hashbuf = execSync(hasher);
const hash = hashbuf.toString().trim();
if (hash === checksum) {
  stdout.write(`Verified libgenaro: \n  file: ${target}\n  hash: ${checksum}\n`);
} else {
  stderr.write(`Unable to verify libgenaro release: ${target} \n  expect: ${checksum}\n  actual: ${hash}\n`);
  process.exit(1);
}

stdout.write(`Extracting target: ${target}\n`);

if(platform !== 'win32'){
  const extract = `tar -xzf ${target} -C ${filePathAbsolute}`;
  execSync(`rm -rf ${filePathAbsolute}`);
  execSync(`mkdir ${filePathAbsolute}`);
  execSync(extract);
}
else{
  target = target.replace(/\\/g, "/");
  target = target.replace(/^([a-z]):/i, "/$1");
  let tempFilePathAbsolute = filePathAbsolute.replace(/\\/g, "/");
  filePathAbsolute = tempFilePathAbsolute.replace(/^([a-z]):/i, "/$1");

  const extract = `tar -xzf ${target} -C ${filePathAbsolute}`;
  execSync(`rm -rf ${tempFilePathAbsolute}`);
  fs.mkdirSync(`${tempFilePathAbsolute}`);
  execSync(extract);
}

process.exit(0);
