import cors from 'cors';
import express from 'express';
import { existsSync, readFileSync } from 'fs';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import type { MatchOutcome, MatchScore } from '../src/data/worldCup2026Data';

type KnockoutScorePick = MatchScore & {
  homeTeamId: string;
  awayTeamId: string;
  winnerTeamId: string;
};

type PicksPayload = {
  displayName: string;
  groupScores: Record<string, MatchScore>;
  knockoutScores: Record<string, KnockoutScorePick>;
};

type ScoreData = {
  score: number;
  maxScore: number;
  accuracy: number;
  correctGroupMatches: number;
  totalGroupMatches: number;
  correctRoundOf32: number;
  totalRoundOf32: number;
  correctExactScores: number;
  totalExactScores: number;
};

type RankingEntry = ScoreData & {
  id: string;
  displayName: string;
  submittedAt: string;
};

type SubmissionDbRow = RowDataPacket & {
  id: string;
  display_name: string;
  submitted_at: string;
};

type GroupPickDbRow = RowDataPacket & {
  submission_id: string;
  official_result: MatchOutcome | null;
  official_home_goals: number | null;
  official_away_goals: number | null;
  picked_result: MatchOutcome;
  picked_home_goals: number | null;
  picked_away_goals: number | null;
};

type KnockoutPickDbRow = RowDataPacket & {
  submission_id: string;
  stage: string;
  official_winner_team_code: string | null;
  official_home_team_code: string | null;
  official_away_team_code: string | null;
  official_home_goals: number | null;
  official_away_goals: number | null;
  picked_team_code: string | null;
  picked_home_team_code: string | null;
  picked_away_team_code: string | null;
  picked_home_goals: number | null;
  picked_away_goals: number | null;
};

type MatchStatusDbRow = RowDataPacket & {
  match_code: string;
  home_team_code: string | null;
  away_team_code: string | null;
  official_home_goals: number | null;
  official_away_goals: number | null;
  official_result: MatchOutcome | null;
  official_winner_team_code: string | null;
  is_locked: number;
};

type MatchAdminDbRow = RowDataPacket & {
  id: string;
  stage: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_code: string | null;
  away_team_code: string | null;
};

type IdDbRow = RowDataPacket & {
  id: string;
};

const app = express();
const loadLocalEnv = () => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  const envContent = readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex < 0) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key) {
      process.env[key] = value;
    }
  });
};

loadLocalEnv();

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

const emptyScoreData = (): ScoreData => ({
  score: 0,
  maxScore: 0,
  accuracy: 0,
  correctGroupMatches: 0,
  totalGroupMatches: 0,
  correctRoundOf32: 0,
  totalRoundOf32: 0,
  correctExactScores: 0,
  totalExactScores: 0,
});

const getOutcomeFromScore = (score: MatchScore): MatchOutcome => {
  if (score.homeGoals > score.awayGoals) return 'home';
  if (score.awayGoals > score.homeGoals) return 'away';
  return 'draw';
};

const isValidGoalValue = (value: unknown): value is number => {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 99;
};

const normalizeScore = (value: unknown): MatchScore | undefined => {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as Partial<MatchScore>;
  if (!isValidGoalValue(candidate.homeGoals) || !isValidGoalValue(candidate.awayGoals)) {
    return undefined;
  }

  return {
    homeGoals: candidate.homeGoals,
    awayGoals: candidate.awayGoals,
  };
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

const normalizeDisplayName = (value: unknown) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, 30);
};

const isMissingScoreMigrationError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: string; message?: string };
  return (
    candidate.code === 'ER_BAD_FIELD_ERROR' &&
    Boolean(
      candidate.message?.includes('official_home_goals') ||
        candidate.message?.includes('official_away_goals') ||
        candidate.message?.includes('picked_home_goals') ||
        candidate.message?.includes('correct_exact_scores'),
    )
  );
};

const normalizeGroupScores = (value: unknown): Record<string, MatchScore> => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, MatchScore>>((acc, [matchCode, score]) => {
    const normalized = normalizeScore(score);
    if (normalized) {
      acc[matchCode] = normalized;
    }
    return acc;
  }, {});
};

