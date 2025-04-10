
#!/usr/bin/env node

/**
 * Local CI Pipeline Runner
 * 
 * This script simulates the CI pipeline locally to catch issues before pushing to GitHub
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

// Log with timestamp
const log = (message, color = colors.reset) => {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
};

// Run a command and return the output
const run = (command, options = {}) => {
  try {
    log(`Running: ${command}`, colors.blue);
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
    return { success: true, output };
  } catch (error) {
    if (!options.ignoreError) {
      log(`Command failed: ${command}`, colors.red);
      log(error.message, colors.red);
      if (error.stdout) log(error.stdout, colors.dim);
      if (error.stderr) log(error.stderr, colors.dim);
    }
    return { success: false, error };
  }
};

// Check if package exists
const hasPackage = (packageName) => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    return packageName in (packageJson.dependencies || {}) || 
           packageName in (packageJson.devDependencies || {});
  } catch (e) {
    return false;
  }
};

// Main pipeline
async function runPipeline() {
  log('Starting local CI pipeline', colors.bright + colors.magenta);
  
  // Step 1: Check dependencies
  log('Step 1: Checking dependencies', colors.yellow);
  run('npm ci');
  
  // Step 2: Run linting
  log('Step 2: Running linting', colors.yellow);
  if (hasPackage('eslint')) {
    run('npm run lint', { ignoreError: true });
  } else {
    log('ESLint not found, skipping linting', colors.yellow);
  }
  
  // Step 3: Run tests
  log('Step 3: Running tests', colors.yellow);
  if (hasPackage('jest')) {
    run('npm test', { ignoreError: true });
  } else {
    log('Jest not found, skipping tests', colors.yellow);
  }
  
  // Step 4: Build the project
  log('Step 4: Building project', colors.yellow);
  const buildResult = run('npm run build', { ignoreError: true });
  if (!buildResult.success) {
    log('Build failed! Fix the issues before committing.', colors.bright + colors.red);
    process.exit(1);
  }
  
  // Step 5: Check bundle size
  log('Step 5: Checking bundle size', colors.yellow);
  if (fs.existsSync('./dist')) {
    const stats = {};
    let totalSize = 0;
    
    const getFilesizeInKB = (filename) => {
      const stats = fs.statSync(filename);
      return stats.size / 1024;
    };
    
    const getAllFiles = (dirPath, arrayOfFiles = []) => {
      const files = fs.readdirSync(dirPath);
      
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        if (fs.statSync(filePath).isDirectory()) {
          arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
        } else {
          arrayOfFiles.push(filePath);
          const size = getFilesizeInKB(filePath);
          stats[filePath] = size;
          totalSize += size;
        }
      });
      
      return arrayOfFiles;
    };
    
    getAllFiles('./dist');
    
    log(`Total bundle size: ${totalSize.toFixed(2)} KB`, colors.bright + 
      (totalSize > 5000 ? colors.red : colors.green));
    
    // List the 5 largest files
    log('Largest files:', colors.yellow);
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([file, size]) => {
        log(`${file}: ${size.toFixed(2)} KB`, colors.dim);
      });
  }
  
  log('Local CI pipeline completed successfully!', colors.bright + colors.green);
}

runPipeline().catch(error => {
  log(`Pipeline failed: ${error.message}`, colors.bright + colors.red);
  process.exit(1);
});
