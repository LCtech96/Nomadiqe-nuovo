// Verifica connessione database Supabase
// Esegui: node verify-db-connection.js

const https = require('https');

const SUPABASE_URL = 'umodgqcplvwmhfagihhu.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVtb2RncWNwbHZ3bWhmYWdpaGh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk3MDU0NSwiZXhwIjoyMDgwNTQ2NTQ1fQ.Q8Vunf-4NhSntG1r2ssCoV55j68EJh8a912CMggnRw8';

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json'
};

function testTable(path, name) {
  return new Promise((resolve) => {
    const options = {
      hostname: SUPABASE_URL,
      path: path,
      method: 'GET',
      headers: headers
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            console.log(`✅ ${name}: ${Array.isArray(json) ? json.length : 'OK'} records`);
            if (Array.isArray(json) && json.length > 0) {
              console.log(`   Sample: ${JSON.stringify(json[0], null, 2).substring(0, 100)}...`);
            }
            resolve({ success: true, data: json });
          } catch (e) {
            console.log(`⚠️  ${name}: Response non-JSON`);
            resolve({ success: false, error: 'Invalid JSON' });
          }
        } else {
          console.log(`❌ ${name}: Status ${res.statusCode}`);
          console.log(`   Response: ${data.substring(0, 200)}`);
          resolve({ success: false, error: `Status ${res.statusCode}` });
        }
      });
    });

    req.on('error', (e) => {
      console.log(`❌ ${name}: ${e.message}`);
      resolve({ success: false, error: e.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`⏱️  ${name}: Timeout`);
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

(async () => {
  console.log('🔄 Verifica connessione database Supabase...\n');
  console.log(`📍 URL: https://${SUPABASE_URL}\n`);

  const results = {
    profiles: await testTable('/rest/v1/profiles?select=id,username,role&limit=3', 'Profiles'),
    posts: await testTable('/rest/v1/posts?select=id,content,creator_id&limit=3', 'Posts'),
    properties: await testTable('/rest/v1/properties?select=id,name,city&limit=3', 'Properties')
  };

  console.log('\n📊 Riepilogo:');
  const successCount = Object.values(results).filter(r => r.success).length;
  console.log(`✅ Tabelle accessibili: ${successCount}/3`);
  
  if (successCount === 3) {
    console.log('\n🎉 Connessione database verificata con successo!');
    console.log('✅ Le credenziali Service Role Key funzionano correttamente.');
  } else {
    console.log('\n⚠️  Alcune tabelle non sono accessibili. Verifica le RLS policies.');
  }
})();

