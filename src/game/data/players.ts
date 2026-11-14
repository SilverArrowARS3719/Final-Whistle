import { KEEPERS_AND_DEFENDERS } from './rows/defenders'
import { MIDFIELDERS } from './rows/midfielders'
import { ATTACKERS } from './rows/attackers'
import { DEPTH } from './rows/depth'
import { WORLD_CUP_WINNERS } from './honours'

export type Pos =
  | 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB'
  | 'CDM' | 'CM' | 'LM' | 'RM' | 'CAM' | 'LW' | 'RW' | 'ST'

export type Player = {
  id: number
  name: string
  ovr: number // prime rating, never current
  positions: Pos[] // first = natural position
  nation: string
  clubs: string[]
  leagues: string[]
  era: string // decade of prime, e.g. "00s"
  wc: boolean // was in a World Cup-winning squad
}

const LEAGUES: Record<string, string> = {
  PL: 'Premier League', LL: 'La Liga', SA: 'Serie A', BL: 'Bundesliga', L1: 'Ligue 1',
  LP: 'Liga Portugal', ED: 'Eredivisie', MLS: 'MLS', BR: 'Brasileirão', AR: 'Argentine Primera',
  SU: 'Soviet Top League', HU: 'Hungarian NB I', SPL: 'Scottish Premiership', TR: 'Süper Lig', SAU: 'Saudi Pro League',
}

// name, prime OVR, positions, nation, clubs, leagues, era
export type Row = [string, number, string, string, string, string, string]