const normalizeKnockoutScores = (value: unknown): Record<string, KnockoutScorePick> => {
  if (!value || typeof value !== 'object') return {};

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, KnockoutScorePick>>((acc, [matchCode, pick]) => {
    const score = normalizeScore(pick);
    if (!score || getOutcomeFromScore(score) === 'draw' || !pick || typeof pick !== 'object') {
      return acc;
    }

    const candidate = pick as Partial<KnockoutScorePick>;
    if (
      !isNonEmptyString(candidate.homeTeamId) ||
      !isNonEmptyString(candidate.awayTeamId) ||
      !isNonEmptyString(candidate.winnerTeamId)
    ) {
      return acc;
    }

    acc[matchCode] = {
      ...score,
      homeTeamId: candidate.homeTeamId,
      awayTeamId: candidate.awayTeamId,
      winnerTeamId: candidate.winnerTeamId,
    };
    return acc;
  }, {});
};

const calculateAccuracy = (scoreData: ScoreData) => {
  return scoreData.maxScore > 0 ? Number(((scoreData.score / scoreData.maxScore) * 100).toFixed(2)) : 0;
};

const getRankingFromDb = async (): Promise<RankingEntry[]> => {
  const [submissions] = await dbPool.query<SubmissionDbRow[]>(
    `
      select
        s.id,
        p.display_name,
        s.submitted_at
      from prediction_submissions s
      join predictor_players p on p.id = s.player_id
      join tournaments t on t.id = s.tournament_id
      where t.code = ?
      order by s.submitted_at asc
      limit 500
    `,
    [tournamentCode],
  );

  const scoreBySubmission = new Map<string, ScoreData>();
  submissions.forEach((submission) => {
    scoreBySubmission.set(submission.id, emptyScoreData());
  });

  const [groupPicks] = await dbPool.query<GroupPickDbRow[]>(
    `
      select
        gp.submission_id,
        m.official_result,
        m.official_home_goals,
        m.official_away_goals,
        gp.picked_result,
        gp.picked_home_goals,
        gp.picked_away_goals
      from prediction_group_picks gp
      join prediction_submissions s on s.id = gp.submission_id
      join tournaments t on t.id = s.tournament_id
      join matches m on m.id = gp.match_id
      where t.code = ?
        and m.official_home_goals is not null
        and m.official_away_goals is not null
    `,
    [tournamentCode],
  );

  groupPicks.forEach((pick) => {
    const scoreData = scoreBySubmission.get(pick.submission_id);
    if (!scoreData || !pick.official_result) return;

    scoreData.totalGroupMatches += 1;
    scoreData.totalExactScores += 1;
    scoreData.maxScore += 6;

    if (pick.picked_result === pick.official_result) {
      scoreData.correctGroupMatches += 1;
      scoreData.score += 3;
    }

    if (
      pick.picked_home_goals === pick.official_home_goals &&
      pick.picked_away_goals === pick.official_away_goals
    ) {
      scoreData.correctExactScores += 1;
      scoreData.score += 3;
    }
  });

  const [knockoutPicks] = await dbPool.query<KnockoutPickDbRow[]>(
    `
      select
        kp.submission_id,
        m.stage,
        tw.team_code as official_winner_team_code,
        th.team_code as official_home_team_code,
        ta.team_code as official_away_team_code,
        m.official_home_goals,
        m.official_away_goals,
        tp.team_code as picked_team_code,
        tph.team_code as picked_home_team_code,
        tpa.team_code as picked_away_team_code,
        kp.picked_home_goals,
        kp.picked_away_goals
      from prediction_knockout_picks kp
      join prediction_submissions s on s.id = kp.submission_id
      join tournaments t on t.id = s.tournament_id
      join matches m on m.id = kp.match_id
      left join teams tw on tw.id = m.official_winner_team_id
      left join teams th on th.id = m.home_team_id
      left join teams ta on ta.id = m.away_team_id
      left join teams tp on tp.id = kp.picked_team_id
      left join teams tph on tph.id = kp.picked_home_team_id
      left join teams tpa on tpa.id = kp.picked_away_team_id
      where t.code = ?
        and m.official_home_goals is not null
        and m.official_away_goals is not null
        and m.official_winner_team_id is not null
    `,
    [tournamentCode],
  );

  knockoutPicks.forEach((pick) => {
    const scoreData = scoreBySubmission.get(pick.submission_id);
    if (!scoreData || !pick.official_winner_team_code) return;

    if (pick.stage === 'r32') {
      scoreData.totalRoundOf32 += 1;
    }
    scoreData.totalExactScores += 1;
    scoreData.maxScore += 6;

    if (pick.picked_team_code === pick.official_winner_team_code) {
      if (pick.stage === 'r32') {
        scoreData.correctRoundOf32 += 1;
      }
      scoreData.score += 3;
    }

    const exactTeamsMatch =
      !pick.official_home_team_code ||
      !pick.official_away_team_code ||
      (pick.picked_home_team_code === pick.official_home_team_code &&
        pick.picked_away_team_code === pick.official_away_team_code);

    if (
      exactTeamsMatch &&
      pick.picked_home_goals === pick.official_home_goals &&
      pick.picked_away_goals === pick.official_away_goals
    ) {
      scoreData.correctExactScores += 1;
      scoreData.score += 3;
    }
  });

  return submissions
    .map<RankingEntry>((submission) => {
      const scoreData = scoreBySubmission.get(submission.id) ?? emptyScoreData();
      scoreData.accuracy = calculateAccuracy(scoreData);

      return {
        id: submission.id,
        displayName: submission.display_name,
        submittedAt: new Date(submission.submitted_at).toISOString(),
        ...scoreData,
      };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    })
    .slice(0, 100);
};

