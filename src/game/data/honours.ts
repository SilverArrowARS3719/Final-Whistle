// Players in the database who were in a World Cup-winning squad (checked squad lists, not just finals played).
export const WORLD_CUP_WINNERS = new Set([
  // Italy 1934/38, 1982, 2006
  'Giuseppe Meazza', 'Dino Zoff', 'Antonio Cabrini', 'Gaetano Scirea', 'Giuseppe Bergomi', 'Paolo Rossi', 'Franco Baresi',
  'Gianluigi Buffon', 'Fabio Cannavaro', 'Alessandro Nesta', 'Gianluca Zambrotta', 'Andrea Pirlo', 'Gennaro Gattuso',
  'Daniele De Rossi', 'Francesco Totti', 'Alessandro Del Piero', 'Filippo Inzaghi', 'Andrea Barzagli',
  // Brazil 1958/62, 1970, 1994, 2002
  'Didi', 'Nílton Santos', 'Djalma Santos', 'Garrincha', 'Pelé', 'Carlos Alberto', 'Gérson', 'Jairzinho', 'Rivelino', 'Tostão',
  'Cláudio Taffarel', 'Dunga', 'Bebeto', 'Romário', 'Ronaldo Nazário', 'Cafu', 'Roberto Carlos', 'Rivaldo', 'Ronaldinho',
  'Kaká', 'Lúcio', 'Dida',
  // England 1966
  'Gordon Banks', 'Bobby Moore', 'Bobby Charlton', 'Jimmy Greaves',
  // Germany 1974, 1990, 2014
  'Sepp Maier', 'Berti Vogts', 'Franz Beckenbauer', 'Gerd Müller', 'Günter Netzer', 'Paul Breitner', 'Lothar Matthäus',
  'Andreas Brehme', 'Jürgen Klinsmann', 'Rudi Völler', 'Manuel Neuer', 'Philipp Lahm', 'Bastian Schweinsteiger',
  'Jérôme Boateng', 'Mats Hummels', 'Toni Kroos', 'Thomas Müller', 'Mesut Özil', 'Mario Götze', 'Miroslav Klose',
  // Argentina 1978, 1986, 2022
  'Mario Kempes', 'Daniel Passarella', 'Diego Maradona', 'Lionel Messi', 'Ángel Di María', 'Nicolás Otamendi', 'Paulo Dybala',
  'Emiliano Martínez', 'Cristian Romero', 'Enzo Fernández', 'Alexis Mac Allister', 'Julián Álvarez', 'Lautaro Martínez',
  'Lisandro Martínez', 'Exequiel Palacios',
  // France 1998, 2018
  'Fabien Barthez', 'Lilian Thuram', 'Marcel Desailly', 'Laurent Blanc', 'Bixente Lizarazu', 'Didier Deschamps', 'Zinedine Zidane',
  'Patrick Vieira', 'Robert Pirès', 'Thierry Henry', 'David Trezeguet', 'Hugo Lloris', 'Benjamin Pavard', 'Raphaël Varane',
  'Samuel Umtiti', "N'Golo Kanté", 'Paul Pogba', 'Blaise Matuidi', 'Kylian Mbappé', 'Antoine Griezmann', 'Olivier Giroud',
  'Ousmane Dembélé',
  // Spain 2010
  'Iker Casillas', 'Víctor Valdés', 'Carles Puyol', 'Gerard Piqué', 'Sergio Ramos', 'Javi Martínez', 'Xavi', 'Andrés Iniesta',
  'Sergio Busquets', 'Xabi Alonso', 'Cesc Fàbregas', 'David Silva', 'David Villa', 'Fernando Torres',
])

export const SOUTH_AMERICA = new Set(['Brazil', 'Argentina', 'Uruguay', 'Colombia', 'Chile', 'Ecuador', 'Paraguay', 'Peru', 'Venezuela', 'Bolivia'])
export const AFRICA = new Set([
  'Morocco', 'Ivory Coast', 'Ghana', 'Senegal', 'Nigeria', 'Cameroon', 'Egypt', 'Algeria', 'Liberia', 'Guinea', 'Gabon',
  'Burkina Faso', 'Congo', 'Mali', 'Tunisia', 'South Africa',
])
