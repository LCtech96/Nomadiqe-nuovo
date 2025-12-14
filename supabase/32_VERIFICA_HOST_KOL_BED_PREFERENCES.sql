-- ============================================
-- VERIFICA HOST_KOL_BED_PREFERENCES
-- ============================================
-- Script di verifica per controllare che tutte le colonne siano state aggiunte
-- ============================================

-- Verifica se la tabella esiste
SELECT 
    'VERIFICA ESISTENZA TABELLA' as info,
    EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'host_kol_bed_preferences'
    ) as tabella_esiste;

-- Verifica tutte le colonne della tabella host_kol_bed_preferences
SELECT 
    'COLONNE HOST_KOL_BED_PREFERENCES' as info,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'host_kol_bed_preferences'
ORDER BY ordinal_position;

-- Verifica se le nuove colonne esistono
SELECT 
    'VERIFICA NUOVE COLONNE' as info,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'host_kol_bed_preferences'
        AND column_name = 'nights_per_collaboration'
    ) THEN '✓ nights_per_collaboration esiste' ELSE '✗ nights_per_collaboration NON esiste' END as nights_per_collaboration,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'host_kol_bed_preferences'
        AND column_name = 'required_videos'
    ) THEN '✓ required_videos esiste' ELSE '✗ required_videos NON esiste' END as required_videos,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'host_kol_bed_preferences'
        AND column_name = 'required_posts'
    ) THEN '✓ required_posts esiste' ELSE '✗ required_posts NON esiste' END as required_posts,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'host_kol_bed_preferences'
        AND column_name = 'required_stories'
    ) THEN '✓ required_stories esiste' ELSE '✗ required_stories NON esiste' END as required_stories,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'host_kol_bed_preferences'
        AND column_name = 'kol_bed_months'
    ) THEN '✓ kol_bed_months esiste' ELSE '✗ kol_bed_months NON esiste' END as kol_bed_months;
