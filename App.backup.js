/**
 * BACKUP DI SICUREZZA - NOMADIQE
 * 
 * Data backup: ${new Date().toISOString()}
 * Repository: https://github.com/LCtech96/Nomadiqe-nuovo.git
 * 
 * Questo file contiene informazioni sul backup del codice.
 * Il codice completo è salvato nella repository GitHub sopra indicata.
 * 
 * Per ripristinare il codice:
 * 1. Clona la repository: git clone https://github.com/LCtech96/Nomadiqe-nuovo.git
 * 2. Controlla il commit specifico: git checkout <commit-hash>
 * 
 * Struttura del progetto:
 * - app/ : Applicazione Next.js (pagine e API routes)
 * - components/ : Componenti React riutilizzabili
 * - lib/ : Librerie e utilità
 * - supabase/ : Script SQL e migrazioni database
 * - public/ : File statici
 * - types/ : Definizioni TypeScript
 * - hooks/ : React hooks personalizzati
 * 
 * Tecnologie principali:
 * - Next.js 14
 * - TypeScript
 * - Tailwind CSS
 * - Supabase
 * - NextAuth.js
 * - React Leaflet
 * 
 * IMPORTANTE:
 * - Tutti i file di codice sono versionati in Git
 * - Le variabili d'ambiente sono in .env.local (non committato per sicurezza)
 * - Il backup completo è disponibile su GitHub
 */

const BACKUP_INFO = {
  timestamp: new Date().toISOString(),
  repository: "https://github.com/LCtech96/Nomadiqe-nuovo.git",
  branch: "main",
  description: "Backup completo del codice Nomadiqe",
  structure: {
    app: "Applicazione Next.js - pagine e API routes",
    components: "Componenti React riutilizzabili",
    lib: "Librerie e utilità",
    supabase: "Script SQL e migrazioni database",
    public: "File statici",
    types: "Definizioni TypeScript",
    hooks: "React hooks personalizzati"
  },
  technologies: [
    "Next.js 14",
    "TypeScript",
    "Tailwind CSS",
    "Supabase",
    "NextAuth.js",
    "React Leaflet",
    "Vercel Blob"
  ],
  restoreInstructions: [
    "1. Clona la repository: git clone https://github.com/LCtech96/Nomadiqe-nuovo.git",
    "2. Installa le dipendenze: pnpm install",
    "3. Configura le variabili d'ambiente in .env.local",
    "4. Avvia il server: pnpm dev"
  ]
}

// Esporta le informazioni di backup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BACKUP_INFO
}

// Log delle informazioni di backup
console.log('=== BACKUP NOMADIQE ===')
console.log('Timestamp:', BACKUP_INFO.timestamp)
console.log('Repository:', BACKUP_INFO.repository)
console.log('Branch:', BACKUP_INFO.branch)
console.log('========================')
