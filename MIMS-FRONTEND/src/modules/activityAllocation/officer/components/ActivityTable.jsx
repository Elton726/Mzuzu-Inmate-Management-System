import Button from '../../../../components/common/Button';

const securityTone = {
  maximum: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  minimum: 'bg-emerald-100 text-emerald-700',
};

const formatStatusLabel = (value) =>
  String(value || '')
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export default function ActivityTable({
  activities,
  workingAction,
  onOpenTodaySession,
  onOpenExternalOnceSession,
  onOpenAllocation,
  onOpenCreateSession,
  onOpenAutoAssign,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-700">
            <th className="py-3 pr-4">Name</th>
            <th className="py-3 pr-4">Type</th>
            <th className="py-3 pr-4">Security</th>
            <th className="py-3 pr-4">Max Participants</th>
            <th className="py-3 pr-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => {
            const isInternal = activity.activity_type === 'internal';
            const maxParticipants = isInternal && !activity.max_participants
              ? 'No limit'
              : activity.max_participants ?? '-';

            return (
              <tr key={activity.id} className="border-b last:border-b-0">
                <td className="py-3 pr-4 font-semibold text-gray-900">{activity.name}</td>
                <td className="py-3 pr-4">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {formatStatusLabel(activity.activity_type)}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${securityTone[activity.security_level] || 'bg-gray-100 text-gray-700'}`}>
                    {activity.security_level ?? 'No security'}
                  </span>
                </td>
                <td className="py-3 pr-4">{maxParticipants}</td>
                <td className="py-3 pr-4">
                  <div className="flex flex-wrap gap-2">
                    {isInternal ? (
                    <Button
                      className="px-3 py-1 text-xs"
                      onClick={() => onOpenTodaySession(activity)}
                    >
                      Today’s Session
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="px-3 py-1 text-xs"
                        onClick={() => onOpenExternalOnceSession(activity)}
                      >
                        Create Session
                      </Button>
                      <Button
                        variant="outline"
                        className="px-3 py-1 text-xs"
                        onClick={() => onOpenAllocation(activity)}
                      >
                        Allocate Inmates
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
