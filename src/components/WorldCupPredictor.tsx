import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  worldCup2026Data,
  type GroupMatch,
  type MatchOutcome,
  type MatchScore,
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

type ScoreDraft = {
  homeGoals?: number;
  awayGoals?: number;
};

type ScorePickMap = Record<string, ScoreDraft | undefined>;

type OfficialMatchStatus = {
  matchCode: string;
  homeTeamId?: string;
  awayTeamId?: string;
  officialScore?: MatchScore;
  officialResult?: MatchOutcome;
  officialWinnerTeamId?: string;
  isLocked: boolean;
};

type KnockoutScorePayload = MatchScore & {
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string;
};

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
  correctExactScores: number;
  totalExactScores: number;
  submittedAt: string;
};

type SavedPrediction = {
  id: string;
  displayName: string;
  groupScores: Record<string, MatchScore>;
  knockoutScores: Record<string, KnockoutScorePayload>;
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
const isRealTeam = (team: Team) => !team.id.startsWith('tbd-');

const getOutcomeFromScore = (score: MatchScore): MatchOutcome => {
  if (score.homeGoals > score.awayGoals) return 'home';
  if (score.awayGoals > score.homeGoals) return 'away';
  return 'draw';
};

const getCompleteScore = (score?: ScoreDraft): MatchScore | undefined => {
  if (!score || score.homeGoals === undefined || score.awayGoals === undefined) return undefined;
  return {
    homeGoals: score.homeGoals,
    awayGoals: score.awayGoals,
  };
};

const formatScore = (score?: MatchScore) => {
  if (!score) return '';
  return `${score.homeGoals}-${score.awayGoals}`;
};

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

const stageOrder = ['r32', 'r16', 'qf', 'sf', 'final'];

const trimScorePicks = (picks: ScorePickMap, stage: string): ScorePickMap => {
  const stageIndex = stageOrder.indexOf(stage);
  if (stageIndex < 0) return picks;

  const cleaned: ScorePickMap = {};
  Object.entries(picks).forEach(([key, value]) => {
    const [matchStage] = key.split('-');
    const currentIndex = stageOrder.indexOf(matchStage);
    if (currentIndex < 0 || currentIndex <= stageIndex) {
      cleaned[key] = value;
    }
  });

  return cleaned;
};

export default function WorldCupPredictor() {
  const predictorSectionRef = useRef<HTMLElement | null>(null);
  const [scorePicks, setScorePicks] = useState<ScorePickMap>({});
  const [officialMatches, setOfficialMatches] = useState<Record<string, OfficialMatchStatus>>({});
  const [copyMsg, setCopyMsg] = useState('');
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [submissionId, setSubmissionId] = useState('');
  const [loadSubmissionId, setLoadSubmissionId] = useState('');
  const [loadMsg, setLoadMsg] = useState('');
  const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [adminMatchCode, setAdminMatchCode] = useState(groupMatches[0]?.id ?? '');
  const [adminHomeGoals, setAdminHomeGoals] = useState('');
  const [adminAwayGoals, setAdminAwayGoals] = useState('');
  const [adminHomeTeamCode, setAdminHomeTeamCode] = useState('');
  const [adminAwayTeamCode, setAdminAwayTeamCode] = useState('');
  const [adminWinnerTeamCode, setAdminWinnerTeamCode] = useState('');
  const [adminMsg, setAdminMsg] = useState('');
  const [isSavingAdminResult, setIsSavingAdminResult] = useState(false);
  const [isPredictorVisible, setIsPredictorVisible] = useState(false);

  const getOfficialStatus = useCallback((matchId: string) => officialMatches[matchId], [officialMatches]);

  const getOfficialScore = useCallback((matchId: string, fallback?: MatchScore) => {
    return getOfficialStatus(matchId)?.officialScore ?? fallback;
  }, [getOfficialStatus]);

  const getOfficialResult = (matchId: string, fallbackScore?: MatchScore, fallbackResult?: MatchOutcome) => {
    const status = getOfficialStatus(matchId);
    if (status?.officialResult) return status.officialResult;
    if (status?.officialScore) return getOutcomeFromScore(status.officialScore);
    if (fallbackScore) return getOutcomeFromScore(fallbackScore);
    return fallbackResult;
  };

  const getOfficialWinnerTeamId = useCallback((matchId: string, fallback?: string) => {
    return getOfficialStatus(matchId)?.officialWinnerTeamId ?? fallback;
  }, [getOfficialStatus]);

  const isMatchLocked = (matchId: string, fallbackScore?: MatchScore, fallbackWinner?: string) => {
    const status = getOfficialStatus(matchId);
    return Boolean(status?.isLocked || status?.officialScore || fallbackScore || fallbackWinner);
  };

  const getPredictedWinner = useCallback((match: KnockoutMatch) => {
    const score = getCompleteScore(scorePicks[match.id]);
    if (!score) return undefined;
    const outcome = getOutcomeFromScore(score);
    if (outcome === 'home') return match.home.id;
    if (outcome === 'away') return match.away.id;
    return undefined;
  }, [scorePicks]);

  const getWinnerTeamFromMatch = useCallback((match: KnockoutMatch) => {
    const officialWinnerTeamId = getOfficialWinnerTeamId(match.id, match.officialWinnerTeamId);
    if (officialWinnerTeamId === match.home.id) return match.home;
    if (officialWinnerTeamId === match.away.id) return match.away;

    const predictedWinnerTeamId = getPredictedWinner(match);
    if (predictedWinnerTeamId === match.home.id) return match.home;
    if (predictedWinnerTeamId === match.away.id) return match.away;

    return undefined;
  }, [getOfficialWinnerTeamId, getPredictedWinner]);

  const buildNextRound = useCallback((
    source: KnockoutMatch[],
    targetPrefix: string,
    label: string,
  ): KnockoutMatch[] => {
    const participants = source.map((match, index) => {
      return getWinnerTeamFromMatch(match) ?? createUnknownTeam(`Ganador ${match.label || `${targetPrefix.toUpperCase()} ${index + 1}`}`);
    });

    const list: KnockoutMatch[] = [];
    for (let i = 0; i < participants.length; i += 2) {
      const id = `${targetPrefix}-${Math.floor(i / 2) + 1}`;
      list.push({
        id,
        label,
        kickoff: '',
        home: participants[i],
        away: participants[i + 1],
        officialWinnerTeamId: getOfficialWinnerTeamId(id),
      });
    }

    return list;
  }, [getOfficialWinnerTeamId, getWinnerTeamFromMatch]);

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
        const score = getOfficialScore(match.id, match.officialScore) ?? getCompleteScore(scorePicks[match.id]);
        if (!score) return;

        const home = statsByTeam.get(match.homeTeamId);
        const away = statsByTeam.get(match.awayTeamId);
        if (!home || !away) return;

        const result = getOutcomeFromScore(score);

        home.played += 1;
        away.played += 1;

        home.goalsFor += score.homeGoals;
        home.goalsAgainst += score.awayGoals;
        away.goalsFor += score.awayGoals;
        away.goalsAgainst += score.homeGoals;

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
  }, [getOfficialScore, scorePicks]);

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
        officialWinnerTeamId: getOfficialWinnerTeamId(rule.id, rule.officialWinnerTeamId),
      };
    });
  }, [getOfficialWinnerTeamId, tablesByGroup, thirdByGroup]);

  const roundOf16 = useMemo(() => buildNextRound(roundOf32, 'r16', 'Octavos de final'), [buildNextRound, roundOf32]);
  const quarterfinals = useMemo(() => buildNextRound(roundOf16, 'qf', 'Cuartos de final'), [buildNextRound, roundOf16]);
  const semifinals = useMemo(() => buildNextRound(quarterfinals, 'sf', 'Semifinales'), [buildNextRound, quarterfinals]);
  const final = useMemo(() => buildNextRound(semifinals, 'final', 'Final'), [buildNextRound, semifinals]);

  const knockoutMatches = useMemo(
    () => [...roundOf32, ...roundOf16, ...quarterfinals, ...semifinals, ...final],
    [final, quarterfinals, roundOf16, roundOf32, semifinals],
  );

  const allMatchCodes = useMemo(() => {
    return [...groupMatches.map((match) => match.id), ...knockoutMatches.map((match) => match.id)];
  }, [knockoutMatches]);

  const champion = useMemo(() => {
    const finalMatch = final[0];
    if (!finalMatch) return undefined;
    return getWinnerTeamFromMatch(finalMatch);
  }, [final, getWinnerTeamFromMatch]);

  const fetchMatchStatus = async () => {
    try {
      const response = await fetch('/api/matches/status');
      if (!response.ok) {
        throw new Error('No se pudo cargar estado de partidos');
      }

      const data = (await response.json()) as { matches?: OfficialMatchStatus[] };
      const next = (data.matches ?? []).reduce<Record<string, OfficialMatchStatus>>((acc, match) => {
        acc[match.matchCode] = match;
        return acc;
      }, {});
      setOfficialMatches(next);
    } catch {
      setOfficialMatches({});
    } finally {
      setStatusLoading(false);
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
    void fetchMatchStatus();
    void fetchRanking();
  }, []);

  useEffect(() => {
    const section = predictorSectionRef.current;
    if (!section) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPredictorVisible(entry.isIntersecting);
      },
      { threshold: 0.02 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const updateScore = (matchId: string, side: keyof MatchScore, rawValue: string, stage?: string) => {
    const parsed = rawValue === '' ? undefined : Number(rawValue);
    if (parsed !== undefined && (!Number.isInteger(parsed) || parsed < 0 || parsed > 99)) return;

    setScorePicks((previous) => {
      const base = stage ? trimScorePicks(previous, stage) : { ...previous };
      const current = base[matchId] ?? {};
      const next = {
        ...current,
        [side]: parsed,
      };

      if (next.homeGoals === undefined && next.awayGoals === undefined) {
        delete base[matchId];
        return base;
      }

      return {
        ...base,
        [matchId]: next,
      };
    });
  };

  const getPredictionPayload = () => {
    const groupScores = groupMatches.reduce<Record<string, MatchScore>>((acc, match) => {
      if (isMatchLocked(match.id, match.officialScore)) return acc;
      const score = getCompleteScore(scorePicks[match.id]);
      if (score) {
        acc[match.id] = score;
      }
      return acc;
    }, {});

    const knockoutScores = knockoutMatches.reduce<Record<string, KnockoutScorePayload>>((acc, match) => {
      if (isMatchLocked(match.id, undefined, match.officialWinnerTeamId) || !isRealTeam(match.home) || !isRealTeam(match.away)) {
        return acc;
      }

      const score = getCompleteScore(scorePicks[match.id]);
      if (!score) return acc;

      const outcome = getOutcomeFromScore(score);
      if (outcome === 'draw') return acc;

      acc[match.id] = {
        ...score,
        homeTeamId: match.home.id,
        awayTeamId: match.away.id,
        winnerTeamId: outcome === 'home' ? match.home.id : match.away.id,
      };
      return acc;
    }, {});

    return {
      groupScores,
      knockoutScores,
      generatedAt: new Date().toISOString(),
    };
  };

  const buildScorePickMap = (
    groupScores?: Record<string, unknown>,
    knockoutScores?: Record<string, unknown>,
  ) => {
    const nextScores: ScorePickMap = {};

    Object.entries(groupScores ?? {}).forEach(([matchId, value]) => {
      const score = getCompleteScore(value as ScoreDraft);
      if (score) {
        nextScores[matchId] = score;
      }
    });

    Object.entries(knockoutScores ?? {}).forEach(([matchId, value]) => {
      const score = getCompleteScore(value as ScoreDraft);
      if (score) {
        nextScores[matchId] = score;
      }
    });

    return nextScores;
  };

  const importPredictionJson = () => {
    try {
      const parsed = JSON.parse(importText) as {
        groupScores?: Record<string, unknown>;
        knockoutScores?: Record<string, unknown>;
      };

      const nextScores = buildScorePickMap(parsed.groupScores, parsed.knockoutScores);
      setScorePicks(nextScores);
      setSubmissionId('');
      setImportMsg(`Prediccion cargada: ${Object.keys(nextScores).length} marcadores.`);
      setTimeout(() => setImportMsg(''), 2600);
    } catch {
      setImportMsg('JSON invalido. Revisa que pegaste el objeto completo.');
    }
  };

  const clearPrediction = () => {
    setScorePicks({});
    setImportText('');
    setSubmissionId('');
    setLoadSubmissionId('');
    setImportMsg('Prediccion limpiada.');
    setTimeout(() => setImportMsg(''), 1800);
  };

  const loadSavedPrediction = async () => {
    const cleanSubmissionId = loadSubmissionId.trim();
    if (!cleanSubmissionId) {
      setLoadMsg('Ingresa el ID de comprobante.');
      return;
    }

    setIsLoadingSubmission(true);
    setLoadMsg('');

    try {
      const response = await fetch(`/api/ranking/submissions/${encodeURIComponent(cleanSubmissionId)}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar la prediccion');
      }

      const data = (await response.json()) as { submission?: SavedPrediction };
      if (!data.submission) {
        throw new Error('Prediccion no encontrada');
      }

      const nextScores = buildScorePickMap(data.submission.groupScores, data.submission.knockoutScores);
      setScorePicks(nextScores);
      setPlayerName(data.submission.displayName);
      setSubmissionId(data.submission.id);
      setLoadSubmissionId(data.submission.id);
      setLoadMsg(`Jugador cargado: ${data.submission.displayName}. Puedes seguir agregando marcadores.`);
    } catch {
      setLoadMsg('No se encontro ese ID o el backend no pudo cargarlo.');
    } finally {
      setIsLoadingSubmission(false);
    }
  };

  const exportCurrentState = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(getPredictionPayload(), null, 2));
      setCopyMsg('Estado copiado en JSON.');
      setTimeout(() => setCopyMsg(''), 2200);
    } catch {
      setCopyMsg('No se pudo copiar el estado al portapapeles.');
      setTimeout(() => setCopyMsg(''), 2200);
    }
  };

  const submitToRanking = async () => {
    const cleanName = playerName.trim();
    if (!cleanName) {
      setSubmitMsg('Ingresa un nombre para publicar tu prediccion.');
      return;
    }

    setIsSubmitting(true);
    setSubmitMsg('');

    try {
      const payload = getPredictionPayload();
      const updatingExistingSubmission = Boolean(submissionId);
      const response = await fetch(
        updatingExistingSubmission
          ? `/api/ranking/submissions/${encodeURIComponent(submissionId)}`
          : '/api/ranking/submit',
        {
          method: updatingExistingSubmission ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            displayName: cleanName,
            groupScores: payload.groupScores,
            knockoutScores: payload.knockoutScores,
          }),
        },
      );

      if (!response.ok) {
        throw new Error('No se pudo enviar la prediccion');
      }

      const data = (await response.json()) as { entry?: RankingEntry; submission?: SavedPrediction };
      const nextSubmissionId = data.entry?.id ?? data.submission?.id ?? submissionId;
      setSubmissionId(nextSubmissionId);
      setLoadSubmissionId(nextSubmissionId);
      setSubmitMsg(
        updatingExistingSubmission
          ? 'Prediccion actualizada. Conserva el mismo ID de comprobante.'
          : nextSubmissionId
          ? 'Prediccion publicada. Guarda este ID para comprobar tu participacion.'
          : 'Prediccion publicada en el ranking.',
      );
      await fetchRanking();
    } catch {
      setSubmitMsg('Error al publicar. Verifica que el backend este corriendo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySubmissionId = async () => {
    if (!submissionId) return;

    try {
      await navigator.clipboard.writeText(submissionId);
      setSubmitMsg('ID copiado. Guardalo como comprobante de tu prediccion.');
    } catch {
      setSubmitMsg('No se pudo copiar el ID. Copialo manualmente.');
    }
  };

  const saveAdminResult = async () => {
    const homeGoals = Number(adminHomeGoals);
    const awayGoals = Number(adminAwayGoals);
    const selectedAdminIsGroupMatch = groupMatches.some((match) => match.id === adminMatchCode);

    if (!adminToken.trim()) {
      setAdminMsg('Ingresa el token admin.');
      return;
    }

    if (!adminMatchCode || !Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
      setAdminMsg('Selecciona partido y marcador valido.');
      return;
    }

    setIsSavingAdminResult(true);
    setAdminMsg('');

    try {
      const response = await fetch(`/api/admin/matches/${encodeURIComponent(adminMatchCode)}/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': adminToken.trim(),
        },
        body: JSON.stringify({
          homeGoals,
          awayGoals,
          homeTeamCode: selectedAdminIsGroupMatch ? undefined : adminHomeTeamCode.trim() || undefined,
          awayTeamCode: selectedAdminIsGroupMatch ? undefined : adminAwayTeamCode.trim() || undefined,
          winnerTeamCode: selectedAdminIsGroupMatch ? undefined : adminWinnerTeamCode.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'No se pudo guardar resultado');
      }

      setAdminMsg('Resultado guardado y partido cerrado.');
      setAdminHomeGoals('');
      setAdminAwayGoals('');
      setAdminWinnerTeamCode('');
      await fetchMatchStatus();
      await fetchRanking();
    } catch (error) {
      setAdminMsg(error instanceof Error ? error.message : 'Error al guardar resultado.');
    } finally {
      setIsSavingAdminResult(false);
    }
  };

  const renderScoreInputs = (matchId: string, options?: { locked?: boolean; stage?: string; officialScore?: MatchScore }) => {
    const score = options?.officialScore ?? scorePicks[matchId] ?? {};
    const disabled = Boolean(options?.locked);

    return (
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <input
          type="number"
          min="0"
          max="99"
          inputMode="numeric"
          disabled={disabled}
          value={score.homeGoals ?? ''}
          onChange={(event) => updateScore(matchId, 'homeGoals', event.target.value, options?.stage)}
          className="w-full rounded-lg border border-blue-400/15 bg-slate-950 px-2 py-2 text-center text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <span className="text-sm font-semibold text-slate-500">-</span>
        <input
          type="number"
          min="0"
          max="99"
          inputMode="numeric"
          disabled={disabled}
          value={score.awayGoals ?? ''}
          onChange={(event) => updateScore(matchId, 'awayGoals', event.target.value, options?.stage)}
          className="w-full rounded-lg border border-blue-400/15 bg-slate-950 px-2 py-2 text-center text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
        />
      </div>
    );
  };

  const renderKnockoutStage = (stageMatches: KnockoutMatch[], stage: string) => (
    <div className="space-y-3">
      {stageMatches.map((match) => {
        const officialScore = getOfficialScore(match.id);
        const selected = getOfficialWinnerTeamId(match.id, match.officialWinnerTeamId) ?? getPredictedWinner(match);
        const locked = isMatchLocked(match.id, officialScore, match.officialWinnerTeamId);
        const score = getCompleteScore(scorePicks[match.id]);
        const tiedPick = score && getOutcomeFromScore(score) === 'draw';

        return (
          <div key={match.id} className="rounded-2xl border border-blue-500/10 bg-black p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{match.label}</p>
                {match.kickoff ? <p className="mt-1 text-xs text-slate-500">{match.kickoff}</p> : null}
              </div>
              {locked ? (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                  Cerrado
                </span>
              ) : null}
            </div>

            <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_96px_minmax(0,1fr)] sm:items-center">
              <div className={`min-w-0 rounded-xl border px-3 py-2 text-sm ${selected === match.home.id ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-blue-400/10 bg-slate-950 text-slate-200'}`}>
                <span className="mr-2" aria-hidden="true">{getTeamFlag(match.home.id)}</span>
                <span className="break-words">{match.home.name}</span>
              </div>
              {renderScoreInputs(match.id, { locked, stage, officialScore })}
              <div className={`min-w-0 rounded-xl border px-3 py-2 text-sm ${selected === match.away.id ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-blue-400/10 bg-slate-950 text-slate-200'}`}>
                <span className="mr-2" aria-hidden="true">{getTeamFlag(match.away.id)}</span>
                <span className="break-words">{match.away.name}</span>
              </div>
            </div>

            {tiedPick && !locked ? (
              <p className="mt-2 text-xs text-amber-200">En eliminatorias el marcador debe definir un ganador.</p>
            ) : null}
            {officialScore ? <p className="mt-2 text-xs text-emerald-200">Marcador oficial: {formatScore(officialScore)}</p> : null}
          </div>
        );
      })}
    </div>
  );

  return (
    <section
      id="worldcup"
      ref={predictorSectionRef}
      className="max-w-full overflow-x-hidden border-y border-blue-500/10 bg-gradient-to-b from-slate-950 to-black"
    >
      <div className="mx-auto max-w-7xl px-4 pb-32 pt-16 sm:px-6 md:py-16 lg:px-8">
        <div className="mb-10 max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Beneficio Mundial</p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">World Cup Predictor por marcador</h2>
          <p className="mt-4 text-slate-300">
            Pronostica marcadores, arma la tabla y compite por puntos: 3 por acertar resultado y 3 extra por marcador exacto.
          </p>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Los partidos con marcador oficial quedan cerrados automaticamente para nuevas predicciones.
          </div>
          <div className="rounded-2xl border border-blue-400/10 bg-slate-950 p-4 text-sm text-slate-300">
            {statusLoading ? 'Cargando estado oficial...' : `${Object.values(officialMatches).filter((match) => match.isLocked).length} partidos cerrados`}
          </div>
        </div>

        <div className="mb-10 rounded-3xl border border-blue-400/10 bg-slate-950 p-6">
          <div className="mb-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCurrentState}
              className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Copiar prediccion en JSON
            </button>
            {copyMsg ? <p className="text-xs text-cyan-200">{copyMsg}</p> : null}
          </div>

          <div className="mb-4 rounded-2xl border border-blue-500/10 bg-black p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Cargar prediccion desde JSON
            </label>
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder='Pega aqui el JSON con "groupScores" y "knockoutScores"'
              rows={4}
              className="w-full rounded-xl border border-blue-400/15 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={importPredictionJson}
                className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
              >
                Cargar JSON
              </button>
              <button
                type="button"
                onClick={clearPrediction}
                className="rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Limpiar prediccion
              </button>
              {importMsg ? <p className="text-xs text-cyan-200">{importMsg}</p> : null}
            </div>
          </div>

          <div className="mb-4 rounded-2xl border border-blue-500/10 bg-black p-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Cargar jugador por ID
            </label>
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                value={loadSubmissionId}
                onChange={(event) => setLoadSubmissionId(event.target.value)}
                placeholder="Pega el ID de comprobante"
                className="w-full rounded-xl border border-blue-400/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <button
                type="button"
                onClick={loadSavedPrediction}
                disabled={isLoadingSubmission}
                className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoadingSubmission ? 'Cargando...' : 'Cargar jugador'}
              </button>
            </div>
            {loadMsg ? <p className="mt-3 text-xs text-cyan-200">{loadMsg}</p> : null}
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
              {isSubmitting ? 'Guardando...' : submissionId ? 'Actualizar prediccion' : 'Publicar en ranking'}
            </button>
          </div>

          {submitMsg ? <p className="mb-4 text-xs text-cyan-200">{submitMsg}</p> : null}
          {submissionId ? (
            <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">ID de comprobante</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="rounded-lg border border-emerald-300/20 bg-black px-3 py-2 text-xs text-emerald-100">
                  {submissionId}
                </code>
                <button
                  type="button"
                  onClick={copySubmissionId}
                  className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-300/20"
                >
                  Copiar ID
                </button>
              </div>
            </div>
          ) : null}

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

        <section className="mb-10 rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6">
          <h3 className="mb-4 text-xl font-semibold text-amber-100">Admin: subir marcador oficial</h3>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_90px_90px_1fr_1fr_1fr_auto]">
            <input
              type="password"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="ADMIN_TOKEN"
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            />
            <select
              value={adminMatchCode}
              onChange={(event) => setAdminMatchCode(event.target.value)}
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            >
              {allMatchCodes.map((matchCode) => (
                <option key={matchCode} value={matchCode}>{matchCode}</option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              max="99"
              value={adminHomeGoals}
              onChange={(event) => setAdminHomeGoals(event.target.value)}
              placeholder="Local"
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="number"
              min="0"
              max="99"
              value={adminAwayGoals}
              onChange={(event) => setAdminAwayGoals(event.target.value)}
              placeholder="Visita"
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="text"
              value={adminHomeTeamCode}
              onChange={(event) => setAdminHomeTeamCode(event.target.value)}
              disabled={groupMatches.some((match) => match.id === adminMatchCode)}
              placeholder="homeTeamCode eliminatoria"
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="text"
              value={adminAwayTeamCode}
              onChange={(event) => setAdminAwayTeamCode(event.target.value)}
              disabled={groupMatches.some((match) => match.id === adminMatchCode)}
              placeholder="awayTeamCode eliminatoria"
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            />
            <input
              type="text"
              value={adminWinnerTeamCode}
              onChange={(event) => setAdminWinnerTeamCode(event.target.value)}
              disabled={groupMatches.some((match) => match.id === adminMatchCode)}
              placeholder="winner si empate"
              className="rounded-xl border border-amber-300/20 bg-black px-3 py-2 text-sm text-slate-100"
            />
            <button
              type="button"
              onClick={saveAdminResult}
              disabled={isSavingAdminResult}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingAdminResult ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
          {adminMsg ? <p className="mt-3 text-xs text-amber-100">{adminMsg}</p> : null}
        </section>

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
            <div className="overflow-x-auto rounded-2xl border border-blue-500/10">
              <table className="min-w-[620px] text-left text-sm text-slate-200">
                <thead className="bg-black text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-3">Pos</th>
                    <th className="px-3 py-3">Jugador</th>
                    <th className="px-3 py-3">Puntaje</th>
                    <th className="px-3 py-3">Marcadores</th>
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
                      <td className="px-3 py-3">{entry.correctExactScores}/{entry.totalExactScores}</td>
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
              <article key={groupCode} className="min-w-0 rounded-3xl border border-blue-400/10 bg-slate-950 p-4 sm:p-5">
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
                    const officialScore = getOfficialScore(match.id, match.officialScore);
                    const officialResult = getOfficialResult(match.id, match.officialScore, match.officialResult);
                    const homeName = getTeamName(match.homeTeamId);
                    const awayName = getTeamName(match.awayTeamId);
                    const locked = isMatchLocked(match.id, match.officialScore);

                    return (
                      <div key={match.id} className="rounded-2xl border border-blue-400/10 bg-black p-3">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{match.kickoff}</p>
                          {locked ? (
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[11px] font-semibold text-emerald-200">
                              Cerrado
                            </span>
                          ) : null}
                        </div>
                        <div className="grid min-w-0 gap-2 text-xs sm:grid-cols-[minmax(0,1fr)_88px_minmax(0,1fr)] sm:items-center">
                          <div className={`min-w-0 rounded-lg border px-2 py-2 ${officialResult === 'home' ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-blue-400/10 bg-slate-950 text-slate-300'}`}>
                            <span className="mr-1" aria-hidden="true">{getTeamFlag(match.homeTeamId)}</span>
                            <span className="break-words">{homeName}</span>
                          </div>
                          {renderScoreInputs(match.id, { locked, officialScore })}
                          <div className={`min-w-0 rounded-lg border px-2 py-2 ${officialResult === 'away' ? 'border-cyan-300 bg-cyan-400/20 text-cyan-100' : 'border-blue-400/10 bg-slate-950 text-slate-300'}`}>
                            <span className="mr-1" aria-hidden="true">{getTeamFlag(match.awayTeamId)}</span>
                            <span className="break-words">{awayName}</span>
                          </div>
                        </div>
                        {officialResult === 'draw' ? <p className="mt-2 text-xs text-cyan-200">Empate oficial/proyectado</p> : null}
                        {officialScore ? <p className="mt-2 text-xs text-emerald-200">Marcador oficial: {formatScore(officialScore)}</p> : null}
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
            <h3 className="mb-4 text-xl font-semibold">Ronda de 32</h3>
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

      {isPredictorVisible ? (
        <div className="fixed inset-x-0 bottom-0 z-50 max-w-[100vw] overflow-hidden border-t border-cyan-300/20 bg-slate-950/95 px-3 py-3 shadow-2xl shadow-black/40 backdrop-blur md:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">
                {submissionId ? 'Prediccion cargada' : 'World Cup Predictor'}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {playerName.trim() || 'Ingresa tu nombre antes de publicar'}
              </p>
            </div>
            <button
              type="button"
              onClick={submitToRanking}
              disabled={isSubmitting}
              className="shrink-0 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-950/30 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Guardando...' : submissionId ? 'Actualizar' : 'Publicar'}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
