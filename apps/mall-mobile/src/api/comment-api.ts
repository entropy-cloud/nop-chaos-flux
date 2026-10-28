import { postRpc } from './rpc';

export interface CommentStarDistribution {
  '1'?: number;
  '2'?: number;
  '3'?: number;
  '4'?: number;
  '5'?: number;
}

export interface CommentSummary {
  totalCount?: number;
  goodRate?: number;
  starDistribution?: CommentStarDistribution;
  prosTags?: string[];
  consTags?: string[];
}

export const COMMENT_TYPE_GOODS = 0;

const URL_COMMENT_SUMMARY = '/r/LitemallComment__getCommentSummary';

export async function fetchCommentSummary(valueId: string): Promise<CommentSummary> {
  const data = await postRpc<CommentSummary>(URL_COMMENT_SUMMARY, {
    type: COMMENT_TYPE_GOODS,
    valueId,
  });
  return data ?? {};
}
