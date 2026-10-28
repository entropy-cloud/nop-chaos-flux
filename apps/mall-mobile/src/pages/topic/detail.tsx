import { useAsync } from '../../hooks/use-async';
import { fetchTopicDetail } from '../../api/catalog-api';
import { PageShell } from '../../components/page-shell';
import { Skeleton, EmptyState, ErrorRetry } from '../../components/state-views';

export interface TopicDetailPageProps {
  topicId: string;
}

export function TopicDetailPage({ topicId }: TopicDetailPageProps) {
  const topic = useAsync(() => fetchTopicDetail(topicId), topicId);
  const data = topic.data;

  return (
    <PageShell title={data?.title ?? '专题详情'}>
      {topic.loading ? (
        <Skeleton lines={4} />
      ) : topic.error ? (
        <ErrorRetry message={topic.error} onRetry={() => topic.refetch()} />
      ) : !data ? (
        <EmptyState message="专题不存在" />
      ) : (
        <article className="mall-topic-detail">
          {data.picUrl ? (
            <img className="mall-topic-detail-pic" src={data.picUrl} alt={data.title ?? ''} />
          ) : null}
          <h1 className="mall-topic-detail-title">{data.title ?? ''}</h1>
          {data.subtitle ? <p className="mall-topic-detail-sub">{data.subtitle}</p> : null}
          {data.content ? (
            <div className="mall-topic-detail-content">{data.content}</div>
          ) : (
            <EmptyState message="暂无内容" />
          )}
        </article>
      )}
    </PageShell>
  );
}
