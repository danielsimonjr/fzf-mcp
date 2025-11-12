// Direct test of the getFileList function
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getFileList(directory = ".", maxDepth = 10) {
  try {
    let command;
    if (process.platform === 'win32') {
      // Windows: use PowerShell to list files recursively
      command = `powershell -Command "Get-ChildItem -Path '${directory}' -Recurse -File -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName"`;
    } else {
      // Unix: use find command
      command = `find "${directory}" -type f 2>/dev/null`;
    }

    console.log('Executing command:', command);
    const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
    console.log('Got stdout, length:', stdout.length);
    console.log('Is truthy?', !!stdout);
    console.log('First 200 chars:', stdout.substring(0, 200));
    return stdout;
  } catch (error) {
    console.log('Error in getFileList:', error.message);
    // If commands fail, return empty string
    return "";
  }
}

async function test() {
  const fileList = await getFileList('c:/mcp-servers');
  console.log('\nFinal fileList truthy?', !!fileList);
  console.log('FileList length:', fileList.length);
}

test();
