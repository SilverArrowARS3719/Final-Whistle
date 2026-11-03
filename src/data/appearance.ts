// How each player looked in his prime, for the card busts.
// Code = 4 chars: skin (1 lightest .. 6 deepest), hair style, hair colour, facial hair.
//   style:  x shaved/bald, z buzz, s short, f fringe, w wavy/medium, l long, c curly, a afro,
//           d dreads/twists, m mohawk/high fade, p ponytail/bun, k slicked back
//   colour: b black, d dark brown, n brown, l blonde, r ginger, g grey
//   facial: n none, s stubble, b beard, m moustache
//   face (optional 5th): o oval (default), s square jaw, n narrow/long, r round, v pointed chin
export type Look = { skin: number; style: string; color: string; facial: string; face: string }

const RAW = `
Lev Yashin:2sdn|Gianluigi Buffon:2wdss|Manuel Neuer:1slns|Iker Casillas:2sdn|Peter Schmeichel:1slns|Jan Oblak:2wdn|Alisson:3sdb|Thibaut Courtois:2sdnn
Edwin van der Sar:1zln|Gianluigi Donnarumma:2sbs|Diogo Costa:2sdn|Guglielmo Vicario:2sdb|Bart Verbruggen:2sdn|Franz Beckenbauer:2wnn|Paolo Maldini:2ldns
Franco Baresi:2zdnn|Fabio Cannavaro:3sbns|Sergio Ramos:3kbbs|Virgil van Dijk:4mbbs|Alessandro Nesta:2wdnn|Carles Puyol:2lnns|Thiago Silva:4zbs|Marcel Desailly:6xbns
Lilian Thuram:6zbns|Rio Ferdinand:5zbn|John Terry:2sdns|Nemanja Vidić:2zdns|Rúben Dias:2sbb|Pepe:4xbb|William Saliba:5zbn|Marquinhos:3sbs|Joško Gvardiol:2zds
Pau Cubarsí:2sdn|Murillo:4zbn|António Silva:2sdn|Jorrel Hato:5zbn|Cafu:5xbnr|Roberto Carlos:5xbnr|Philipp Lahm:1snnr|Dani Alves:4mbsv|Marcelo:4abnr
Giacinto Facchetti:2sbn|Paul Breitner:2adb|Ashley Cole:4zbn|Trent Alexander-Arnold:2zdn|Achraf Hakimi:3cbs|Jordi Alba:2sdbv|Theo Hernández:2sbb
Alphonso Davies:6zbn|Nuno Mendes:5mbn|Alejandro Grimaldo:2sdn|Jeremie Frimpong:5mbn|Diogo Dalot:3sdn|Destiny Udogie:5zbn|Lutsharel Geertruida:5zbn
Lothar Matthäus:2wnns|Rodri:2sdsn|Frank Rijkaard:5cbn|Patrick Vieira:6zbnn|Sergio Busquets:2sbsn|N'Golo Kanté:6zbnr|Claude Makélélé:6xbn|Declan Rice:2sdn
Morten Hjulmand:2sns|Ismaël Bennacer:3cbb|Xavi:2sdnr|Andrés Iniesta:1xnnn|Luka Modrić:1llnn|Andrea Pirlo:2ldbn|Toni Kroos:1snns|Steven Gerrard:2zdns
Frank Lampard:2sdnr|Paul Scholes:1zrnr|Clarence Seedorf:5zbn|Pedri:2sdnv|Federico Valverde:2sbbs|Vitinha:3sbn|Teun Koopmeiners:1snn|Joey Veerman:1snn
Hugo Larsson:1sln|David Beckham:1flns|Ryan Giggs:2wbnn|Pavel Nedvěd:1llns|Diego Maradona:3cbnr|Zinedine Zidane:2xbnn|Michel Platini:2cnn|Kaká:3sbnn
Roberto Baggio:2pbn|Kevin De Bruyne:1srn|Juan Román Riquelme:3sbsn|Jude Bellingham:4mbns|Florian Wirtz:1snn|Jamal Musiala:4zbn|Bruno Fernandes:2sbs
Orkun Kökçü:2sbs|Ismael Saibari:3sbb|Lionel Messi:2sdb|Ronaldinho:4lbnn|Neymar:3mbsv|Luís Figo:2sbss|Mohamed Salah:4abb|Vinícius Júnior:5cbnv
Arjen Robben:1xnn|Lamine Yamal:4mbnv|Bukayo Saka:5zbn|Khvicha Kvaratskhelia:2wbnn|Francisco Conceição:2sbn|Karim Adeyemi:4dbn|Johan Bakayoko:5zbn
Geovany Quenda:5mbn|Pelé:6zbnr|Ronaldo Nazário:4xbnr|Cristiano Ronaldo:3kbns|Johan Cruyff:2wnnn|Alfredo Di Stéfano:2kdnn|Ferenc Puskás:2kbnr|Eusébio:6zbn
Gerd Müller:2wbnr|Marco van Basten:1wlnn|Thierry Henry:5xbnn|Kylian Mbappé:5xbnr|Erling Haaland:1plns|Robert Lewandowski:1snns|Romário:4zbnr|Karim Benzema:3zbbs
Andriy Shevchenko:1snns|Luis Suárez:3sbs|Harry Kane:2sdnn|Zlatan Ibrahimović:2pbbn|Samu Aghehowa:5zbn|Luuk de Jong:1sln|Vangelis Pavlidis:2sbb
Dino Zoff:2sdn|Gordon Banks:2sdn|Sepp Maier:2wdn|Oliver Kahn:1slns|Petr Čech:2sdn|Víctor Valdés:2sbs|David de Gea:2sbb|Ederson:3xbs|Hugo Lloris:2sdn
Keylor Navas:3sbb|Júlio César:3sbn|Dida:6xbn|Andoni Zubizarreta:2sdn|Fabien Barthez:1xnn|Walter Zenga:2wbn|Rinat Dasayev:2sdm|Cláudio Taffarel:3sbn
Mike Maignan:5zbb|Emiliano Martínez:3sbb|Marc-André ter Stegen:1sln|Yann Sommer:1snn|Wojciech Szczęsny:2sds|Samir Handanović:2zds|Rui Patrício:2zbs
David Raya:2sbb|Gregor Kobel:1snn|André Onana:6xbs|Unai Simón:2sdb|Kasper Schmeichel:1sln|Jordan Pickford:1snb|Giorgi Mamardashvili:2sbb|Álex Remiro:2sdb
Bernd Leno:2snn|Mile Svilar:2sdn|Lucas Chevalier:2sdn|Anatoliy Trubin:1snn|Robert Sánchez:2sbs|Justin Bijlow:1snn|Walter Benítez:3sbb|Bobby Moore:1sln
Daniel Passarella:2wbn|Elías Figueroa:3sbn|Gaetano Scirea:2wbn|Ronald Koeman:1sln|Laurent Blanc:2xnn|Fernando Hierro:2sbn|Tony Adams:2snn|Jaap Stam:1xnn
Ricardo Carvalho:2sbn|Lúcio:4xbn|Walter Samuel:3sbb|Sol Campbell:6xbn|Javier Mascherano:2sbs|Gerard Piqué:2sdb|Mats Hummels:2sdns|Jérôme Boateng:5zbs
Giorgio Chiellini:2sbss|Leonardo Bonucci:2kbss|Andrea Barzagli:2sdn|Raphaël Varane:5zbn|Diego Godín:3sbss|Vincent Kompany:5zbb|Kalidou Koulibaly:6zbbs
Javi Martínez:2sbb|Toby Alderweireld:2sbn|Jan Vertonghen:2sbb|Mehdi Benatia:3xbb|Samuel Umtiti:5zbn|Joël Matip:6zbn|Stefan de Vrij:2sdn
Nicolás Otamendi:3zbb|Daley Blind:1sln|Antonio Rüdiger:6zbbs|Éder Militão:4zbn|Alessandro Bastoni:2sbn|Matthijs de Ligt:1sln|Ronald Araújo:4zbs
Kim Min-jae:2sbn|Dayot Upamecano:6zbn|Gabriel Magalhães:4zbb|Ibrahima Konaté:6zbn|Jules Koundé:5abn|Cristian Romero:3sbb|Lisandro Martínez:3sbs
John Stones:1snn|Micky van de Ven:2sbn|Jonathan Tah:6zbn|Willian Pacho:5zbn|Marc Guéhi:5zbn|Nico Schlotterbeck:1snn|Gonçalo Inácio:2sbn
Robin Le Normand:2snb|Nathan Aké:5zbn|Francesco Acerbi:2zbb|Dean Huijsen:2sdn|Levi Colwill:1sln|Riccardo Calafiori:2sbn|Nikola Milenković:2sdn
Alessandro Buongiorno:2sbn|Amir Rrahmani:2sbb|Edmond Tapsoba:6zbn|Piero Hincapié:4zbn|Dávid Hancko:1snn|Ousmane Diomande:6zbn|Leny Yoro:5zbn
Maxence Lacroix:5zbn|Jan Paul van Hecke:2sbn|Mario Hermoso:2sbb|Federico Gatti:2sdb|Waldemar Anton:2sdb|Arthur Theate:1snn|Marcos Senesi:2sbb
Ryan Flamingo:5zbn|Zeno Debast:1snn|Nílton Santos:4kbn|Djalma Santos:6zbn|Carlos Alberto:4sbn|Berti Vogts:1sln|Manfred Kaltz:1wln|Antonio Cabrini:2wbn
Giuseppe Bergomi:2sbm|Andreas Brehme:1sln|Denis Irwin:1snn|Javier Zanetti:3kbns|Gianluca Zambrotta:2sbn|Bixente Lizarazu:2sbn|Patrice Evra:5zbn
Gary Neville:2sdn|Kyle Walker:4zbn|Andrew Robertson:1sns|João Cancelo:3sbs|Dani Carvajal:2sbb|Federico Dimarco:2sbn|Reece James:5zbn
Giovanni Di Lorenzo:2sbn|Benjamin Pavard:2cnn|Kieran Trippier:2sdn|Ferland Mendy:6zbn|Raphaël Guerreiro:3sbn|Denzel Dumfries:5zbn|Pedro Porro:2sbs
Ben White:2sdn|Jurriën Timber:5zbn|Marc Cucurella:2ann|Alejandro Balde:5cbn|Juan Bernat:2sbn|Leonardo Spinazzola:2sbs|Milos Kerkez:2sdn|Mats Wieffer:1snn
Maximiliano Araújo:3sbn|Sergiño Dest:4cbn|Lewis Hall:2sdn|Quilindschy Hartman:4zbn|Tyrick Mitchell:5zbn|Devyne Rensch:4zbn|Tiago Santos:2sbn
Arnau Martínez:2sdn|Anass Salah-Eddine:3sbb|Valentín Barco:2sbn|Iván Fresneda:2sdn|Didi:5sbn|Bobby Charlton:1xnn|Gianni Rivera:2sdn|Sandro Mazzola:2sbn
Gérson:4sbn|Rivelino:3wbm|Johan Neeskens:2lnn|Günter Netzer:1lln|Zico:3sbn|Sócrates:3wbb|Falcão:2cnn|Bryan Robson:2snn|Graeme Souness:2sdm
Bernd Schuster:1lln|Glenn Hoddle:2wnn|Ruud Gullit:5dbmn|Michael Laudrup:2snn|Gheorghe Hagi:2sbn|Dennis Bergkamp:1snnn|Rivaldo:4sbnn|Paul Gascoigne:1sln
Pep Guardiola:2snn|Dunga:2sdn|Didier Deschamps:2sdn|Roy Keane:2sdbs|Fernando Redondo:2lbn|Carlos Valderrama:4alm|Gianfranco Zola:2sbn|Edgar Davids:5dbn
Michael Ballack:2sdns|Rui Costa:2lbn|Juan Sebastián Verón:2xnb|Juninho Pernambucano:4sbn|Deco:4zbn|Robert Pirès:2sbb|Freddie Ljungberg:1mrn
Gennaro Gattuso:2sbbs|Daniele De Rossi:2sbb|Esteban Cambiasso:2xnn|Mark van Bommel:2sdn|Phillip Cocu:1snn|Michael Essien:6xbn|Wesley Sneijder:2snn
Mesut Özil:3kbn|David Silva:2sbs|Cesc Fàbregas:2sbs|Bastian Schweinsteiger:1slns|Xabi Alonso:2sdb|Yaya Touré:6zbns|Arturo Vidal:3mbb|Thiago Alcântara:3xbb
Casemiro:3zbss|Marco Verratti:2snn|Michael Carrick:2snn|Ivan Rakitić:2wnn|Marcelo Brozović:2sbn|Isco:2sbb|Santi Cazorla:2sbn|Dimitri Payet:3zbb
Miralem Pjanić:2sbs|Radja Nainggolan:4mbb|Marek Hamšík:2mbn|Paul Pogba:6zbnn|Blaise Matuidi:6xbn|Henrikh Mkhitaryan:2sbs|James Rodríguez:3sbn
Christian Eriksen:1sln|Mario Götze:2snn|Thomas Müller:1snnn|Jordan Henderson:2snb|Koke:2sbn|Saúl Ñíguez:2sbs|Joshua Kimmich:1sln|Ilkay Gündoğan:2sbb
Frenkie de Jong:2wnn|Martin Ødegaard:2snn|Bernardo Silva:2sbs|Cole Palmer:2snn|Phil Foden:1slnv|Nicolò Barella:2sbn|Hakan Çalhanoğlu:2sbs
Alexis Mac Allister:2cnn|Fabinho:4zbb|Mateo Kovačić:2sbs|Jorginho:2sbs|Moisés Caicedo:4zbn|Martín Zubimendi:2sdn|João Neves:2sbn|Bruno Guimarães:3sbb
Granit Xhaka:2sbb|Aurélien Tchouaméni:6zbn|Eduardo Camavinga:5dbn|Leon Goretzka:2sdn|Enzo Fernández:2sbn|Tijjani Reijnders:3sbn|Xavi Simons:3lbn
Dani Olmo:2sdn|Sergej Milinković-Savić:2sbs|Sandro Tonali:2lbn|Ryan Gravenberch:5zbn|Mikel Merino:2sbb|Scott McTominay:2sdn|Stanislav Lobotka:2sbb
Adrien Rabiot:2lbn|Marcos Llorente:2sdn|Gavi:2sbnv|Eberechi Eze:5zbn|Youri Tielemans:2snn|Lucas Paquetá:3sbn|Morgan Gibbs-White:2sdn|James Maddison:1snn
Mason Mount:2sdn|Pedro Gonçalves:2sbn|Rayan Cherki:3cbn|Warren Zaïre-Emery:5zbn|Angelo Stiller:1sln|Manuel Locatelli:2sbn|Fermín López:2sdn
Conor Gallagher:2sdn|Douglas Luiz:4zbn|Aleix García:2sbb|Exequiel Palacios:2sbn|Aleksandar Pavlović:2sdn|Pierre-Emile Højbjerg:2zbs|Khéphren Thuram:5zbn
Kobbie Mainoo:5zbn|Pablo Barrios:2sdn|Fredrik Aursnes:1sln|Quinten Timber:5zbn|Xaver Schlager:1snn|Maghnes Akliouche:3cbn|Jerdy Schouten:1snn
Kenneth Taylor:2snn|Alan Varela:2sbn|Christoph Baumgartner:1snn|Felix Nmecha:5zbn|Florentino Luís:5zbn|Guus Til:1snn|Lamine Camara:6zbn
Giuseppe Meazza:2kbn|Stanley Matthews:1kdn|Raymond Kopa:2kbn|Just Fontaine:2kbn|Garrincha:4sbn|George Best:2lbbv|Jimmy Greaves:2sdn|Uwe Seeler:1xnn
Jairzinho:5abn|Tostão:3sbn|Gigi Riva:2kbn|Kevin Keegan:2ann|Mario Kempes:2lbn|Johnny Rep:1cln|Oleg Blokhin:2snn|Karl-Heinz Rummenigge:1wlns
Kenny Dalglish:2snn|Ian Rush:2sdm|Gary Lineker:2sdn|Paolo Rossi:2cbn|Rudi Völler:2cgm|Hugo Sánchez:3cbm|Emilio Butragueño:2sdn|Enzo Francescoli:2wbn
George Weah:6zbn|Hristo Stoichkov:2sbn|Gabriel Batistuta:2lbns|Jean-Pierre Papin:2sbn|Éric Cantona:2sbns|Alan Shearer:2snns|Jürgen Klinsmann:1slns
Bebeto:4sbn|Davor Šuker:2sbn|Iván Zamorano:3sbn|Marc Overmars:2sdn|Brian Laudrup:1sln|Alessandro Del Piero:2sbn|Francesco Totti:2snns
Christian Vieri:2sbss|Filippo Inzaghi:2sdnn|Hernán Crespo:2wbn|Carlos Tevez:3sbnr|Raúl:2sbnn|Fernando Torres:1srnv|Samuel Eto'o:6zbn|Didier Drogba:6zbbs
David Trezeguet:2sbn|Nicolas Anelka:5zbn|Wayne Rooney:2zdnr|Michael Owen:2sdn|Ruud van Nistelrooy:2sdn|Patrick Kluivert:5zbn|Henrik Larsson:4dbn
Adriano:5zbn|Robinho:5zbn|Diego Forlán:1lln|Miroslav Klose:2snns|Ricardo Quaresma:3sbn|Sergio Agüero:3sbsr|Gonzalo Higuaín:2sbsr|Ángel Di María:2sbnn
Paulo Dybala:2sbsv|Edinson Cavani:2lbb|Radamel Falcao:3lbn|Alexis Sánchez:3sbn|Eden Hazard:2sbsr|Franck Ribéry:2zdn|Antoine Griezmann:2snsv
Olivier Giroud:2sdb|David Villa:2sbb|Robin van Persie:2sdn|Sadio Mané:6zbs|Roberto Firmino:4zbn|Riyad Mahrez:3sbn|Pierre-Emerick Aubameyang:5mbn
Marco Reus:1sln|Lorenzo Insigne:2sbn|Ciro Immobile:2sbs|Raheem Sterling:5zbn|Nani:4zbn|Wilfried Zaha:6zbn|Ousmane Dembélé:5zbn|Lautaro Martínez:3sbbs
Son Heung-min:2sbnr|Raphinha:4zbn|Julián Álvarez:2sbn|Victor Osimhen:6mln|Viktor Gyökeres:2sbn|Alexander Isak:5zbnn|Michael Olise:5zbn|Rafael Leão:5cbn
Luis Díaz:3cbn|Rodrygo:4zbn|Nico Williams:6zbn|Diogo Jota:2sbn|Romelu Lukaku:6zbnr|Leroy Sané:5zbn|Kingsley Coman:5zbn|Marcus Thuram:5zbn
Kai Havertz:2snn|Cody Gakpo:5zbn|Christian Pulisic:2sdn|Désiré Doué:5zbn|Federico Chiesa:2sbn|Dušan Vlahović:2wbnn|Ademola Lookman:6zbn
Serhou Guirassy:6zbn|Omar Marmoush:3sbn|Serge Gnabry:5zbn|Memphis Depay:5mbb|Hakim Ziyech:3sbb|Marcus Rashford:5zbn|Mikel Oyarzabal:2sdn
Álvaro Morata:2sbs|João Félix:2sbn|Gabriel Martinelli:2sdn|Gabriel Jesus:4zbn|Matheus Cunha:3cbn|Jérémy Doku:6zbn|Bradley Barcola:5zbn|Hugo Ekitiké:5dbn
Jonathan David:5zbn|Jack Grealish:2kdn|Ollie Watkins:5zbn|Dejan Kulusevski:2sbn|Bryan Mbeumo:6zbn|Darwin Núñez:3sbs|Kenan Yıldız:2sbn
Mason Greenwood:4zbn|Anthony Gordon:2sdn|Jarrod Bowen:2sdn|Leandro Trossard:2sdn|Kaoru Mitoma:2sbn|Mohammed Kudus:6zbn|Santiago Giménez:2sbn
Pedro Neto:2sbn|Patrik Schick:1snn|Loïs Openda:5zbn|Benjamin Šeško:1snn|Alexander Sørloth:1snn|Gonçalo Ramos:2sbn|Rafa Silva:2sbn
Francisco Trincão:2sbn|Ferran Torres:2sbn|Takefusa Kubo:2sbn|Iñaki Williams:6zbn|Victor Boniface:6zbn|Mateo Retegui:2sbn|Nicolás González:2sbs
Hirving Lozano:3sbn|Donyell Malen:5zbn|Randal Kolo Muani:6zbn|Savinho:4zbn|Antoine Semenyo:6zbn|Ivan Toney:5zbb|Alejandro Garnacho:2sbn
Richarlison:4zbn|Igor Paixão:4zbn|Noa Lang:4cbn|Niclas Füllkrug:2zdn|Deniz Undav:2sbb|Jamie Gittens:5zbn|Dominic Solanke:5zbn|Ayoze Pérez:2sdb
Antony:4zbn|Estêvão:4zbn|Brian Brobbey:5zbn|Ayase Ueda:2sbn|Endrick:4zbn|Mika Godts:1snn|Wout Weghorst:1sln|Arnaud Kalimuendo:5zbn|Ricardo Pepi:3sbn
Elye Wahi:6zbn
`

export const LOOKS: Record<string, Look> = Object.fromEntries(
  RAW.trim().split(/\||\n/).map((e) => {
    const i = e.lastIndexOf(':')
    const c = e.slice(i + 1)
    return [e.slice(0, i), { skin: Number(c[0]), style: c[1], color: c[2], facial: c[3], face: c[4] ?? 'o' }]
  }),
)
