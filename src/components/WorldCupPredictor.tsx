import { useEffect, useMemo, useState } from 'react';
import {
  worldCup2026Data,
  type GroupMatch,
  type MatchOutcome,
  type RoundOf32Rule,
  type Team,
} from '../data/worldCup2026Data';

type GroupStats = {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
};

type KnockoutMatch = {
  id: string;
  label: string;
  kickoff: string;
  home: Team;
  away: Team;
  officialWinnerTeamId?: string;
};

type GroupResultMap = Record<string, MatchOutcome | undefined>;
type KnockoutPickMap = Record<string, string | undefined>;

type RankingEntry = {
  id: string;
  displayName: string;
  score: number;
  maxScore: number;
  accuracy: number;
  correctGroupMatches: number;
  totalGroupMatches: number;
  correctRoundOf32: number;
  totalRoundOf32: number;
  submittedAt: string;
};

const groups = worldCup2026Data.groups;
const groupMatches = worldCup2026Data.groupMatches;
const roundOf32Rules = worldCup2026Data.roundOf32Rules;
const groupOrder = Object.keys(groups);
const allTeams = Object.values(groups).flat();
const teamById = new Map(allTeams.map((team) => [team.id, team]));

const FLAG_BY_TEAM_ID: Record<string, string> = {
  mex: '🇲🇽', rsa: '🇿🇦', kor: '🇰🇷', cze: '🇨🇿',
  can: '🇨🇦', bih: '🇧🇦', qat: '🇶🇦', sui: '🇨🇭',
  bra: '🇧🇷', mar: '🇲🇦', hti: '🇭🇹', sco: '🏴',
  usa: '🇺🇸', par: '🇵🇾', aus: '🇦🇺', tur: '🇹🇷',
  ger: '🇩🇪', cuw: '🇨🇼', civ: '🇨🇮', ecu: '🇪🇨',
  ned: '🇳🇱', jpn: '🇯🇵', swe: '🇸🇪', tun: '🇹🇳',
  bel: '🇧🇪', egy: '🇪🇬', irn: '🇮🇷', nzl: '🇳🇿',
  esp: '🇪🇸', cpv: '🇨🇻', ksa: '🇸🇦', uru: '🇺🇾',
  fra: '🇫🇷', sen: '🇸🇳', irq: '🇮🇶', nor: '🇳🇴',
  arg: '🇦🇷', alg: '🇩🇿', aut: '🇦🇹', jor: '🇯🇴',
  por: '🇵🇹', cod: '🇨🇩', uzb: '🇺🇿', col: '🇨🇴',
  eng: '🏴', cro: '🇭🇷', gha: '🇬🇭', pan: '🇵🇦',
};

const scoreByResult: Record<MatchOutcome, [number, number]> = {
  home: [2, 1],
  draw: [1, 1],
  away: [1, 2],
};

const matchesByGroup = groupMatches.reduce<Record<string, GroupMatch[]>>((acc, match) => {
  if (!acc[match.group]) {
    acc[match.group] = [];
  }
  acc[match.group].push(match);
  return acc;
}, {});

const createUnknownTeam = (label: string): Team => ({
  id: `tbd-${label.toLowerCase().replace(/\s+/g, '-')}`,
  name: label,
  group: '-',
});

const getTeamName = (teamId: string) => teamById.get(teamId)?.name ?? 'Por definir';
const getTeamFlag = (teamId: string) => FLAG_BY_TEAM_ID[teamId] ?? '🏳️';

const sortTable = (table: GroupStats[]) => {
  return [...table].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    const aName = getTeamName(a.teamId);
    const bName = getTeamName(b.teamId);
    return aName.localeCompare(bName);
  });
};

const parseBestThirdGroups = (slot: string): string[] => {
  const match = slot.match(/^3\[([A-Z/]+)\]$/);
  if (!match) return [];
  return match[1].split('/');
};

