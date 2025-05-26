const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to run the browser
function runBrowser() {
  console.log('Starting Electron Browser...');
  
  try {
    const electronProcess = spawn('electron', ['.'], {
      stdio: 'inherit',
      shell: true
    });
    
    electronProcess.on('error', (error) => {
      console.error('Failed to start electron browser:', error);
    });
    
    electronProcess.on('close', (code) => {
      console.log(`Electron browser exited with code ${code}`);
    });
    
    return electronProcess;
  } catch (error) {
    console.error('Error running browser:', error);
    return null;
  }
}

// Function to build the installer
function buildInstaller() {
  console.log('Building Electron Browser installer...');
  
  try {
    // Ensure the build directory exists
    const buildDir = path.join(__dirname, 'dist');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // Run the installer script
    execSync('node build/installer.js', { stdio: 'inherit' });
    
    console.log('Installer build process completed');
    return true;
  } catch (error) {
    console.error('Error building installer:', error);
    return false;
  }
}

// Main function
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'run':
      runBrowser();
      break;
      
    case 'build':
      buildInstaller();
      break;
      
    default:
      console.log(`
Electron Browser Build Tool
--------------------------
Usage:
  node build-installer.js [command]

Commands:
  run    - Run the Electron browser for testing
  build  - Build the Windows installer (MSI and NSIS)
      `);
      break;
  }
}

// Run the script
main();