import type { SquadRow } from '../types'

// Latest national-team call-ups (Wikipedia, autumn 2026). A player who is also in a club squad here
// is the SAME player object (matched by name + nationality), so he can only be picked once.
export const NATIONS: Record<string, SquadRow[]> = {
  spain: [
    ['Unai Simón', 82, 'GK', 'Spain'], ['David Raya', 85, 'GK', 'Spain'], ['Joan García', 82, 'GK', 'Spain'], ['Álvaro Valles', 68, 'GK', 'Spain'],
    ['Aymeric Laporte', 80, 'CB', 'Spain'], ['Marc Cucurella', 79, 'LB,LWB', 'Spain'], ['Pedro Porro', 80, 'RB,RWB', 'Spain'],
    ['Pau Cubarsí', 82, 'CB', 'Spain'], ['Álex Grimaldo', 82, 'LB,LWB', 'Spain'], ['Dean Huijsen', 80, 'CB,RB', 'Spain'],
    ['Marc Pubill', 73, 'RB,RWB', 'Spain'], ['Jacobo Ramón', 65, 'CB', 'Spain'], ['Mikel Merino', 84, 'CM,CDM', 'Spain'],
    ['Pedri', 87, 'CM,CAM', 'Spain'], ['Fabián Ruiz', 84, 'CM,CAM', 'Spain'], ['Martín Zubimendi', 85, 'CDM,CM', 'Spain'],
    ['Álex Baena', 80, 'CAM,LW', 'Spain'], ['Fermín López', 78, 'CAM,CM', 'Spain'], ['Pablo Barrios', 76, 'CM,CDM', 'Spain'],
    ['Marc Roca', 72, 'CDM,CM', 'Spain'], ['Ferran Torres', 82, 'LW,ST', 'Spain'], ['Mikel Oyarzabal', 83, 'ST,LW', 'Spain'],
    ['Nico Williams', 86, 'LW,LM', 'Spain'], ['Lamine Yamal', 89, 'RW,RM', 'Spain'], ['Yeremy Pino', 79, 'RW,LW', 'Spain'],
    ['Víctor Muñoz', 70, 'LW,RW', 'Spain'], ['Roberto Fernández', 68, 'ST', 'Spain'], ['Jorge de Frutos', 71, 'RW,ST', 'Spain'],
  ],
  argentina: [
    ['Emiliano Martínez', 83, 'GK', 'Argentina'], ['Gerónimo Rulli', 72, 'GK', 'Argentina'], ['Juan Musso', 78, 'GK', 'Argentina'],
    ['Santiago Beltrán', 66, 'GK', 'Argentina'], ['Nicolás Tagliafico', 76, 'LB,LWB', 'Argentina'], ['Gonzalo Montiel', 73, 'RB,RWB', 'Argentina'],
    ['Lisandro Martínez', 82, 'CB', 'Argentina'], ['Facundo Medina', 74, 'CB,LB', 'Argentina'], ['Leonardo Balerdi', 75, 'CB', 'Argentina'],
    ['Agustín Giay', 72, 'RB,RWB', 'Argentina'], ['Román Vega', 65, 'LB,CB', 'Argentina'], ['Aarón Anselmino', 66, 'CB', 'Argentina'],
    ['Mariano Troilo', 66, 'CB', 'Argentina'], ['Alexis Mac Allister', 85, 'CM,CDM', 'Argentina'], ['Enzo Fernández', 84, 'CM,CDM', 'Argentina'],
    ['Exequiel Palacios', 78, 'CM,CDM', 'Argentina'], ['Nico Paz', 78, 'CAM,CM', 'Argentina'], ['Valentín Barco', 74, 'LB,LM', 'Argentina'],
    ['Máximo Perrone', 68, 'CM,CDM', 'Argentina'], ['Equi Fernández', 72, 'CDM,CM', 'Argentina'], ['Julián Álvarez', 85, 'ST,LW', 'Argentina'],
    ['Thiago Almada', 75, 'CAM,LW', 'Argentina'], ['Giuliano Simeone', 73, 'RW,ST', 'Argentina'], ['José Manuel López', 74, 'ST', 'Argentina'],
    ['Franco Mastantuono', 76, 'RW,CAM', 'Argentina'], ['Gianluca Prestianni', 70, 'RW,LW', 'Argentina'], ['Santiago Castro', 68, 'ST', 'Argentina'],
    ['Matías Soulé', 72, 'RW,LW', 'Argentina'],
  ],
  morocco: [
    ['Yassine Bounou', 80, 'GK', 'Morocco'], ['Munir Mohamedi', 70, 'GK', 'Morocco'], ['Ahmed Reda Tagnaouti', 68, 'GK', 'Morocco'],
    ['Achraf Hakimi', 85, 'RB,RWB', 'Morocco'], ['Noussair Mazraoui', 80, 'RB,LB', 'Morocco'], ['Nayef Aguerd', 78, 'CB', 'Morocco'],
    ['Issa Diop', 74, 'CB', 'Morocco'], ['Souffian El Karouani', 72, 'LB,LWB', 'Morocco'], ['Redouane Halhal', 66, 'CB', 'Morocco'],
    ['Anass Salah-Eddine', 70, 'LB,RB', 'Morocco'], ['Abdelhamid Aït Boudlal', 62, 'CB', 'Morocco'], ['Ayyoub Bouaddi', 68, 'CM,CDM', 'Morocco'],
    ['Oussama Targhalline', 72, 'CDM,CM', 'Morocco'], ['Bilal El Khannouss', 76, 'CAM,CM', 'Morocco'], ['Neil El Aynaoui', 74, 'CDM,CM', 'Morocco'],
    ['Amine Sbaï', 66, 'LM,LW', 'Morocco'], ['Reda Belahyane', 70, 'CDM,CM', 'Morocco'], ['Brahim Díaz', 80, 'CAM,RW', 'Morocco'],
    ['Gessime Yassine', 64, 'RW,LW', 'Morocco'], ['Abde Ezzalzouli', 74, 'LW,RW', 'Morocco'], ['Youssef En-Nesyri', 74, 'ST', 'Morocco'],
    ['Yassir Zabiri', 60, 'ST', 'Morocco'], ['Ayoub Oufkir', 64, 'LW,LM', 'Morocco'],
  ],
  portugal: [
    ['Diogo Costa', 83, 'GK', 'Portugal'], ['Rui Silva', 76, 'GK', 'Portugal'], ['Samuel Soares', 68, 'GK', 'Portugal'],
    ['Rúben Dias', 85, 'CB', 'Portugal'], ['João Cancelo', 81, 'RB,LB', 'Portugal'], ['Diogo Dalot', 80, 'RB,LB', 'Portugal'],
    ['Renato Veiga', 74, 'CB,CDM', 'Portugal'], ['António Silva', 76, 'CB', 'Portugal'], ['Tomás Araújo', 72, 'CB', 'Portugal'],
    ['Nuno Tavares', 72, 'LB,LWB', 'Portugal'], ['Nuno Mendes', 84, 'LB,LWB', 'Portugal'], ['Bernardo Silva', 85, 'CAM,RW', 'Portugal'],
    ['Bruno Fernandes', 85, 'CAM,CM', 'Portugal'], ['Rúben Neves', 79, 'CDM,CM', 'Portugal'], ['Vitinha', 88, 'CM,CDM', 'Portugal'],
    ['João Palhinha', 80, 'CDM,CM', 'Portugal'], ['João Neves', 84, 'CM,CDM', 'Portugal'], ['Mateus Fernandes', 72, 'CM,CDM', 'Portugal'],
    ['João Félix', 81, 'CAM,LW', 'Portugal'], ['Rafael Leão', 84, 'LW,ST', 'Portugal'], ['Pedro Neto', 80, 'LW,RW', 'Portugal'],
    ['Gonçalo Ramos', 80, 'ST', 'Portugal'], ['Francisco Trincão', 75, 'RW,LW', 'Portugal'], ['Carlos Forbs', 72, 'RW,RM', 'Portugal'],
    ['Fábio Silva', 70, 'ST', 'Portugal'], ['Rodrigo Mora', 64, 'CAM,RW', 'Portugal'], ['Geovany Quenda', 68, 'RW,RB', 'Portugal'],
    ['Cristiano Ronaldo', 79, 'ST', 'Portugal'],
  ],
}
