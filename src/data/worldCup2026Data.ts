export type MatchOutcome = 'home' | 'draw' | 'away';

export type MatchScore = {
  homeGoals: number;
  awayGoals: number;
};

export type Team = {
  id: string;
  name: string;
  group: string;
};

export type GroupMatch = {
  id: string;
  group: string;
  homeTeamId: string;
  awayTeamId: string;
  kickoff: string;
  officialScore?: MatchScore;
  officialResult?: MatchOutcome;
};

export type RoundOf32Rule = {
  id: string;
  label: string;
  kickoff: string;
  homeSlot: string;
  awaySlot: string;
  officialScore?: MatchScore;
  officialWinnerTeamId?: string;
};

export type WorldCup2026Data = {
  groups: Record<string, Team[]>;
  groupMatches: GroupMatch[];
  roundOf32Rules: RoundOf32Rule[];
};

// Edit this file to lock official data as matches are played.
// - officialScore: { homeGoals: 2, awayGoals: 1 }
// - officialResult: 'home' | 'draw' | 'away'
// - officialWinnerTeamId: team id string (example: 'mex')
export const worldCup2026Data: WorldCup2026Data = {
  groups: {
    A: [
      { id: 'mex', name: 'Mexico', group: 'A' },
      { id: 'rsa', name: 'Sudafrica', group: 'A' },
      { id: 'kor', name: 'Republica de Corea', group: 'A' },
      { id: 'cze', name: 'Republica Checa', group: 'A' },
    ],
    B: [
      { id: 'can', name: 'Canada', group: 'B' },
      { id: 'bih', name: 'Bosnia y Herzegovina', group: 'B' },
      { id: 'qat', name: 'Catar', group: 'B' },
      { id: 'sui', name: 'Suiza', group: 'B' },
    ],
    C: [
      { id: 'bra', name: 'Brasil', group: 'C' },
      { id: 'mar', name: 'Marruecos', group: 'C' },
      { id: 'hti', name: 'Haiti', group: 'C' },
      { id: 'sco', name: 'Escocia', group: 'C' },
    ],
    D: [
      { id: 'usa', name: 'Estados Unidos', group: 'D' },
      { id: 'par', name: 'Paraguay', group: 'D' },
      { id: 'aus', name: 'Australia', group: 'D' },
      { id: 'tur', name: 'Turquia', group: 'D' },
    ],
    E: [
      { id: 'ger', name: 'Alemania', group: 'E' },
      { id: 'cuw', name: 'Curazao', group: 'E' },
      { id: 'civ', name: 'Costa de Marfil', group: 'E' },
      { id: 'ecu', name: 'Ecuador', group: 'E' },
    ],
    F: [
      { id: 'ned', name: 'Paises Bajos', group: 'F' },
      { id: 'jpn', name: 'Japon', group: 'F' },
      { id: 'swe', name: 'Suecia', group: 'F' },
      { id: 'tun', name: 'Tunez', group: 'F' },
    ],
    G: [
      { id: 'bel', name: 'Belgica', group: 'G' },
      { id: 'egy', name: 'Egipto', group: 'G' },
      { id: 'irn', name: 'RI de Iran', group: 'G' },
      { id: 'nzl', name: 'Nueva Zelanda', group: 'G' },
    ],
    H: [
      { id: 'esp', name: 'Espana', group: 'H' },
      { id: 'cpv', name: 'Cabo Verde', group: 'H' },
      { id: 'ksa', name: 'Arabia Saudi', group: 'H' },
      { id: 'uru', name: 'Uruguay', group: 'H' },
    ],
    I: [
      { id: 'fra', name: 'Francia', group: 'I' },
      { id: 'sen', name: 'Senegal', group: 'I' },
      { id: 'irq', name: 'Irak', group: 'I' },
      { id: 'nor', name: 'Noruega', group: 'I' },
    ],
    J: [
      { id: 'arg', name: 'Argentina', group: 'J' },
      { id: 'alg', name: 'Argelia', group: 'J' },
      { id: 'aut', name: 'Austria', group: 'J' },
      { id: 'jor', name: 'Jordania', group: 'J' },
    ],
    K: [
      { id: 'por', name: 'Portugal', group: 'K' },
      { id: 'cod', name: 'RD Congo', group: 'K' },
      { id: 'uzb', name: 'Uzbekistan', group: 'K' },
      { id: 'col', name: 'Colombia', group: 'K' },
    ],
    L: [
      { id: 'eng', name: 'Inglaterra', group: 'L' },
      { id: 'cro', name: 'Croacia', group: 'L' },
      { id: 'gha', name: 'Ghana', group: 'L' },
      { id: 'pan', name: 'Panama', group: 'L' },
    ],
  },
  groupMatches: [
    { id: 'A-1', group: 'A', homeTeamId: 'mex', awayTeamId: 'rsa', kickoff: 'Jue 11 Jun 2026 · 15:00 · Estadio Ciudad de Mexico' },
    { id: 'A-2', group: 'A', homeTeamId: 'kor', awayTeamId: 'cze', kickoff: 'Jue 11 Jun 2026 · 22:00 · Estadio Guadalajara' },
    { id: 'A-3', group: 'A', homeTeamId: 'cze', awayTeamId: 'rsa', kickoff: 'Jue 18 Jun 2026 · 12:00 · Atlanta Stadium' },
    { id: 'A-4', group: 'A', homeTeamId: 'mex', awayTeamId: 'kor', kickoff: 'Jue 18 Jun 2026 · 21:00 · Estadio Guadalajara' },
    { id: 'A-5', group: 'A', homeTeamId: 'cze', awayTeamId: 'mex', kickoff: 'Mie 24 Jun 2026 · 21:00 · Estadio Ciudad de Mexico' },
    { id: 'A-6', group: 'A', homeTeamId: 'rsa', awayTeamId: 'kor', kickoff: 'Mie 24 Jun 2026 · 21:00 · Estadio Monterrey' },
    { id: 'B-1', group: 'B', homeTeamId: 'can', awayTeamId: 'bih', kickoff: 'Vie 12 Jun 2026 · 15:00 · Toronto Stadium' },
    { id: 'B-2', group: 'B', homeTeamId: 'qat', awayTeamId: 'sui', kickoff: 'Sab 13 Jun 2026 · 15:00 · San Francisco Bay Area Stadium' },
    { id: 'B-3', group: 'B', homeTeamId: 'sui', awayTeamId: 'bih', kickoff: 'Jue 18 Jun 2026 · 15:00 · Los Angeles Stadium' },
    { id: 'B-4', group: 'B', homeTeamId: 'can', awayTeamId: 'qat', kickoff: 'Jue 18 Jun 2026 · 18:00 · BC Place Vancouver' },
    { id: 'B-5', group: 'B', homeTeamId: 'sui', awayTeamId: 'can', kickoff: 'Mie 24 Jun 2026 · 15:00 · BC Place Vancouver' },
    { id: 'B-6', group: 'B', homeTeamId: 'bih', awayTeamId: 'qat', kickoff: 'Mie 24 Jun 2026 · 15:00 · Seattle Stadium' },
    { id: 'C-1', group: 'C', homeTeamId: 'bra', awayTeamId: 'mar', kickoff: 'Sab 13 Jun 2026 · 18:00 · Nueva York Nueva Jersey Stadium' },
    { id: 'C-2', group: 'C', homeTeamId: 'hti', awayTeamId: 'sco', kickoff: 'Sab 13 Jun 2026 · 21:00 · Boston Stadium' },
    { id: 'C-3', group: 'C', homeTeamId: 'sco', awayTeamId: 'mar', kickoff: 'Vie 19 Jun 2026 · 18:00 · Boston Stadium' },
    { id: 'C-4', group: 'C', homeTeamId: 'bra', awayTeamId: 'hti', kickoff: 'Vie 19 Jun 2026 · 21:00 · Philadelphia Stadium' },
    { id: 'C-5', group: 'C', homeTeamId: 'bra', awayTeamId: 'sco', kickoff: 'Mie 24 Jun 2026 · 18:00 · Miami Stadium' },
    { id: 'C-6', group: 'C', homeTeamId: 'mar', awayTeamId: 'hti', kickoff: 'Mie 24 Jun 2026 · 18:00 · Atlanta Stadium' },
    { id: 'D-1', group: 'D', homeTeamId: 'usa', awayTeamId: 'par', kickoff: 'Vie 12 Jun 2026 · 21:00 · Los Angeles Stadium' },
    { id: 'D-2', group: 'D', homeTeamId: 'aus', awayTeamId: 'tur', kickoff: 'Sab 13 Jun 2026 · 00:00 · BC Place Vancouver' },
    { id: 'D-3', group: 'D', homeTeamId: 'usa', awayTeamId: 'aus', kickoff: 'Vie 19 Jun 2026 · 15:00 · Seattle Stadium' },
    { id: 'D-4', group: 'D', homeTeamId: 'tur', awayTeamId: 'par', kickoff: 'Vie 19 Jun 2026 · 00:00 · San Francisco Bay Area Stadium' },
    { id: 'D-5', group: 'D', homeTeamId: 'tur', awayTeamId: 'usa', kickoff: 'Jue 25 Jun 2026 · 22:00 · Los Angeles Stadium' },
    { id: 'D-6', group: 'D', homeTeamId: 'par', awayTeamId: 'aus', kickoff: 'Jue 25 Jun 2026 · 22:00 · San Francisco Bay Area Stadium' },
    { id: 'E-1', group: 'E', homeTeamId: 'ger', awayTeamId: 'cuw', kickoff: 'Dom 14 Jun 2026 · 13:00 · Houston Stadium' },
    { id: 'E-2', group: 'E', homeTeamId: 'civ', awayTeamId: 'ecu', kickoff: 'Dom 14 Jun 2026 · 19:00 · Philadelphia Stadium' },
    { id: 'E-3', group: 'E', homeTeamId: 'ger', awayTeamId: 'civ', kickoff: 'Sab 20 Jun 2026 · 16:00 · Toronto Stadium' },
    { id: 'E-4', group: 'E', homeTeamId: 'ecu', awayTeamId: 'cuw', kickoff: 'Sab 20 Jun 2026 · 22:00 · Kansas City Stadium' },
    { id: 'E-5', group: 'E', homeTeamId: 'cuw', awayTeamId: 'civ', kickoff: 'Jue 25 Jun 2026 · 16:00 · Philadelphia Stadium' },
    { id: 'E-6', group: 'E', homeTeamId: 'ecu', awayTeamId: 'ger', kickoff: 'Jue 25 Jun 2026 · 16:00 · Nueva York Nueva Jersey Stadium' },
    { id: 'F-1', group: 'F', homeTeamId: 'ned', awayTeamId: 'jpn', kickoff: 'Dom 14 Jun 2026 · 16:00 · Dallas Stadium' },
    { id: 'F-2', group: 'F', homeTeamId: 'swe', awayTeamId: 'tun', kickoff: 'Dom 14 Jun 2026 · 22:00 · Estadio Monterrey' },
    { id: 'F-3', group: 'F', homeTeamId: 'ned', awayTeamId: 'swe', kickoff: 'Sab 20 Jun 2026 · 13:00 · Houston Stadium' },
    { id: 'F-4', group: 'F', homeTeamId: 'tun', awayTeamId: 'jpn', kickoff: 'Sab 20 Jun 2026 · 00:00 · Estadio Monterrey' },
    { id: 'F-5', group: 'F', homeTeamId: 'jpn', awayTeamId: 'swe', kickoff: 'Jue 25 Jun 2026 · 19:00 · Dallas Stadium' },
    { id: 'F-6', group: 'F', homeTeamId: 'tun', awayTeamId: 'ned', kickoff: 'Jue 25 Jun 2026 · 19:00 · Kansas City Stadium' },
    { id: 'G-1', group: 'G', homeTeamId: 'bel', awayTeamId: 'egy', kickoff: 'Lun 15 Jun 2026 · 15:00 · Seattle Stadium' },
    { id: 'G-2', group: 'G', homeTeamId: 'irn', awayTeamId: 'nzl', kickoff: 'Lun 15 Jun 2026 · 21:00 · Los Angeles Stadium' },
    { id: 'G-3', group: 'G', homeTeamId: 'bel', awayTeamId: 'irn', kickoff: 'Dom 21 Jun 2026 · 15:00 · Los Angeles Stadium' },
    { id: 'G-4', group: 'G', homeTeamId: 'nzl', awayTeamId: 'egy', kickoff: 'Dom 21 Jun 2026 · 21:00 · BC Place Vancouver' },
    { id: 'G-5', group: 'G', homeTeamId: 'egy', awayTeamId: 'irn', kickoff: 'Vie 26 Jun 2026 · 23:00 · Seattle Stadium' },
    { id: 'G-6', group: 'G', homeTeamId: 'nzl', awayTeamId: 'bel', kickoff: 'Vie 26 Jun 2026 · 23:00 · BC Place Vancouver' },
    { id: 'H-1', group: 'H', homeTeamId: 'esp', awayTeamId: 'cpv', kickoff: 'Lun 15 Jun 2026 · 12:00 · Atlanta Stadium' },
    { id: 'H-2', group: 'H', homeTeamId: 'ksa', awayTeamId: 'uru', kickoff: 'Lun 15 Jun 2026 · 18:00 · Miami Stadium' },
    { id: 'H-3', group: 'H', homeTeamId: 'esp', awayTeamId: 'ksa', kickoff: 'Dom 21 Jun 2026 · 12:00 · Atlanta Stadium' },
    { id: 'H-4', group: 'H', homeTeamId: 'uru', awayTeamId: 'cpv', kickoff: 'Dom 21 Jun 2026 · 18:00 · Miami Stadium' },
    { id: 'H-5', group: 'H', homeTeamId: 'cpv', awayTeamId: 'ksa', kickoff: 'Vie 26 Jun 2026 · 20:00 · Houston Stadium' },
    { id: 'H-6', group: 'H', homeTeamId: 'uru', awayTeamId: 'esp', kickoff: 'Vie 26 Jun 2026 · 20:00 · Estadio Guadalajara' },
    { id: 'I-1', group: 'I', homeTeamId: 'fra', awayTeamId: 'sen', kickoff: 'Mar 16 Jun 2026 · 15:00 · New York New Jersey Stadium' },
    { id: 'I-2', group: 'I', homeTeamId: 'irq', awayTeamId: 'nor', kickoff: 'Mar 16 Jun 2026 · 18:00 · Boston Stadium' },
    { id: 'I-3', group: 'I', homeTeamId: 'fra', awayTeamId: 'irq', kickoff: 'Lun 22 Jun 2026 · 17:00 · Philadelphia Stadium' },
    { id: 'I-4', group: 'I', homeTeamId: 'nor', awayTeamId: 'sen', kickoff: 'Lun 22 Jun 2026 · 20:00 · Nueva York Nueva Jersey Stadium' },
    { id: 'I-5', group: 'I', homeTeamId: 'nor', awayTeamId: 'fra', kickoff: 'Vie 26 Jun 2026 · 15:00 · Boston Stadium' },
    { id: 'I-6', group: 'I', homeTeamId: 'sen', awayTeamId: 'irq', kickoff: 'Vie 26 Jun 2026 · 15:00 · Toronto Stadium' },
    { id: 'J-1', group: 'J', homeTeamId: 'arg', awayTeamId: 'alg', kickoff: 'Mar 16 Jun 2026 · 21:00 · Kansas City Stadium' },
    { id: 'J-2', group: 'J', homeTeamId: 'aut', awayTeamId: 'jor', kickoff: 'Mar 16 Jun 2026 · 00:00 · San Francisco Bay Area Stadium' },
    { id: 'J-3', group: 'J', homeTeamId: 'arg', awayTeamId: 'aut', kickoff: 'Lun 22 Jun 2026 · 13:00 · Dallas Stadium' },
    { id: 'J-4', group: 'J', homeTeamId: 'jor', awayTeamId: 'alg', kickoff: 'Lun 22 Jun 2026 · 23:00 · San Francisco Bay Area Stadium' },
    { id: 'J-5', group: 'J', homeTeamId: 'alg', awayTeamId: 'aut', kickoff: 'Sab 27 Jun 2026 · 22:00 · Kansas City Stadium' },
    { id: 'J-6', group: 'J', homeTeamId: 'jor', awayTeamId: 'arg', kickoff: 'Sab 27 Jun 2026 · 22:00 · Dallas Stadium' },
    { id: 'K-1', group: 'K', homeTeamId: 'por', awayTeamId: 'cod', kickoff: 'Mie 17 Jun 2026 · 13:00 · Houston Stadium' },
    { id: 'K-2', group: 'K', homeTeamId: 'uzb', awayTeamId: 'col', kickoff: 'Mie 17 Jun 2026 · 22:00 · Estadio Ciudad de Mexico' },
    { id: 'K-3', group: 'K', homeTeamId: 'por', awayTeamId: 'uzb', kickoff: 'Mar 23 Jun 2026 · 13:00 · Houston Stadium' },
    { id: 'K-4', group: 'K', homeTeamId: 'col', awayTeamId: 'cod', kickoff: 'Mar 23 Jun 2026 · 22:00 · Estadio Guadalajara' },
    { id: 'K-5', group: 'K', homeTeamId: 'col', awayTeamId: 'por', kickoff: 'Sab 27 Jun 2026 · 19:30 · Miami Stadium' },
    { id: 'K-6', group: 'K', homeTeamId: 'cod', awayTeamId: 'uzb', kickoff: 'Sab 27 Jun 2026 · 19:30 · Atlanta Stadium' },
    { id: 'L-1', group: 'L', homeTeamId: 'eng', awayTeamId: 'cro', kickoff: 'Mie 17 Jun 2026 · 16:00 · Dallas Stadium' },
    { id: 'L-2', group: 'L', homeTeamId: 'gha', awayTeamId: 'pan', kickoff: 'Mie 17 Jun 2026 · 19:00 · Toronto Stadium' },
    { id: 'L-3', group: 'L', homeTeamId: 'eng', awayTeamId: 'gha', kickoff: 'Mar 23 Jun 2026 · 16:00 · Boston Stadium' },
    { id: 'L-4', group: 'L', homeTeamId: 'pan', awayTeamId: 'cro', kickoff: 'Mar 23 Jun 2026 · 19:00 · Toronto Stadium' },
    { id: 'L-5', group: 'L', homeTeamId: 'pan', awayTeamId: 'eng', kickoff: 'Sab 27 Jun 2026 · 17:00 · New York New Jersey Stadium' },
    { id: 'L-6', group: 'L', homeTeamId: 'cro', awayTeamId: 'gha', kickoff: 'Sab 27 Jun 2026 · 17:00 · Philadelphia Stadium' },
  ],
  roundOf32Rules: [
    { id: 'r32-2', label: 'Partido 74', kickoff: 'Lun 29 Jun 2026 · Estadio Boston', homeSlot: '1E', awaySlot: '3[A/B/C/D/F]' },
    { id: 'r32-5', label: 'Partido 77', kickoff: 'Mar 30 Jun 2026 · Estadio Nueva York Nueva Jersey', homeSlot: '1I', awaySlot: '3[C/D/F/G/H]' },
    { id: 'r32-1', label: 'Partido 73', kickoff: 'Dom 28 Jun 2026 · Estadio Los Angeles', homeSlot: '2A', awaySlot: '2B' },
    { id: 'r32-3', label: 'Partido 75', kickoff: 'Lun 29 Jun 2026 · Estadio Monterrey', homeSlot: '1F', awaySlot: '2C' },
    { id: 'r32-11', label: 'Partido 83', kickoff: 'Jue 2 Jul 2026 · Estadio Toronto', homeSlot: '2K', awaySlot: '2L' },
    { id: 'r32-12', label: 'Partido 84', kickoff: 'Jue 2 Jul 2026 · Estadio Los Angeles', homeSlot: '1H', awaySlot: '2J' },
    { id: 'r32-9', label: 'Partido 81', kickoff: 'Mie 1 Jul 2026 · Estadio Bahia de San Francisco', homeSlot: '1D', awaySlot: '3[B/E/F/I/J]' },
    { id: 'r32-10', label: 'Partido 82', kickoff: 'Mie 1 Jul 2026 · Estadio Seattle', homeSlot: '1G', awaySlot: '3[A/E/H/I/J]' },
    { id: 'r32-4', label: 'Partido 76', kickoff: 'Lun 29 Jun 2026 · Estadio Houston', homeSlot: '1C', awaySlot: '2F' },
    { id: 'r32-6', label: 'Partido 78', kickoff: 'Mar 30 Jun 2026 · Estadio Dallas', homeSlot: '2E', awaySlot: '2I' },
    { id: 'r32-7', label: 'Partido 79', kickoff: 'Mar 30 Jun 2026 · Estadio Azteca Ciudad de Mexico', homeSlot: '1A', awaySlot: '3[C/E/F/H/I]' },
    { id: 'r32-8', label: 'Partido 80', kickoff: 'Mie 1 Jul 2026 · Estadio Atlanta', homeSlot: '1L', awaySlot: '3[E/H/I/J/K]' },
    { id: 'r32-14', label: 'Partido 86', kickoff: 'Vie 3 Jul 2026 · Estadio Miami', homeSlot: '1J', awaySlot: '2H' },
    { id: 'r32-16', label: 'Partido 88', kickoff: 'Vie 3 Jul 2026 · Estadio Dallas', homeSlot: '2D', awaySlot: '2G' },
    { id: 'r32-13', label: 'Partido 85', kickoff: 'Jue 2 Jul 2026 · Estadio BC Place Vancouver', homeSlot: '1B', awaySlot: '3[E/F/G/I/J]' },
    { id: 'r32-15', label: 'Partido 87', kickoff: 'Vie 3 Jul 2026 · Estadio Kansas City', homeSlot: '1K', awaySlot: '3[D/E/I/J/L]' },
  ],
  
};
