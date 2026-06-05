import { useState, useEffect } from 'react';
import api from '../services/api';

interface RackCode {
  id: string;
  code: string;
}

interface MovedByUser {
  id: string;
  name: string;
}

interface MoveHistoryEntry {
  id: string;
  fromRack: RackCode;
  toRack: RackCode;
  fromRackId: string;
  toRackId: string;
  movedById: string;
  movedBy: MovedByUser;
  authorizedById?: string;
  authorizedBy?: MovedByUser;
  reason?: string;
  timestamp: string;
  createdAt: string;
  boxCount: number;
  photosBefore?: string[];
  photosAfter?: string[];
}

interface MoveHistoryResponse {
  moves: MoveHistoryEntry[];
  total: number;
}

interface RackMoveHistoryProps {
  rackId: string;
}

export default function RackMoveHistory({ rackId }: RackMoveHistoryProps) {
  const [moves, setMoves] = useState<MoveHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentRackCode, setCurrentRackCode] = useState<string>('');

  useEffect(() => {
    if (rackId) {
      loadMoveHistory();
      loadCurrentRack();
    }
  }, [rackId]);

  const loadCurrentRack = async () => {
    try {
      const { data } = await api.get<{ rack: { code: string } }>(`/racks/${rackId}`);
      setCurrentRackCode(data.rack.code);
    } catch {
      // Non-critical — color coding will just not highlight
    }
  };

  const loadMoveHistory = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<MoveHistoryResponse>(`/racks/${rackId}/move-history`);
      setMoves(data.moves || []);
    } catch (err) {
      console.error('Failed to load move history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimelineColor = (entry: MoveHistoryEntry) => {
    if (entry.fromRack?.code === currentRackCode) return 'border-l-orange-500';
    if (entry.toRack?.code === currentRackCode) return 'border-l-green-500';
    return 'border-l-gray-300';
  };

  const getBadgeColor = (entry: MoveHistoryEntry) => {
    if (entry.fromRack?.code === currentRackCode) return 'bg-orange-100 text-orange-800';
    if (entry.toRack?.code === currentRackCode) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-gray-500 text-sm">Loading move history...</span>
      </div>
    );
  }

  if (!moves.length) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">🔄</div>
        <p className="text-gray-500 font-medium">No moves recorded for this rack</p>
        <p className="text-gray-400 text-sm mt-1">Box move history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span>📋</span> Move History
        <span className="text-sm font-normal text-gray-400">({moves.length} move{moves.length !== 1 ? 's' : ''})</span>
      </h3>

      <div className="relative">
        {moves.map((entry, index) => (
          <div key={entry.id} className="relative pb-6 pl-8">
            {/* Timeline line */}
            {index < moves.length - 1 && (
              <div className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-gray-200"></div>
            )}

            {/* Timeline dot */}
            <div
              className={`absolute left-1 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs bg-white ${
                entry.fromRack?.code === currentRackCode
                  ? 'border-orange-500'
                  : entry.toRack?.code === currentRackCode
                  ? 'border-green-500'
                  : 'border-gray-300'
              }`}
            >
              🔄
            </div>

            {/* Card */}
            <div
              className={`bg-white border rounded-lg p-4 shadow-sm border-l-4 ${getTimelineColor(entry)}`}
            >
              {/* Header: from → to */}
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span
                  className={`font-mono font-semibold ${
                    entry.fromRack?.code === currentRackCode ? 'text-orange-600' : 'text-gray-700'
                  }`}
                >
                  {entry.fromRack?.code || 'Unknown'}
                </span>
                <span className="text-gray-400">→</span>
                <span
                  className={`font-mono font-semibold ${
                    entry.toRack?.code === currentRackCode ? 'text-green-600' : 'text-gray-700'
                  }`}
                >
                  {entry.toRack?.code || 'Unknown'}
                </span>
                <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${getBadgeColor(entry)}`}>
                  {entry.boxCount} box{entry.boxCount !== 1 ? 'es' : ''}
                </span>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-400 mb-2">
                {formatTimestamp(entry.timestamp || entry.createdAt)}
              </div>

              {/* People */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-gray-600 mb-2">
                <div>
                  <span className="text-gray-400 text-xs">Moved By:</span>{' '}
                  <span className="font-medium">{entry.movedBy?.name || 'Unknown'}</span>
                </div>
                {entry.authorizedBy?.name && (
                  <div>
                    <span className="text-gray-400 text-xs">Authorized By:</span>{' '}
                    <span className="font-medium">{entry.authorizedBy.name}</span>
                  </div>
                )}
              </div>

              {/* Reason */}
              {entry.reason && (
                <div className="mb-2 text-sm text-gray-600">
                  <span className="text-gray-400 text-xs">Reason:</span>{' '}
                  <span className="italic">{entry.reason}</span>
                </div>
              )}

              {/* Before/After Photos */}
              {(entry.photosBefore?.length || entry.photosAfter?.length) ? (
                <div className="flex gap-4 mt-3 flex-wrap">
                  {entry.photosBefore?.length ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1 font-medium">Before:</p>
                      <div className="flex gap-2">
                        {entry.photosBefore.map((url, i) => (
                          <a
                            key={`before-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={url}
                              alt={`Before photo ${i + 1}`}
                              className="w-16 h-16 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {entry.photosAfter?.length ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1 font-medium">After:</p>
                      <div className="flex gap-2">
                        {entry.photosAfter.map((url, i) => (
                          <a
                            key={`after-${i}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={url}
                              alt={`After photo ${i + 1}`}
                              className="w-16 h-16 object-cover rounded border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                              loading="lazy"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
