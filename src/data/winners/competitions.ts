// Every competition on the Team of Winners wheel and who holds it right now (as of November 2026).
// To refresh: change `winner` / `edition` when a new edition finishes, and add the team's squad if it's new.

export type Region = 'England' | 'Spain' | 'Italy' | 'Germany' | 'France' | 'Portugal' | 'Netherlands' | 'Turkey' | 'Saudi Arabia' | 'Brazil' | 'Clubs' | 'Nations'
export type Competition = { id: string; name: string; short: string; region: Region; winner: string; edition: string; note?: string }

const c = (id: string, name: string, short: string, region: Region, winner: string, edition: string, note?: string): Competition =>
  ({ id, name, short, region, winner, edition, note })

export const COMPETITIONS: Competition[] = [
  c('premier-league', 'Premier League', 'PL', 'England', 'arsenal', '2025-26'),
  c('fa-cup', 'FA Cup', 'FA Cup', 'England', 'man-city', '2025-26'),
  c('efl-cup', 'Carabao Cup', 'Carabao', 'England', 'man-city', '2025-26'),
  c('community-shield', 'Community Shield', 'Shield', 'England', 'arsenal', '2026'),
  c('la-liga', 'La Liga', 'La Liga', 'Spain', 'barcelona', '2025-26'),
  c('copa-del-rey', 'Copa del Rey', 'Copa', 'Spain', 'real-sociedad', '2025-26'),
  c('supercopa', 'Supercopa de España', 'Supercopa', 'Spain', 'barcelona', '2026'),
  c('serie-a', 'Serie A', 'Serie A', 'Italy', 'inter', '2025-26'),
  c('coppa-italia', 'Coppa Italia', 'Coppa', 'Italy', 'inter', '2025-26'),
  c('supercoppa', 'Supercoppa Italiana', 'Supercoppa', 'Italy', 'napoli', '2025-26'),
  c('bundesliga', 'Bundesliga', 'Bundesliga', 'Germany', 'bayern', '2025-26'),
  c('dfb-pokal', 'DFB-Pokal', 'Pokal', 'Germany', 'bayern', '2025-26'),
  c('dfl-supercup', 'DFL-Supercup', 'Supercup', 'Germany', 'bayern', '2026'),
  c('ligue-1', 'Ligue 1', 'Ligue 1', 'France', 'psg', '2025-26'),
  c('coupe-de-france', 'Coupe de France', 'Coupe', 'France', 'lens', '2025-26'),
  c('trophee-des-champions', 'Trophée des Champions', 'Trophée', 'France', 'lens', '2026'),
  c('liga-portugal', 'Liga Portugal', 'Liga PT', 'Portugal', 'porto', '2025-26'),
  c('taca-de-portugal', 'Taça de Portugal', 'Taça', 'Portugal', 'torreense', '2025-26'),
  c('taca-da-liga', 'Taça da Liga', 'Taça Liga', 'Portugal', 'vitoria-guimaraes', '2025-26'),
  c('supertaca', 'Supertaça', 'Supertaça', 'Portugal', 'porto', '2026'),
  c('eredivisie', 'Eredivisie', 'Eredivisie', 'Netherlands', 'psv', '2025-26'),
  c('knvb-cup', 'KNVB Cup', 'KNVB', 'Netherlands', 'az', '2025-26'),
  c('johan-cruyff-shield', 'Johan Cruyff Shield', 'JC Shield', 'Netherlands', 'az', '2026'),
  c('super-lig', 'Süper Lig', 'Süper Lig', 'Turkey', 'galatasaray', '2025-26'),
  c('turkish-cup', 'Turkish Cup', 'TR Cup', 'Turkey', 'trabzonspor', '2025-26'),
  c('turkish-super-cup', 'Turkish Super Cup', 'TR Super', 'Turkey', 'fenerbahce', '2025'),
  c('saudi-pro-league', 'Saudi Pro League', 'SPL', 'Saudi Arabia', 'al-nassr', '2025-26'),
  c('kings-cup', "King's Cup", "King's Cup", 'Saudi Arabia', 'al-hilal', '2025-26'),
  c('saudi-super-cup', 'Saudi Super Cup', 'SA Super', 'Saudi Arabia', 'al-ahli', '2025'),
  c('brasileirao', 'Brasileirão', 'Brasileirão', 'Brazil', 'flamengo', '2025'),
  c('copa-do-brasil', 'Copa do Brasil', 'Copa BR', 'Brazil', 'corinthians', '2025'),
  c('supercopa-do-brasil', 'Supercopa do Brasil', 'Supercopa BR', 'Brazil', 'corinthians', '2026'),
  c('ucl', 'Champions League', 'UCL', 'Clubs', 'psg', '2025-26'),
  c('uel', 'Europa League', 'UEL', 'Clubs', 'aston-villa', '2025-26'),
  c('uecl', 'Conference League', 'UECL', 'Clubs', 'crystal-palace', '2025-26'),
  c('club-world-cup', 'Club World Cup', 'CWC', 'Clubs', 'chelsea', '2025'),
  c('libertadores', 'Copa Libertadores', 'Libertadores', 'Clubs', 'flamengo', '2025'),
  c('world-cup', 'World Cup', 'World Cup', 'Nations', 'spain', '2026'),
  c('euros', 'European Championship', 'Euros', 'Nations', 'spain', '2024'),
  c('copa-america', 'Copa América', 'Copa Am.', 'Nations', 'argentina', '2024'),
  c('afcon', 'Africa Cup of Nations', 'AFCON', 'Nations', 'morocco', '2025', 'Awarded to Morocco by the CAF Appeal Board after Senegal walked off in the final'),
  c('nations-league', 'Nations League', 'Nations Lg', 'Nations', 'portugal', '2025'),
]
