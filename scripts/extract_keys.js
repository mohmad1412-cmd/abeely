
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error("File not found:", envPath);
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  lines.forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
      env[match[1].trim()] = value;
    }
  });
  
  // Clean up sensitive data before writing? No, this is for debugging in a secure sandbox.
  fs.writeFileSync('keys.json', JSON.stringify(env, null, 2));
  console.log("Keys extracted to keys.json");
} catch (error) {
  console.error("Error:", error);
}
