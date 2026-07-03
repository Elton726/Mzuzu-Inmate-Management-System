import Card from '../../../../components/common/Card';
import ActivityTable from './ActivityTable';

export default function ActivityQueueWidget({
  title,
  subtitle,
  emptyText,
  activities,
  onOpenTodaySession,
  onOpenExternalOnceSession,
}) {
  return (
    <Card className="rounded-3xl border border-gray-200 bg-white shadow-lg">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
      </div>

      <div className="mt-5">
        {activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
            {emptyText}
          </div>
        ) : (
          <ActivityTable
            activities={activities}
            onOpenTodaySession={onOpenTodaySession}
            onOpenExternalOnceSession={onOpenExternalOnceSession}
          />
        )}
      </div>
    </Card>
  );
}
