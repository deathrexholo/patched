/**
 * Winner Declaration Validation Utilities
 * Validates winners before committing to Firebase
 */

import { WinnerEntry } from '../../types/models/event';

export interface WinnerValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate winner entries before declaration
 */
export function validateWinners(winners: WinnerEntry[]): WinnerValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if empty
  if (!winners || winners.length === 0) {
    errors.push('At least one winner must be selected');
    return { isValid: false, errors, warnings };
  }

  // Check if too many winners
  if (winners.length > 5) {
    errors.push('Maximum 5 winners allowed');
  }

  // Track used submission IDs and ranks
  const usedSubmissionIds = new Set<string>();
  const usedRanks = new Set<number>();
  const allRanks = winners.map((w) => w.rank).sort((a, b) => a - b);

  for (const winner of winners) {
    // Validate rank range
    if (typeof winner.rank !== 'number' || winner.rank < 1 || winner.rank > 5) {
      errors.push(`Invalid rank ${winner.rank}. Must be 1-5`);
    }

    // Check for duplicate submissions
    if (usedSubmissionIds.has(winner.submissionId)) {
      errors.push(
        `Submission ${winner.submissionId} selected multiple times. Each submission can only be a winner once.`
      );
    }
    usedSubmissionIds.add(winner.submissionId);

    // Check for duplicate ranks
    if (usedRanks.has(winner.rank)) {
      errors.push(
        `Rank ${winner.rank} assigned multiple times. Each rank can only have one winner.`
      );
    }
    usedRanks.add(winner.rank);

    // Validate userId
    if (!winner.userId || winner.userId.trim() === '') {
      errors.push('All winners must have valid user IDs');
    }

    // Validate submissionId
    if (!winner.submissionId || winner.submissionId.trim() === '') {
      errors.push('All winners must have valid submission IDs');
    }
  }

  // Check for rank gaps (should be sequential from 1)
  const expectedRanks = Array.from({ length: winners.length }, (_, i) => i + 1);
  const actualRanks = Array.from(usedRanks).sort((a, b) => a - b);

  if (
    actualRanks.length > 0 &&
    !expectedRanks.every((r, i) => actualRanks[i] === r)
  ) {
    warnings.push(
      `Ranks are not sequential. Selected ranks: ${actualRanks.join(', ')}. Consider using ranks 1-${winners.length} for clarity.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Get human-readable error message for display
 */
export function getWinnerValidationErrorMessage(
  validation: WinnerValidationResult
): string {
  if (validation.isValid) {
    return '';
  }

  if (validation.errors.length === 1) {
    return validation.errors[0];
  }

  return `Multiple errors found:\n${validation.errors.map((e) => `• ${e}`).join('\n')}`;
}

/**
 * Format winners for display in confirmation dialog
 */
export function formatWinnersForDisplay(
  winners: WinnerEntry[],
  submissionsMap: Record<string, { userDisplayName?: string }>
): Array<{
  rank: number;
  userName: string;
  submissionId: string;
}> {
  return winners
    .sort((a, b) => a.rank - b.rank)
    .map((winner) => {
      const submission = submissionsMap[winner.submissionId];
      const userName = submission?.userDisplayName || 'Unknown';

      return {
        rank: winner.rank,
        userName,
        submissionId: winner.submissionId
      };
    });
}

/**
 * Medal emoji for rank
 */
export function getMedalForRank(rank: number): string {
  const medals: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉',
    4: '⭐',
    5: '⭐'
  };
  return medals[rank] || '⭐';
}

/**
 * Place label for rank
 */
export function getPlaceLabelForRank(rank: number): string {
  const labels: Record<number, string> = {
    1: '1st Place',
    2: '2nd Place',
    3: '3rd Place',
    4: '4th Place',
    5: '5th Place'
  };
  return labels[rank] || `${rank}th Place`;
}
