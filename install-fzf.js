#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

const FZF_VERSION = '0.58.0'; // Stable version with good release assets
const GITHUB_RELEASE_URL = `https://github.com/junegunn/fzf/releases/download/v${FZF_VERSION}`;

// Determine platform and architecture
function getPlatform() {
  const platform = process.platform;
  const arch = process.arch;

  let os, archName;

  // Map platform
  if (platform === 'win32') {
    os = 'windows';
  } else if (platform === 'darwin') {
    os = 'darwin';
  } else if (platform === 'linux') {
    os = 'linux';
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Map architecture
  if (arch === 'x64') {
    archName = 'amd64';
  } else if (arch === 'arm64') {
    archName = 'arm64';
  } else if (arch === 'arm') {
    archName = 'armv7';
  } else if (arch === 'ia32') {
    archName = '386';
  } else {
    throw new Error(`Unsupported architecture: ${arch}`);
  }

  return { os, arch: archName };
}

// Get download URL and filename
function getDownloadInfo() {
  const { os, arch } = getPlatform();

  let filename;
  if (os === 'windows') {
    filename = `fzf-${FZF_VERSION}-${os}_${arch}.zip`;
  } else {
    filename = `fzf-${FZF_VERSION}-${os}_${arch}.tar.gz`;
  }

  return {
    url: `${GITHUB_RELEASE_URL}/${filename}`,
    filename,
    isZip: os === 'windows'
  };
}

// Download file
async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading fzf from ${url}...`);

    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        downloadFile(response.headers.location, destPath)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded to ${destPath}`);
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    }).on('error', reject);
  });
}

// Extract archive
function extractArchive(archivePath, destDir, isZip) {
  console.log(`Extracting ${archivePath}...`);

  try {
    if (isZip) {
      // Windows: use PowerShell to extract
      const psCommand = `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`;
      execSync(`powershell -Command "${psCommand}"`, { stdio: 'inherit' });
    } else {
      // Unix: use tar
      execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' });
    }
    console.log('Extraction complete');
  } catch (error) {
    throw new Error(`Failed to extract archive: ${error.message}`);
  }
}

// Make file executable (Unix only)
function makeExecutable(filePath) {
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(filePath, 0o755);
      console.log(`Made ${filePath} executable`);
    } catch (error) {
      console.warn(`Warning: Could not make ${filePath} executable: ${error.message}`);
    }
  }
}

// Main installation function
async function install() {
  try {
    console.log('Installing fzf binary...');

    // Create bin directory
    const binDir = path.join(__dirname, 'bin');
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Get download info
    const { url, filename, isZip } = getDownloadInfo();
    const archivePath = path.join(binDir, filename);

    // Check if already installed
    const binaryName = process.platform === 'win32' ? 'fzf.exe' : 'fzf';
    const binaryPath = path.join(binDir, binaryName);

    if (fs.existsSync(binaryPath)) {
      console.log('fzf binary already exists, skipping download');
      return;
    }

    // Download archive
    await downloadFile(url, archivePath);

    // Extract archive
    extractArchive(archivePath, binDir, isZip);

    // Make executable (Unix)
    makeExecutable(binaryPath);

    // Verify binary exists
    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found after extraction: ${binaryPath}`);
    }

    // Clean up archive
    fs.unlinkSync(archivePath);
    console.log('Cleaned up archive file');

    console.log('✓ fzf installation complete!');
    console.log(`Binary location: ${binaryPath}`);

  } catch (error) {
    console.error('Failed to install fzf:', error.message);
    console.error('\nYou can manually install fzf using:');
    console.error('  Windows: winget install fzf');
    console.error('  macOS:   brew install fzf');
    console.error('  Linux:   apt install fzf (or your package manager)');
    console.error('\nThe MCP server will still work if fzf is in your PATH.');
    // Don't exit with error - allow installation to continue
    process.exit(0);
  }
}

// Run installation
install();
