import cors from 'cors';
import express from 'express';
import { existsSync } from 'fs';
import mysql from 'mysql2/promise';
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

type RankingDbRow = {
  id: string;
  display_name: string;
  score: number;
  max_score: number;
  accuracy: number;
  correct_group_matches: number;
  total_group_matches: number;
  correct_round_of32: number;
  total_round_of32: number;
  submitted_at: string;
};

const app = express();
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const tournamentCode = process.env.WC_TOURNAMENT_CODE || 'WC2026';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../dist');
const indexHtmlPath = path.join(distPath, 'index.html');

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const dbPool = mysql.createPool({
  host: process.env.MYSQL_HOST || process.env.MYSQLHOST,
  port: Number(process.env.MYSQL_PORT || process.env.MYSQLPORT || 3306),
  user: process.env.MYSQL_USER || process.env.MYSQLUSER,
  password: process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

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

const isValidGroupResult = (value: unknown): value is MatchOutcome => {
  return value === 'home' || value === 'draw' || value === 'away';
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const getRankingFromDb = async (): Promise<RankingEntry[]> => {
  const [rows] = await dbPool.query<RankingDbRow[]>(
    `
      select
        r.id,
        r.display_name,
        r.score,
        r.max_score,
        r.accuracy,
        r.correct_group_matches,
        r.total_group_matches,
        r.correct_round_of32,
        r.total_round_of32,
        r.submitted_at
      from v_public_ranking r
      join prediction_submissions s on s.id = r.id
      join tournaments t on t.id = s.tournament_id
      where t.code = ?
      order by r.score desc, r.accuracy desc, r.submitted_at asc
      limit 100
    `,
    [tournamentCode],
  );

  return rows.map((row) => ({
    id: row.id,
    displayName: row.display_name,
    score: Number(row.score),
    maxScore: Number(row.max_score),
    accuracy: Number(row.accuracy),
    correctGroupMatches: Number(row.correct_group_matches),
    totalGroupMatches: Number(row.total_group_matches),
    correctRoundOf32: Number(row.correct_round_of32),
    totalRoundOf32: Number(row.total_round_of32),
    submittedAt: new Date(row.submitted_at).toISOString(),
  }));
};

const normalizeDisplayName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 30);
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: 'configured' });
});

app.get('/api/ranking', async (_req, res) => {
  try {
    const ranking = await getRankingFromDb();
    res.json({ ranking });
  } catch (error) {
    console.error('Error loading ranking from DB', error);
    res.status(500).json({ error: 'No se pudo cargar ranking desde la base de datos' });
  }
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
  const submissionId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();

  const groupEntries = Object.entries(groupResults).filter(([, result]) => isValidGroupResult(result)) as Array<
    [string, MatchOutcome]
  >;
  const knockoutEntries = Object.entries(knockoutPicks).filter(([, teamCode]) => isNonEmptyString(teamCode)) as Array<
    [string, string]
  >;

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    await connection.query(
      `
        insert into predictor_players (id, display_name)
        select uuid(), ?
        where not exists (
          select 1 from predictor_players where display_name = ?
        )
      `,
      [displayName, displayName],
    );

    const [playerRows] = await connection.query<Array<{ id: string }>>(
      `
        select id
        from predictor_players
        where display_name = ?
        order by created_at asc
        limit 1
      `,
      [displayName],
    );

    if (!playerRows[0]?.id) {
      throw new Error('No se pudo resolver player_id');
    }

    const playerId = playerRows[0].id;

    const [submissionResult] = await connection.query<mysql.ResultSetHeader>(
      `
        insert into prediction_submissions (
          id,
          tournament_id,
          player_id,
          score,
          max_score,
          accuracy,
          correct_group_matches,
          total_group_matches,
          correct_round_of32,
          total_round_of32,
          submitted_at
        )
        select
          ?,
          t.id,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?,
          ?
        from tournaments t
        where t.code = ?
      `,
      [
        submissionId,
        playerId,
        scoreData.score,
        scoreData.maxScore,
        scoreData.accuracy,
        scoreData.correctGroupMatches,
        scoreData.totalGroupMatches,
        scoreData.correctRoundOf32,
        scoreData.totalRoundOf32,
        submittedAt,
        tournamentCode,
      ],
    );

    if (submissionResult.affectedRows === 0) {
      throw new Error('No existe el torneo configurado para guardar la prediccion');
    }

    for (const [matchCode, pickedResult] of groupEntries) {
      await connection.query(
        `
          insert into prediction_group_picks (id, submission_id, match_id, picked_result)
          select
            uuid(),
            ?,
            m.id,
            ?
          from prediction_submissions s
          join matches m
            on m.tournament_id = s.tournament_id
           and m.match_code = ?
          where s.id = ?
        `,
        [submissionId, pickedResult, matchCode, submissionId],
      );
    }

    for (const [matchCode, pickedTeamCode] of knockoutEntries) {
      await connection.query(
        `
          insert into prediction_knockout_picks (id, submission_id, match_id, picked_team_id)
          select
            uuid(),
            ?,
            m.id,
            tm.id
          from prediction_submissions s
          join matches m
            on m.tournament_id = s.tournament_id
           and m.match_code = ?
          join teams tm
            on tm.team_code = ?
          where s.id = ?
        `,
        [submissionId, matchCode, pickedTeamCode, submissionId],
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error('Error submitting prediction', error);
    res.status(500).json({ error: 'No se pudo guardar la prediccion en la base de datos' });
    return;
  } finally {
    connection.release();
  }

  const entry: RankingEntry = {
    id: submissionId,
    displayName,
    submittedAt,
    ...scoreData,
  };

  res.status(201).json({ entry });
});

if (existsSync(indexHtmlPath)) {
  app.use(express.static(distPath));

  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) {
      next();
      return;
    }

    res.sendFile(indexHtmlPath);
  });
} else {
  console.warn('Frontend build not found. Run npm run build before starting production server.');
}

app.listen(port, () => {
  console.log(`Hondu.tech app listening on port ${port}`);
});
