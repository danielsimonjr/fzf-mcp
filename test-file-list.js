const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function test() {
  try {
    const directory = 'c:/mcp-servers';

    // Test different commands
    console.log('Testing PowerShell...');
    const psCommand = `powershell -Command "Get-ChildItem -Path '${directory}' -Recurse -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName"`;
    const { stdout: psOut } = await execAsync(psCommand, { maxBuffer: 10 * 1024 * 1024 });
    console.log('PowerShell stdout length:', psOut.length);
    console.log('First file:', psOut.split('\n')[0]);

    console.log('\nTesting find command...');
    const findCommand = `find "${directory}" -type f 2>/dev/null`;
    const { stdout: findOut } = await execAsync(findCommand);
    console.log('Find stdout length:', findOut.length);
    console.log('First file:', findOut.split('\n')[0]);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

test();