const resolveSlotTeam = (
  slot: string,
  tablesByGroup: Record<string, GroupStats[]>,
  thirdByGroup: Record<string, Team>,
  usedThirdGroups: Set<string>,
): Team => {
  if (/^[12][A-Z]$/.test(slot)) {
    const position = Number(slot[0]);
    const groupCode = slot[1];
    const row = tablesByGroup[groupCode]?.[position - 1];
    if (!row) return createUnknownTeam(slot);
    return teamById.get(row.teamId) ?? createUnknownTeam(slot);
  }

  if (slot.startsWith('3[')) {
    const allowed = parseBestThirdGroups(slot);
    const candidates = allowed
      .map((groupCode) => thirdByGroup[groupCode])
      .filter((team): team is Team => Boolean(team));

    const selected = candidates.find((team) => !usedThirdGroups.has(team.group));
    if (selected) {
      usedThirdGroups.add(selected.group);
      return selected;
    }

    return createUnknownTeam(`Tercero ${slot}`);
  }

  return createUnknownTeam(slot);
};

const buildNextRound = (
  source: KnockoutMatch[],
  picks: KnockoutPickMap,
  targetPrefix: string,
  label: string,
): KnockoutMatch[] => {
  const participants = source.map((match, index) => {
    const locked = match.officialWinnerTeamId;
    if (locked && (locked === match.home.id || locked === match.away.id)) {
      return locked === match.home.id ? match.home : match.away;
    }

    const selected = picks[match.id];
    const valid = selected === match.home.id || selected === match.away.id;
    if (valid) {
      return selected === match.home.id ? match.home : match.away;
    }

    return createUnknownTeam(`Ganador ${match.label || `${targetPrefix.toUpperCase()} ${index + 1}`}`);
  });

  const list: KnockoutMatch[] = [];
  for (let i = 0; i < participants.length; i += 2) {
    list.push({
      id: `${targetPrefix}-${Math.floor(i / 2) + 1}`,
      label,
      kickoff: '',
      home: participants[i],
      away: participants[i + 1],
    });
  }

  return list;
};

const stageOrder = ['r32', 'r16', 'qf', 'sf', 'final'];

