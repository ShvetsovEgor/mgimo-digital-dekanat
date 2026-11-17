// Успеваемость: дисциплины, сводка, сессия, прошлые семестры, рейтинг, шкала.
import type {
  AcademicRank,
  Discipline,
  GradeScaleRow,
  RatingSummary,
  SessionExam,
  TranscriptRow,
} from './mappers.js';
import {
  GRADE_SCALE,
  toAcademicRank,
  toDiscipline,
  toSessionExam,
  toTranscriptRow,
} from './mappers.js';
import { CREDITS_PLAN_YEAR, academicRankRow, creditsEarned, enrollments, pastResults } from './repo.js';

export interface ProgressResponse {
  summary: RatingSummary;
  disciplines: Discipline[];
  session: SessionExam[];
  past: TranscriptRow[];
  rank: AcademicRank;
  scale: GradeScaleRow[];
}

/** Дисциплина «рискует», если набрано менее половины от порога и есть несданные точки. */
function isRisk(d: Discipline): boolean {
  if (!d.autoPossible || d.autoReached) return false;
  const pending = d.controlPoints.some((p) => p.earned === null);
  return pending && d.rating < Math.round(d.threshold / 2);
}

export function buildProgress(userId: number, groupCode: string): ProgressResponse {
  const rows = enrollments(userId);
  const disciplines = rows.map(toDiscipline);
  const sorted = [...disciplines].sort((a, b) => a.title.localeCompare(b.title, 'ru'));

  const rated = sorted.filter((d) => d.autoPossible || d.rating > 0);
  const avgRating = rated.length ? Math.round((rated.reduce((a, d) => a + d.rating, 0) / rated.length) * 10) / 10 : 0;
  const autoCount = sorted.filter((d) => d.autoReached).length;
  const riskCount = sorted.filter(isRisk).length;

  const summary: RatingSummary = {
    avgRating,
    avgLabel: `${Math.round(avgRating)}%`,
    autoCount,
    riskCount,
    creditsEarnedYear: creditsEarned(userId),
    creditsPlanYear: CREDITS_PLAN_YEAR,
  };

  const past = pastResults(userId).map(toTranscriptRow);
  const rankRow = academicRankRow(userId);
  const rank: AcademicRank = rankRow
    ? toAcademicRank(rankRow, groupCode)
    : {
        semester: '—',
        placeGroup: 0,
        group: groupCode,
        outOfGroup: 0,
        placeProgram: 0,
        outOfProgram: 0,
        cohortAvg: 0,
        myAvg: summary.avgRating,
        trend: null,
      };

  return {
    summary,
    disciplines: sorted,
    session: rows.map(toSessionExam),
    past,
    rank,
    scale: GRADE_SCALE,
  };
}
