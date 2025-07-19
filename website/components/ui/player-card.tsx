'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Player } from '@/types/player';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PlayerCardProps {
  player: Player;
  compact?: boolean;
  showTeam?: boolean;
  className?: string;
}

// Rating color system
const getRatingColor = (rating: number) => {
  if (rating >= 90) return 'text-green-500 bg-green-500/10 border-green-500/20';
  if (rating >= 80) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  if (rating >= 70) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  return 'text-red-500 bg-red-500/10 border-red-500/20';
};

// Development trait styling
const getTraitColor = (trait: string) => {
  switch (trait?.toLowerCase()) {
    case 'x-factor': return 'bg-purple-500 text-white';
    case 'superstar': return 'bg-yellow-500 text-black';
    case 'star': return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};

// Position group colors
const getPositionColor = (position: string) => {
  const offensePositions = ['QB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT'];
  const defensePositions = ['LE', 'RE', 'DT', 'LOLB', 'MLB', 'ROLB', 'CB', 'FS', 'SS'];
  const specialTeamsPositions = ['K', 'P'];

  if (offensePositions.includes(position)) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (defensePositions.includes(position)) return 'bg-red-500/10 text-red-400 border-red-500/20';
  if (specialTeamsPositions.includes(position)) return 'bg-green-500/10 text-green-400 border-green-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
};

export function PlayerCard({ player, compact = false, showTeam = true, className }: PlayerCardProps) {
  const ratingColorClass = getRatingColor(player.playerBestOvr);
  const positionColorClass = getPositionColor(player.position);
  
  if (compact) {
    return (
      <Link href={`/players/${player.websiteSlug || `${player.firstName.toLowerCase()}-${player.lastName.toLowerCase()}-${player.rosterId}`}`}>
        <Card className={cn(
          "hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer bg-slate-800/50 border-slate-700 hover:border-slate-600",
          className
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-white truncate">
                  {player.firstName} {player.lastName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={cn("text-xs", positionColorClass)}>
                    {player.position}
                  </Badge>
                  {showTeam && player.teamId > 0 && (
                    <span className="text-xs text-gray-400">Team {player.teamId}</span>
                  )}
                </div>
              </div>
              <div className={cn("text-right")}>
                <div className={cn("text-2xl font-bold px-3 py-1 rounded-lg border", ratingColorClass)}>
                  {player.playerBestOvr}
                </div>
                <div className="text-xs text-gray-400 mt-1">OVR</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/players/${player.websiteSlug || `${player.firstName.toLowerCase()}-${player.lastName.toLowerCase()}-${player.rosterId}`}`}>
      <Card className={cn(
        "hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer bg-slate-800/50 border-slate-700 hover:border-slate-600",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">
                {player.firstName} {player.lastName}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className={cn("text-sm", positionColorClass)}>
                  {player.position}
                </Badge>
                {player.devTrait && (
                  <Badge className={cn("text-xs", getTraitColor(player.devTrait.toString()))}>
                    {player.devTrait === 3 ? 'X-Factor' : 
                     player.devTrait === 2 ? 'Superstar' :
                     player.devTrait === 1 ? 'Star' : 'Normal'}
                  </Badge>
                )}
              </div>
              {showTeam && (
                <div className="text-sm text-gray-400">
                  {player.teamId > 0 ? `Team ${player.teamId}` : 'Free Agent'}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className={cn("text-4xl font-bold px-4 py-2 rounded-xl border-2", ratingColorClass)}>
                {player.playerBestOvr}
              </div>
              <div className="text-sm text-gray-400 mt-1">Overall</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Key Ratings */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Key Ratings</h4>
            
            {/* Position-specific ratings */}
            {player.position === 'QB' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Throw Power</span>
                    <span className="text-white">{player.throwPowerRating || 0}</span>
                  </div>
                  <Progress 
                    value={(player.throwPowerRating || 0)} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Accuracy</span>
                    <span className="text-white">{player.throwAccRating || 0}</span>
                  </div>
                  <Progress 
                    value={(player.throwAccRating || 0)} 
                    className="h-2"
                  />
                </div>
              </div>
            )}

            {/* Universal ratings */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Speed</span>
                  <span className="text-white">{player.speedRating || 0}</span>
                </div>
                <Progress 
                  value={(player.speedRating || 0)} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Awareness</span>
                  <span className="text-white">{player.awareRating || 0}</span>
                </div>
                <Progress 
                  value={(player.awareRating || 0)} 
                  className="h-2"
                />
              </div>
            </div>
          </div>

          {/* Contract Info */}
          {player.contractSalary && (
            <div className="mt-4 pt-3 border-t border-slate-700">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Contract</span>
                <div className="text-right">
                  <div className="text-white font-semibold">
                    ${(player.contractSalary / 1000000).toFixed(1)}M
                  </div>
                  <div className="text-gray-400 text-xs">
                    {player.contractYearsLeft || 0} years left
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Player Info */}
          <div className="mt-4 pt-3 border-t border-slate-700">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Age:</span>
                <span className="text-white ml-2">{player.age || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Experience:</span>
                <span className="text-white ml-2">{player.yearsPro || 0} years</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default PlayerCard;