const trimKnockoutPicks = (picks: KnockoutPickMap, stage: string): KnockoutPickMap => {
  const stageIndex = stageOrder.indexOf(stage);
  if (stageIndex < 0) return picks;

  const cleaned: KnockoutPickMap = {};
  Object.entries(picks).forEach(([key, value]) => {
    const [matchStage] = key.split('-');
    const currentIndex = stageOrder.indexOf(matchStage);
    if (currentIndex >= 0 && currentIndex <= stageIndex) {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

export default function WorldCupPredictor() {
  const [groupResults, setGroupResults] = useState<GroupResultMap>({});
  const [knockoutPicks, setKnockoutPicks] = useState<KnockoutPickMap>({});
  const [copyMsg, setCopyMsg] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);

  const tablesByGroup = useMemo(() => {
    return groupOrder.reduce<Record<string, GroupStats[]>>((acc, groupCode) => {
      const base = groups[groupCode].map<GroupStats>((team) => ({
        teamId: team.id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
      }));

      const statsByTeam = new Map(base.map((item) => [item.teamId, item]));

      (matchesByGroup[groupCode] ?? []).forEach((match) => {
        const result = match.officialResult ?? groupResults[match.id];
        if (!result) return;

        const home = statsByTeam.get(match.homeTeamId);
        const away = statsByTeam.get(match.awayTeamId);
        if (!home || !away) return;

        const [homeGoals, awayGoals] = scoreByResult[result];

        home.played += 1;
        away.played += 1;

        home.goalsFor += homeGoals;
        home.goalsAgainst += awayGoals;
        away.goalsFor += awayGoals;
        away.goalsAgainst += homeGoals;

        if (result === 'home') {
          home.wins += 1;
          away.losses += 1;
          home.points += 3;
        } else if (result === 'away') {
          away.wins += 1;
          home.losses += 1;
          away.points += 3;
        } else {
          home.draws += 1;
          away.draws += 1;
          home.points += 1;
          away.points += 1;
        }

        home.goalDiff = home.goalsFor - home.goalsAgainst;
        away.goalDiff = away.goalsFor - away.goalsAgainst;
      });

      acc[groupCode] = sortTable(base);
      return acc;
    }, {});
  }, [groupResults]);

  const thirdByGroup = useMemo(() => {
    const map: Record<string, Team> = {};
    groupOrder.forEach((groupCode) => {
      const third = tablesByGroup[groupCode]?.[2];
      if (!third) return;
      const team = teamById.get(third.teamId);
      if (team) {
        map[groupCode] = team;
      }
    });
    return map;
  }, [tablesByGroup]);

  const roundOf32 = useMemo(() => {
    const usedThirdGroups = new Set<string>();

    return roundOf32Rules.map<KnockoutMatch>((rule: RoundOf32Rule) => {
      const home = resolveSlotTeam(rule.homeSlot, tablesByGroup, thirdByGroup, usedThirdGroups);
      const away = resolveSlotTeam(rule.awaySlot, tablesByGroup, thirdByGroup, usedThirdGroups);

      return {
        id: rule.id,
        label: `${rule.label} · ${rule.homeSlot} vs ${rule.awaySlot}`,
        kickoff: rule.kickoff,
        home,
        away,
        officialWinnerTeamId: rule.officialWinnerTeamId,
      };
    });
  }, [tablesByGroup, thirdByGroup]);

  const roundOf16 = useMemo(() => buildNextRound(roundOf32, knockoutPicks, 'r16', 'Octavos de final'), [knockoutPicks, roundOf32]);
  const quarterfinals = useMemo(() => buildNextRound(roundOf16, knockoutPicks, 'qf', 'Cuartos de final'), [knockoutPicks, roundOf16]);
  const semifinals = useMemo(() => buildNextRound(quarterfinals, knockoutPicks, 'sf', 'Semifinales'), [knockoutPicks, quarterfinals]);
  const final = useMemo(() => buildNextRound(semifinals, knockoutPicks, 'final', 'Final'), [knockoutPicks, semifinals]);

  const champion = useMemo(() => {
    const finalMatch = final[0];
    if (!finalMatch) return undefined;

    if (finalMatch.officialWinnerTeamId) {
      return finalMatch.officialWinnerTeamId === finalMatch.home.id ? finalMatch.home : finalMatch.away;
    }

    const selected = knockoutPicks[finalMatch.id];
    const valid = selected === finalMatch.home.id || selected === finalMatch.away.id;
    if (!valid) return undefined;

    return selected === finalMatch.home.id ? finalMatch.home : finalMatch.away;
  }, [final, knockoutPicks]);

  const handleGroupResult = (match: GroupMatch, result: MatchOutcome) => {
    if (match.officialResult) return;

    setGroupResults((previous) => {
      const current = previous[match.id];
      return {
        ...previous,
        [match.id]: current === result ? undefined : result,
      };
    });
    setKnockoutPicks({});
  };

  const handleKnockoutPick = (match: KnockoutMatch, stage: string, teamId: string) => {
    if (match.officialWinnerTeamId) return;

    setKnockoutPicks((previous) => {
      const selected = previous[match.id];
      const nextSelected = selected === teamId ? undefined : teamId;
      const base = trimKnockoutPicks(previous, stage);
      return {
        ...base,
        [match.id]: nextSelected,
      };
    });
  };

  const exportCurrentState = async () => {
    const payload = {
      groupResults,
      knockoutPicks,
      generatedAt: new Date().toISOString(),
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyMsg('Estado copiado. Pegalo en tu JSON/archivo para guardarlo.');
      setTimeout(() => setCopyMsg(''), 2200);
    } catch {
      setCopyMsg('No se pudo copiar el estado al portapapeles.');
      setTimeout(() => setCopyMsg(''), 2200);
    }
  };

  const fetchRanking = async () => {
    try {
      const response = await fetch('/api/ranking');
      if (!response.ok) {
        throw new Error('No se pudo cargar ranking');
      }

      const data = (await response.json()) as { ranking?: RankingEntry[] };
      setRanking(Array.isArray(data.ranking) ? data.ranking : []);
    } catch {
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    void fetchRanking();
  }, []);

  const submitToRanking = async () => {
    const cleanName = playerName.trim();
    if (!cleanName) {
      setSubmitMsg('Ingresa un nombre para publicar tu prediccion.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMsg('');

    try {
      const response = await fetch('/api/ranking/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: cleanName,
          groupResults,
          knockoutPicks,
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo enviar la prediccion');
      }

      setSubmitMsg('Prediccion publicada en el ranking.');
      await fetchRanking();
    } catch {
      setSubmitMsg('Error al publicar. Verifica que el backend este corriendo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderKnockoutStage = (stageMatches: KnockoutMatch[], stage: string) => (
    <div className="space-y-3">
      {stageMatches.map((match) => {
        const selected = match.officialWinnerTeamId ?? knockoutPicks[match.id];
        const homeActive = selected === match.home.id;
        const awayActive = selected === match.away.id;

        return (
          <div key={match.id} className="rounded-2xl border border-blue-500/10 bg-black p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-400">{match.label}</p>
            {match.kickoff ? <p className="mb-3 text-xs text-slate-500">{match.kickoff}</p> : null}
            <div className="grid gap-2 md:grid-cols-2">
              <button
                type="button"
                disabled={Boolean(match.officialWinnerTeamId)}
                onClick={() => handleKnockoutPick(match, stage, match.home.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  homeActive
                    ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                    : 'border-blue-400/10 bg-slate-950 text-slate-200 hover:bg-slate-900'
                } ${match.officialWinnerTeamId ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <span className="mr-2" aria-hidden="true">{getTeamFlag(match.home.id)}</span>
                {match.home.name}
              </button>
              <button
                type="button"
                disabled={Boolean(match.officialWinnerTeamId)}
                onClick={() => handleKnockoutPick(match, stage, match.away.id)}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                  awayActive
                    ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                    : 'border-blue-400/10 bg-slate-950 text-slate-200 hover:bg-slate-900'
                } ${match.officialWinnerTeamId ? 'cursor-not-allowed opacity-80' : ''}`}
              >
                <span className="mr-2" aria-hidden="true">{getTeamFlag(match.away.id)}</span>
                {match.away.name}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section id="worldcup" className="border-y border-blue-500/10 bg-gradient-to-b from-slate-950 to-black">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="mb-10 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Beneficio Mundial</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">World Cup Predictor editable por archivo</h2>
          <p className="mt-4 text-slate-300">
            Los cruces reales de ronda de 32 se leen desde archivo, y puedes fijar resultados oficiales en el mismo JSON/TS.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
          Archivo editable: src/data/worldCup2026Data.ts
        </div>

        <div className="mb-10 rounded-3xl border border-blue-400/10 bg-slate-950 p-6">
          <div className="mb-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCurrentState}
              className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Copiar estado actual en JSON
            </button>
            {copyMsg ? <p className="text-xs text-cyan-200">{copyMsg}</p> : null}
          </div>

          <div className="mb-4 grid gap-3 rounded-2xl border border-blue-500/10 bg-black p-4 md:grid-cols-[1fr_auto]">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Nombre para ranking publico
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="Tu nombre o alias"
                className="w-full rounded-xl border border-blue-400/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
            </div>

            <button
              type="button"
              onClick={submitToRanking}
              disabled={isSubmitting}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar en ranking'}
            </button>
          </div>

          {submitMsg ? <p className="mb-4 text-xs text-cyan-200">{submitMsg}</p> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-blue-400/10 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Partidos de grupos</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">{groupMatches.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-400/10 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Cruces de ronda de 32</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">{roundOf32Rules.length}</p>
            </div>
            <div className="rounded-2xl border border-blue-400/10 bg-black p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Campeon pronosticado</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">
                {champion ? `${getTeamFlag(champion.id)} ${champion.name}` : 'Por definir'}
              </p>
            </div>
          </div>
        </div>

        <section className="mb-10 rounded-3xl border border-blue-500/10 bg-slate-950 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold">Ranking publico de aciertos</h3>
            <button
              type="button"
              onClick={fetchRanking}
              className="rounded-xl border border-blue-400/20 bg-black px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
            >
              Actualizar ranking
            </button>
          </div>

          {rankingLoading ? (
            <p className="text-sm text-slate-400">Cargando ranking...</p>
          ) : ranking.length === 0 ? (
            <p className="text-sm text-slate-400">Aun no hay predicciones publicadas.</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-blue-500/10">
              <table className="w-full text-left text-sm text-slate-200">
                <thead className="bg-black text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Pos</th>
                    <th className="px-3 py-3">Jugador</th>
                    <th className="px-3 py-3">Puntaje</th>
                    <th className="px-3 py-3">Precision</th>
                    <th className="px-3 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.slice(0, 25).map((entry, index) => (
                    <tr key={entry.id} className="border-t border-blue-500/10 bg-slate-950">
                      <td className="px-3 py-3 font-semibold text-cyan-300">#{index + 1}</td>
                      <td className="px-3 py-3">{entry.displayName}</td>
                      <td className="px-3 py-3">{entry.score}/{entry.maxScore}</td>
                      <td className="px-3 py-3">{entry.accuracy}%</td>
                      <td className="px-3 py-3">{new Date(entry.submittedAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          {groupOrder.map((groupCode) => {
            const groupTeams = groups[groupCode];
            const groupRows = tablesByGroup[groupCode] ?? [];
            const fixtures = matchesByGroup[groupCode] ?? [];

            return (
              <article key={groupCode} className="rounded-3xl border border-blue-400/10 bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Grupo {groupCode}</h3>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                    {groupTeams.length} selecciones
                  </span>
                </div>

                <div className="mb-4 overflow-hidden rounded-2xl border border-blue-500/10">
                  <table className="w-full text-left text-xs text-slate-200">
                    <thead className="bg-black text-slate-400">
                      <tr>
                        <th className="px-2 py-2">Equipo</th>
                        <th className="px-2 py-2">PJ</th>
                        <th className="px-2 py-2">DG</th>
                        <th className="px-2 py-2">PTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupRows.map((row, index) => (
                        <tr
                          key={row.teamId}
                          className={`border-t border-blue-500/10 ${
                            index < 2 ? 'bg-emerald-500/10' : index === 2 ? 'bg-amber-500/10' : 'bg-slate-950'
                          }`}
                        >
                          <td className="px-2 py-2">
                            <span className="mr-2" aria-hidden="true">{getTeamFlag(row.teamId)}</span>
                            {getTeamName(row.teamId)}
                          </td>
                          <td className="px-2 py-2">{row.played}</td>
                          <td className="px-2 py-2">{row.goalDiff >= 0 ? `+${row.goalDiff}` : row.goalDiff}</td>
                          <td className="px-2 py-2 font-semibold text-cyan-200">{row.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3">
                  {fixtures.map((match) => {
                    const effective = match.officialResult ?? groupResults[match.id];
                    const homeName = getTeamName(match.homeTeamId);
                    const awayName = getTeamName(match.awayTeamId);
                    const locked = Boolean(match.officialResult);

                    return (
                      <div key={match.id} className="rounded-2xl border border-blue-400/10 bg-black p-3">
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">{match.kickoff}</p>
                        <p className="mb-3 text-sm text-slate-200">
                          {homeName} vs {awayName}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => handleGroupResult(match, 'home')}
                            className={`rounded-lg border px-2 py-2 transition ${
                              effective === 'home'
                                ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                                : 'border-blue-400/10 bg-slate-950 text-slate-300 hover:bg-slate-900'
                            } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                          >
                            <span className="mr-1" aria-hidden="true">{getTeamFlag(match.homeTeamId)}</span>
                            {homeName}
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => handleGroupResult(match, 'draw')}
                            className={`rounded-lg border px-2 py-2 transition ${
                              effective === 'draw'
                                ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                                : 'border-blue-400/10 bg-slate-950 text-slate-300 hover:bg-slate-900'
                            } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                          >
                            Empate
                          </button>
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => handleGroupResult(match, 'away')}
                            className={`rounded-lg border px-2 py-2 transition ${
                              effective === 'away'
                                ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100'
                                : 'border-blue-400/10 bg-slate-950 text-slate-300 hover:bg-slate-900'
                            } ${locked ? 'cursor-not-allowed opacity-80' : ''}`}
                          >
                            <span className="mr-1" aria-hidden="true">{getTeamFlag(match.awayTeamId)}</span>
                            {awayName}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-3xl border border-blue-500/10 bg-slate-950 p-5 xl:col-span-2">
            <h3 className="mb-4 text-xl font-semibold">Ronda de 32 (cruces oficiales)</h3>
            {renderKnockoutStage(roundOf32, 'r32')}
          </div>

          <div className="rounded-3xl border border-blue-500/10 bg-slate-950 p-5">
            <h3 className="mb-4 text-xl font-semibold">Octavos</h3>
            {renderKnockoutStage(roundOf16, 'r16')}
          </div>

          <div className="rounded-3xl border border-blue-500/10 bg-slate-950 p-5">
            <h3 className="mb-4 text-xl font-semibold">Cuartos</h3>
            {renderKnockoutStage(quarterfinals, 'qf')}
          </div>

          <div className="rounded-3xl border border-blue-500/10 bg-slate-950 p-5">
            <h3 className="mb-4 text-xl font-semibold">Semis + Final</h3>
            {renderKnockoutStage(semifinals, 'sf')}
            <div className="mt-4">{renderKnockoutStage(final, 'final')}</div>
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              Campeon proyectado: <span className="font-semibold">{champion ? `${getTeamFlag(champion.id)} ${champion.name}` : 'Por definir'}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