const getTeamIdByCode = async (connection: mysql.PoolConnection, teamCode: string) => {
  const [rows] = await connection.query<IdDbRow[]>(
    `
      select id
      from teams
      where team_code = ?
      limit 1
    `,
    [teamCode],
  );

  return rows[0]?.id;
};

app.get('/api/health', async (_req, res) => {
  try {
    await dbPool.query('select 1');
    res.json({ ok: true, db: 'connected' });
  } catch (error) {
    console.error('Health check DB error', error);
    res.status(500).json({ ok: false, db: 'error', error: 'No se pudo conectar a la base de datos' });
  }
});

app.get('/api/matches/status', async (_req, res) => {
  try {
    const [rows] = await dbPool.query<MatchStatusDbRow[]>(
      `
        select
          m.match_code,
          th.team_code as home_team_code,
          ta.team_code as away_team_code,
          m.official_home_goals,
          m.official_away_goals,
          m.official_result,
          tw.team_code as official_winner_team_code,
          m.is_locked
        from matches m
        join tournaments t on t.id = m.tournament_id
        left join teams th on th.id = m.home_team_id
        left join teams ta on ta.id = m.away_team_id
        left join teams tw on tw.id = m.official_winner_team_id
        where t.code = ?
      `,
      [tournamentCode],
    );

    res.json({
      matches: rows.map((row) => ({
        matchCode: row.match_code,
        homeTeamId: row.home_team_code ?? undefined,
        awayTeamId: row.away_team_code ?? undefined,
        officialScore:
          row.official_home_goals === null || row.official_away_goals === null
            ? undefined
            : {
                homeGoals: Number(row.official_home_goals),
                awayGoals: Number(row.official_away_goals),
              },
        officialResult: row.official_result ?? undefined,
        officialWinnerTeamId: row.official_winner_team_code ?? undefined,
        isLocked: Boolean(row.is_locked),
      })),
    });
  } catch (error) {
    console.error('Error loading match status from DB', error);
    res.status(500).json({ error: 'No se pudo cargar el estado de partidos desde la base de datos' });
  }
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

  if (!displayName) {
    res.status(400).json({ error: 'displayName es requerido' });
    return;
  }

  const payload: PicksPayload = {
    displayName,
    groupScores: normalizeGroupScores(req.body?.groupScores),
    knockoutScores: normalizeKnockoutScores(req.body?.knockoutScores),
  };

  const submissionId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const groupEntries = Object.entries(payload.groupScores);
  const knockoutEntries = Object.entries(payload.knockoutScores);
  let connection: mysql.PoolConnection | undefined;

  try {
    connection = await dbPool.getConnection();
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

    const [playerRows] = await connection.query<IdDbRow[]>(
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
          correct_exact_scores,
          total_exact_scores,
          submitted_at
        )
        select
          ?,
          t.id,
          ?,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          ?
        from tournaments t
        where t.code = ?
      `,
      [submissionId, playerRows[0].id, submittedAt, tournamentCode],
    );

    if (submissionResult.affectedRows === 0) {
      throw new Error('No existe el torneo configurado para guardar la prediccion');
    }

    for (const [matchCode, pickedScore] of groupEntries) {
      await connection.query(
        `
          insert into prediction_group_picks (
            id,
            submission_id,
            match_id,
            picked_result,
            picked_home_goals,
            picked_away_goals
          )
          select
            uuid(),
            ?,
            m.id,
            ?,
            ?,
            ?
          from prediction_submissions s
          join matches m
            on m.tournament_id = s.tournament_id
           and m.match_code = ?
          where s.id = ?
            and m.stage = 'group'
            and m.is_locked = 0
            and m.official_home_goals is null
            and m.official_away_goals is null
        `,
        [
          submissionId,
          getOutcomeFromScore(pickedScore),
          pickedScore.homeGoals,
          pickedScore.awayGoals,
          matchCode,
          submissionId,
        ],
      );
    }

    for (const [matchCode, pickedScore] of knockoutEntries) {
      await connection.query(
        `
          insert into prediction_knockout_picks (
            id,
            submission_id,
            match_id,
            picked_team_id,
            picked_home_team_id,
            picked_away_team_id,
            picked_home_goals,
            picked_away_goals
          )
          select
            uuid(),
            ?,
            m.id,
            tw.id,
            th.id,
            ta.id,
            ?,
            ?
          from prediction_submissions s
          join matches m
            on m.tournament_id = s.tournament_id
           and m.match_code = ?
          join teams tw
            on tw.team_code = ?
          join teams th
            on th.team_code = ?
          join teams ta
            on ta.team_code = ?
          where s.id = ?
            and m.stage <> 'group'
            and m.is_locked = 0
            and m.official_home_goals is null
            and m.official_away_goals is null
        `,
        [
          submissionId,
          pickedScore.homeGoals,
          pickedScore.awayGoals,
          matchCode,
          pickedScore.winnerTeamId,
          pickedScore.homeTeamId,
          pickedScore.awayTeamId,
          submissionId,
        ],
      );
    }

    await connection.commit();
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error submitting prediction', error);
    if (isMissingScoreMigrationError(error)) {
      res.status(500).json({ error: 'Falta ejecutar backend/sql/04_score_prediction_upgrade.sql en la base de datos' });
      return;
    }

    res.status(500).json({ error: 'No se pudo guardar la prediccion en la base de datos' });
    return;
  } finally {
    connection?.release();
  }

  const entry: RankingEntry = {
    id: submissionId,
    displayName,
    submittedAt,
    ...emptyScoreData(),
  };

  res.status(201).json({ entry });
});

app.post('/api/admin/matches/:matchCode/result', async (req, res) => {
  const adminToken = process.env.ADMIN_TOKEN;
  const providedToken = req.get('x-admin-token') || req.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (!adminToken) {
    res.status(503).json({ error: 'ADMIN_TOKEN no esta configurado en el servidor' });
    return;
  }

  if (!providedToken || providedToken !== adminToken) {
    res.status(401).json({ error: 'Token admin invalido' });
    return;
  }

  const score = normalizeScore(req.body);
  if (!score) {
    res.status(400).json({ error: 'homeGoals y awayGoals deben ser enteros entre 0 y 99' });
    return;
  }

  const matchCode = req.params.matchCode;
  const homeTeamCode = isNonEmptyString(req.body?.homeTeamCode) ? req.body.homeTeamCode.trim() : undefined;
  const awayTeamCode = isNonEmptyString(req.body?.awayTeamCode) ? req.body.awayTeamCode.trim() : undefined;
  const winnerTeamCode = isNonEmptyString(req.body?.winnerTeamCode) ? req.body.winnerTeamCode.trim() : undefined;
  let connection: mysql.PoolConnection | undefined;

  try {
    connection = await dbPool.getConnection();
    await connection.beginTransaction();

    const [matchRows] = await connection.query<MatchAdminDbRow[]>(
      `
        select
          m.id,
          m.stage,
          m.home_team_id,
          m.away_team_id,
          th.team_code as home_team_code,
          ta.team_code as away_team_code
        from matches m
        join tournaments t on t.id = m.tournament_id
        left join teams th on th.id = m.home_team_id
        left join teams ta on ta.id = m.away_team_id
        where t.code = ?
          and m.match_code = ?
        limit 1
      `,
      [tournamentCode, matchCode],
    );

    const match = matchRows[0];
    if (!match) {
      await connection.rollback();
      res.status(404).json({ error: 'Partido no encontrado' });
      return;
    }

    const homeTeamId = homeTeamCode ? await getTeamIdByCode(connection, homeTeamCode) : match.home_team_id;
    const awayTeamId = awayTeamCode ? await getTeamIdByCode(connection, awayTeamCode) : match.away_team_id;

    if (homeTeamCode && !homeTeamId) {
      await connection.rollback();
      res.status(400).json({ error: 'homeTeamCode no existe' });
      return;
    }

    if (awayTeamCode && !awayTeamId) {
      await connection.rollback();
      res.status(400).json({ error: 'awayTeamCode no existe' });
      return;
    }

    const officialResult = getOutcomeFromScore(score);
    let winnerTeamId: string | null = null;

    if (officialResult === 'home') {
      winnerTeamId = homeTeamId;
    } else if (officialResult === 'away') {
      winnerTeamId = awayTeamId;
    } else if (match.stage !== 'group' && winnerTeamCode) {
      winnerTeamId = await getTeamIdByCode(connection, winnerTeamCode);
    }

    if (match.stage !== 'group' && !winnerTeamId) {
      await connection.rollback();
      res.status(400).json({
        error: 'Para eliminatorias debes definir homeTeamCode/awayTeamCode o winnerTeamCode si el marcador termina empatado',
      });
      return;
    }

    const [updateResult] = await connection.query<mysql.ResultSetHeader>(
      `
        update matches m
        join tournaments t on t.id = m.tournament_id
        set
          m.home_team_id = coalesce(?, m.home_team_id),
          m.away_team_id = coalesce(?, m.away_team_id),
          m.official_home_goals = ?,
          m.official_away_goals = ?,
          m.official_result = ?,
          m.official_winner_team_id = ?,
          m.is_locked = 1
        where t.code = ?
          and m.match_code = ?
      `,
      [
        homeTeamId,
        awayTeamId,
        score.homeGoals,
        score.awayGoals,
        officialResult,
        winnerTeamId,
        tournamentCode,
        matchCode,
      ],
    );

    if (updateResult.affectedRows === 0) {
      throw new Error('No se pudo actualizar el partido');
    }

    await connection.commit();
    res.json({
      ok: true,
      matchCode,
      officialScore: score,
      officialResult,
      isLocked: true,
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error updating official result', error);
    if (isMissingScoreMigrationError(error)) {
      res.status(500).json({ error: 'Falta ejecutar backend/sql/04_score_prediction_upgrade.sql en la base de datos' });
      return;
    }

    res.status(500).json({ error: 'No se pudo actualizar el resultado oficial' });
  } finally {
    connection?.release();
  }
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
