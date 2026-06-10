import cors from 'cors';
import express from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { worldCup2026Data, type MatchOutcome } from '../src/data/worldCup2026Data';

type PicksPayload = {
  displayName: string;
  groupResults: Record<string, MatchOutcome | undefined>;
  knockoutPicks: Record<string, string | undefined>;
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
  submittedAt: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rankingFilePath = path.join(__dirname, 'storage', 'ranking.json');

const app = express();
const port = Number(process.env.API_PORT || 8787);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const getScoreFromPayload = (payload: PicksPayload) => {
  let score = 0;
  let maxScore = 0;
  let correctGroupMatches = 0;
  let totalGroupMatches = 0;
  let correctRoundOf32 = 0;
  let totalRoundOf32 = 0;

  worldCup2026Data.groupMatches.forEach((match) => {
    if (!match.officialResult) return;
    totalGroupMatches += 1;
    maxScore += 3;

    const userPick = payload.groupResults[match.id];
    if (userPick && userPick === match.officialResult) {
      correctGroupMatches += 1;
      score += 3;
    }
  });

  worldCup2026Data.roundOf32Rules.forEach((match) => {
    if (!match.officialWinnerTeamId) return;
    totalRoundOf32 += 1;
    maxScore += 5;

    const userPick = payload.knockoutPicks[match.id];
    if (userPick && userPick === match.officialWinnerTeamId) {
      correctRoundOf32 += 1;
      score += 5;
    }
  });

  const accuracy = maxScore > 0 ? Number(((score / maxScore) * 100).toFixed(2)) : 0;

  return {
    score,
    maxScore,
    accuracy,
    correctGroupMatches,
    totalGroupMatches,
    correctRoundOf32,
    totalRoundOf32,
  };
};

const readRanking = async (): Promise<RankingEntry[]> => {
  try {
    const content = await fs.readFile(rankingFilePath, 'utf-8');
    const parsed = JSON.parse(content) as RankingEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeRanking = async (items: RankingEntry[]) => {
  await fs.writeFile(rankingFilePath, `${JSON.stringify(items, null, 2)}\n`, 'utf-8');
};

const normalizeDisplayName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 30);
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/ranking', async (_req, res) => {
  const ranking = await readRanking();
  const sorted = [...ranking]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    })
    .slice(0, 100);

  res.json({ ranking: sorted });
});

app.post('/api/ranking/submit', async (req, res) => {
  const displayName = normalizeDisplayName(req.body?.displayName);
  const groupResults = (req.body?.groupResults ?? {}) as Record<string, MatchOutcome | undefined>;
  const knockoutPicks = (req.body?.knockoutPicks ?? {}) as Record<string, string | undefined>;

  if (!displayName) {
    res.status(400).json({ error: 'displayName es requerido' });
    return;
  }

  const payload: PicksPayload = {
    displayName,
    groupResults,
    knockoutPicks,
  };

  const scoreData = getScoreFromPayload(payload);

  const entry: RankingEntry = {
    id: crypto.randomUUID(),
    displayName,
    submittedAt: new Date().toISOString(),
    ...scoreData,
  };

  const ranking = await readRanking();
  ranking.push(entry);
  await writeRanking(ranking);

  res.status(201).json({ entry });
});

app.listen(port, () => {
  console.log(`World Cup ranking API listening on port ${port}`);
});