const ROWS: Row[] = [
  // Goalkeepers
  ['Lev Yashin', 91, 'GK', 'Soviet Union', 'Dynamo Moscow', 'SU', '60s'],
  ['Gianluigi Buffon', 92, 'GK', 'Italy', 'Juventus|Parma', 'SA', '00s'],
  ['Manuel Neuer', 92, 'GK', 'Germany', 'Bayern Munich|Schalke', 'BL', '10s'],
  ['Iker Casillas', 91, 'GK', 'Spain', 'Real Madrid|Porto', 'LL|LP', '00s'],
  ['Peter Schmeichel', 90, 'GK', 'Denmark', 'Manchester United', 'PL', '90s'],
  ['Jan Oblak', 90, 'GK', 'Slovenia', 'Atlético Madrid|Benfica', 'LL|LP', '10s'],
  ['Alisson', 90, 'GK', 'Brazil', 'Liverpool|Roma', 'PL|SA', '20s'],
  ['Thibaut Courtois', 90, 'GK', 'Belgium', 'Real Madrid|Chelsea|Atlético Madrid', 'LL|PL', '20s'],
  ['Edwin van der Sar', 89, 'GK', 'Netherlands', 'Ajax|Manchester United|Juventus', 'ED|PL|SA', '00s'],
  ['Gianluigi Donnarumma', 88, 'GK', 'Italy', 'AC Milan|PSG|Manchester City', 'SA|L1|PL', '20s'],
  ['Diogo Costa', 84, 'GK', 'Portugal', 'Porto', 'LP', '20s'],
  ['Guglielmo Vicario', 79, 'GK', 'Italy', 'Tottenham', 'PL|SA', '20s'],
  ['Bart Verbruggen', 78, 'GK', 'Netherlands', 'Brighton|Anderlecht', 'PL', '20s'],

  // Centre-backs
  ['Franz Beckenbauer', 94, 'CB,CDM', 'Germany', 'Bayern Munich|New York Cosmos', 'BL', '70s'],
  ['Paolo Maldini', 94, 'CB,LB', 'Italy', 'AC Milan', 'SA', '90s'],
  ['Franco Baresi', 93, 'CB', 'Italy', 'AC Milan', 'SA', '80s'],
  ['Fabio Cannavaro', 91, 'CB', 'Italy', 'Juventus|Real Madrid|Inter|Parma', 'SA|LL', '00s'],
  ['Sergio Ramos', 91, 'CB,RB', 'Spain', 'Real Madrid|Sevilla|PSG', 'LL|L1', '10s'],
  ['Virgil van Dijk', 91, 'CB', 'Netherlands', 'Liverpool|Celtic|Southampton', 'PL|SPL', '10s'],
  ['Alessandro Nesta', 90, 'CB', 'Italy', 'AC Milan|Lazio', 'SA', '00s'],
  ['Carles Puyol', 89, 'CB,RB', 'Spain', 'Barcelona', 'LL', '00s'],
  ['Thiago Silva', 89, 'CB', 'Brazil', 'PSG|AC Milan|Chelsea', 'L1|SA|PL', '10s'],
  ['Marcel Desailly', 88, 'CB,CDM', 'France', 'AC Milan|Chelsea|Marseille', 'SA|PL|L1', '90s'],
  ['Lilian Thuram', 88, 'CB,RB', 'France', 'Juventus|Parma|Barcelona|Monaco', 'SA|LL|L1', '90s'],
  ['Rio Ferdinand', 88, 'CB', 'England', 'Manchester United|Leeds United|West Ham', 'PL', '00s'],
  ['John Terry', 88, 'CB', 'England', 'Chelsea', 'PL', '00s'],
  ['Nemanja Vidić', 88, 'CB', 'Serbia', 'Manchester United', 'PL', '00s'],
  ['Rúben Dias', 88, 'CB', 'Portugal', 'Manchester City|Benfica', 'PL|LP', '20s'],
  ['Pepe', 87, 'CB', 'Portugal', 'Real Madrid|Porto', 'LL|LP', '10s'],
  ['William Saliba', 87, 'CB', 'France', 'Arsenal|Marseille', 'PL|L1', '20s'],
  ['Marquinhos', 87, 'CB,CDM', 'Brazil', 'PSG|Roma', 'L1|SA', '20s'],
  ['Joško Gvardiol', 85, 'CB,LB', 'Croatia', 'Manchester City|RB Leipzig', 'PL|BL', '20s'],
  ['Pau Cubarsí', 79, 'CB', 'Spain', 'Barcelona', 'LL', '20s'],
  ['Murillo', 78, 'CB', 'Brazil', 'Nottingham Forest', 'PL', '20s'],
  ['António Silva', 78, 'CB', 'Portugal', 'Benfica', 'LP', '20s'],
  ['Jorrel Hato', 78, 'CB,LB', 'Netherlands', 'Ajax|Chelsea', 'ED|PL', '20s'],

  // Full-backs / wing-backs
  ['Cafu', 91, 'RB,RWB', 'Brazil', 'Roma|AC Milan|São Paulo', 'SA|BR', '00s'],
  ['Roberto Carlos', 91, 'LB,LWB', 'Brazil', 'Real Madrid|Inter', 'LL|SA', '00s'],
  ['Philipp Lahm', 90, 'RB,LB,CDM', 'Germany', 'Bayern Munich', 'BL', '10s'],
  ['Dani Alves', 89, 'RB,RWB,RM', 'Brazil', 'Barcelona|Sevilla|Juventus|PSG', 'LL|SA|L1', '10s'],
  ['Marcelo', 88, 'LB,LWB', 'Brazil', 'Real Madrid', 'LL', '10s'],
  ['Giacinto Facchetti', 88, 'LB', 'Italy', 'Inter', 'SA', '60s'],
  ['Paul Breitner', 88, 'LB,CM', 'Germany', 'Bayern Munich|Real Madrid', 'BL|LL', '70s'],
  ['Ashley Cole', 87, 'LB', 'England', 'Arsenal|Chelsea', 'PL', '00s'],
  ['Trent Alexander-Arnold', 87, 'RB,CM', 'England', 'Liverpool|Real Madrid', 'PL|LL', '20s'],
  ['Achraf Hakimi', 87, 'RB,RWB,RM', 'Morocco', 'PSG|Inter|Real Madrid|Dortmund', 'L1|SA|LL|BL', '20s'],
  ['Jordi Alba', 86, 'LB,LWB', 'Spain', 'Barcelona|Valencia|Inter Miami', 'LL|MLS', '10s'],
  ['Theo Hernández', 85, 'LB,LWB', 'France', 'AC Milan|Real Madrid', 'SA|LL', '20s'],
  ['Alphonso Davies', 85, 'LB,LWB,LM', 'Canada', 'Bayern Munich', 'BL', '20s'],
  ['Nuno Mendes', 85, 'LB,LWB', 'Portugal', 'PSG|Sporting CP', 'L1|LP', '20s'],
  ['Alejandro Grimaldo', 82, 'LB,LWB', 'Spain', 'Bayer Leverkusen|Benfica', 'BL|LP', '20s'],
  ['Jeremie Frimpong', 79, 'RWB,RB,RM', 'Netherlands', 'Bayer Leverkusen|Liverpool|Celtic', 'BL|PL|SPL', '20s'],
  ['Diogo Dalot', 79, 'RB,LB', 'Portugal', 'Manchester United|Porto', 'PL|LP', '20s'],
  ['Destiny Udogie', 77, 'LB,LWB', 'Italy', 'Tottenham|Udinese', 'PL|SA', '20s'],
  ['Lutsharel Geertruida', 76, 'RB,CB', 'Netherlands', 'Feyenoord|RB Leipzig', 'ED|BL', '20s'],

  // Defensive / central midfielders
  ['Lothar Matthäus', 92, 'CDM,CM,CB', 'Germany', 'Bayern Munich|Inter', 'BL|SA', '90s'],
  ['Rodri', 91, 'CDM,CM', 'Spain', 'Manchester City|Atlético Madrid', 'PL|LL', '20s'],
  ['Frank Rijkaard', 89, 'CDM,CB', 'Netherlands', 'AC Milan|Ajax', 'SA|ED', '80s'],
  ['Patrick Vieira', 89, 'CDM,CM', 'France', 'Arsenal|Juventus|Inter', 'PL|SA', '00s'],
  ['Sergio Busquets', 88, 'CDM', 'Spain', 'Barcelona|Inter Miami', 'LL|MLS', '10s'],
  ["N'Golo Kanté", 88, 'CDM,CM', 'France', 'Chelsea|Leicester City', 'PL', '10s'],
  ['Claude Makélélé', 87, 'CDM', 'France', 'Chelsea|Real Madrid|PSG', 'PL|LL|L1', '00s'],
  ['Declan Rice', 87, 'CDM,CM', 'England', 'Arsenal|West Ham', 'PL', '20s'],
  ['Morten Hjulmand', 79, 'CDM', 'Denmark', 'Sporting CP|Lecce', 'LP|SA', '20s'],
  ['Ismaël Bennacer', 78, 'CDM,CM', 'Algeria', 'AC Milan', 'SA', '20s'],
  ['Xavi', 93, 'CM,CDM', 'Spain', 'Barcelona', 'LL', '00s'],
  ['Andrés Iniesta', 93, 'CM,CAM,LW', 'Spain', 'Barcelona', 'LL', '10s'],
  ['Luka Modrić', 91, 'CM,CAM', 'Croatia', 'Real Madrid|Tottenham', 'LL|PL', '10s'],
  ['Andrea Pirlo', 90, 'CM,CDM', 'Italy', 'AC Milan|Juventus|Inter', 'SA', '00s'],
  ['Toni Kroos', 90, 'CM,CDM', 'Germany', 'Real Madrid|Bayern Munich', 'LL|BL', '10s'],
  ['Steven Gerrard', 89, 'CM,CAM', 'England', 'Liverpool', 'PL', '00s'],
  ['Frank Lampard', 88, 'CM,CAM', 'England', 'Chelsea|West Ham', 'PL', '00s'],
  ['Paul Scholes', 88, 'CM,CAM', 'England', 'Manchester United', 'PL', '00s'],
  ['Clarence Seedorf', 88, 'CM,CAM', 'Netherlands', 'AC Milan|Ajax|Real Madrid|Inter', 'SA|ED|LL', '90s'],
  ['Pedri', 87, 'CM,CAM', 'Spain', 'Barcelona', 'LL', '20s'],
  ['Federico Valverde', 87, 'CM,RM', 'Uruguay', 'Real Madrid', 'LL', '20s'],
  ['Vitinha', 87, 'CM,CDM', 'Portugal', 'PSG|Porto', 'L1|LP', '20s'],
  ['Teun Koopmeiners', 79, 'CM,CAM', 'Netherlands', 'Juventus|Atalanta|AZ Alkmaar', 'SA|ED', '20s'],
  ['Joey Veerman', 78, 'CM', 'Netherlands', 'PSV', 'ED', '20s'],
  ['Hugo Larsson', 77, 'CM', 'Sweden', 'Eintracht Frankfurt', 'BL', '20s'],

  // Wide / attacking midfielders
  ['David Beckham', 88, 'RM,CM', 'England', 'Manchester United|Real Madrid|AC Milan|LA Galaxy', 'PL|LL|SA|MLS', '00s'],
  ['Ryan Giggs', 88, 'LM,LW', 'Wales', 'Manchester United', 'PL', '90s'],
  ['Pavel Nedvěd', 90, 'LM,CAM,CM', 'Czechia', 'Juventus|Lazio', 'SA', '00s'],
  ['Diego Maradona', 96, 'CAM,ST', 'Argentina', 'Napoli|Barcelona|Boca Juniors', 'SA|LL|AR', '80s'],
  ['Zinedine Zidane', 95, 'CAM,CM', 'France', 'Juventus|Real Madrid|Bordeaux', 'SA|LL|L1', '90s'],
  ['Michel Platini', 93, 'CAM,CM', 'France', 'Juventus|Saint-Étienne|Nancy', 'SA|L1', '80s'],
  ['Kaká', 92, 'CAM,ST', 'Brazil', 'AC Milan|Real Madrid', 'SA|LL', '00s'],
  ['Roberto Baggio', 91, 'CAM,ST', 'Italy', 'Juventus|AC Milan|Fiorentina|Inter', 'SA', '90s'],
  ['Kevin De Bruyne', 91, 'CAM,CM', 'Belgium', 'Manchester City|Wolfsburg|Napoli', 'PL|BL|SA', '20s'],
  ['Juan Román Riquelme', 89, 'CAM', 'Argentina', 'Boca Juniors|Villarreal|Barcelona', 'AR|LL', '00s'],
  ['Jude Bellingham', 89, 'CAM,CM', 'England', 'Real Madrid|Dortmund', 'LL|BL', '20s'],
  ['Florian Wirtz', 88, 'CAM,LW', 'Germany', 'Bayer Leverkusen|Liverpool', 'BL|PL', '20s'],
  ['Jamal Musiala', 87, 'CAM,LW', 'Germany', 'Bayern Munich', 'BL', '20s'],
  ['Bruno Fernandes', 87, 'CAM,CM', 'Portugal', 'Manchester United|Sporting CP', 'PL|LP', '20s'],
  ['Orkun Kökçü', 79, 'CAM,CM', 'Turkey', 'Benfica|Feyenoord', 'LP|ED', '20s'],
  ['Ismael Saibari', 77, 'CAM,CM,RW', 'Morocco', 'PSV', 'ED', '20s'],

  // Wingers
  ['Lionel Messi', 95, 'RW,CAM,ST', 'Argentina', 'Barcelona|PSG|Inter Miami', 'LL|L1|MLS', '10s'],
  ['Ronaldinho', 95, 'LW,CAM', 'Brazil', 'Barcelona|AC Milan|PSG', 'LL|SA|L1', '00s'],
  ['Neymar', 91, 'LW,ST,CAM', 'Brazil', 'Barcelona|PSG|Santos', 'LL|L1|BR', '10s'],
  ['Luís Figo', 90, 'RW,RM', 'Portugal', 'Real Madrid|Barcelona|Inter|Sporting CP', 'LL|SA|LP', '00s'],
  ['Mohamed Salah', 90, 'RW,ST', 'Egypt', 'Liverpool|Roma|Chelsea', 'PL|SA', '20s'],
  ['Vinícius Júnior', 90, 'LW,ST', 'Brazil', 'Real Madrid', 'LL', '20s'],
  ['Arjen Robben', 89, 'RW,RM', 'Netherlands', 'Bayern Munich|Chelsea|Real Madrid|PSV', 'BL|PL|LL|ED', '10s'],
  ['Lamine Yamal', 89, 'RW,RM', 'Spain', 'Barcelona', 'LL', '20s'],
  ['Bukayo Saka', 87, 'RW,RM', 'England', 'Arsenal', 'PL', '20s'],
  ['Khvicha Kvaratskhelia', 87, 'LW,LM', 'Georgia', 'Napoli|PSG', 'SA|L1', '20s'],
  ['Francisco Conceição', 79, 'RW,RM', 'Portugal', 'Juventus|Porto', 'SA|LP', '20s'],
  ['Karim Adeyemi', 78, 'LW,ST', 'Germany', 'Dortmund', 'BL', '20s'],
  ['Johan Bakayoko', 77, 'RW,RM', 'Belgium', 'PSV|RB Leipzig', 'ED|BL', '20s'],
  ['Geovany Quenda', 76, 'RW,RWB', 'Portugal', 'Sporting CP|Chelsea', 'LP|PL', '20s'],

  // Strikers
  ['Pelé', 96, 'ST,CAM', 'Brazil', 'Santos|New York Cosmos', 'BR', '60s'],
  ['Ronaldo Nazário', 95, 'ST', 'Brazil', 'Inter|Real Madrid|Barcelona|PSV', 'SA|LL|ED', '90s'],
  ['Cristiano Ronaldo', 95, 'ST,LW', 'Portugal', 'Real Madrid|Manchester United|Juventus|Sporting CP', 'LL|PL|SA|LP', '10s'],
  ['Johan Cruyff', 94, 'ST,CAM,LW', 'Netherlands', 'Ajax|Barcelona|Feyenoord', 'ED|LL', '70s'],
  ['Alfredo Di Stéfano', 94, 'ST,CAM', 'Argentina', 'Real Madrid|River Plate', 'LL|AR', '50s'],
  ['Ferenc Puskás', 93, 'ST', 'Hungary', 'Real Madrid|Budapest Honvéd', 'LL|HU', '50s'],
  ['Eusébio', 92, 'ST', 'Portugal', 'Benfica', 'LP', '60s'],
  ['Gerd Müller', 92, 'ST', 'Germany', 'Bayern Munich', 'BL', '70s'],
  ['Marco van Basten', 92, 'ST', 'Netherlands', 'AC Milan|Ajax', 'SA|ED', '80s'],
  ['Thierry Henry', 92, 'ST,LW', 'France', 'Arsenal|Barcelona|Monaco|Juventus', 'PL|LL|L1|SA', '00s'],
  ['Kylian Mbappé', 92, 'ST,LW', 'France', 'PSG|Real Madrid|Monaco', 'L1|LL', '20s'],
  ['Erling Haaland', 91, 'ST', 'Norway', 'Manchester City|Dortmund', 'PL|BL', '20s'],
  ['Robert Lewandowski', 91, 'ST', 'Poland', 'Bayern Munich|Dortmund|Barcelona', 'BL|LL', '10s'],
  ['Romário', 91, 'ST', 'Brazil', 'Barcelona|PSV|Vasco da Gama', 'LL|ED|BR', '90s'],
  ['Karim Benzema', 90, 'ST', 'France', 'Real Madrid|Lyon', 'LL|L1', '20s'],
  ['Andriy Shevchenko', 90, 'ST', 'Ukraine', 'AC Milan|Dynamo Kyiv|Chelsea', 'SA|PL', '00s'],
  ['Luis Suárez', 90, 'ST', 'Uruguay', 'Barcelona|Liverpool|Ajax|Atlético Madrid', 'LL|PL|ED', '10s'],
  ['Harry Kane', 90, 'ST', 'England', 'Tottenham|Bayern Munich', 'PL|BL', '20s'],
  ['Zlatan Ibrahimović', 89, 'ST', 'Sweden', 'AC Milan|Inter|PSG|Barcelona|Juventus|Ajax', 'SA|L1|LL|ED', '10s'],
  ['Samu Aghehowa', 78, 'ST', 'Spain', 'Porto|Atlético Madrid', 'LP|LL', '20s'],
  ['Luuk de Jong', 78, 'ST', 'Netherlands', 'PSV|Sevilla', 'ED|LL', '20s'],
  ['Vangelis Pavlidis', 78, 'ST', 'Greece', 'Benfica|AZ Alkmaar', 'LP|ED', '20s'],
]

export const PLAYERS: Player[] = [...ROWS, ...KEEPERS_AND_DEFENDERS, ...MIDFIELDERS, ...ATTACKERS, ...DEPTH].map(([name, ovr, pos, nation, clubs, leagues, era], id) => ({
  id, name, ovr, nation, era,
  wc: WORLD_CUP_WINNERS.has(name),
  positions: pos.split(',') as Pos[],
  clubs: clubs.split('|'),
  leagues: leagues.split('|').map((l) => LEAGUES[l] ?? l),
}))

/** Short name for chips and lists: the last word, plus any particle before it ("van Dijk", "De Bruyne", "Di María"). */
export function surname(name: string) {
  const w = name.split(' ')
  let i = w.length - 1
  while (i > 1 && /^(van|von|de|der|den|di|da|dos|del|la|le)$/i.test(w[i - 1])) i--
  return w.slice(i).join(' ')
}
