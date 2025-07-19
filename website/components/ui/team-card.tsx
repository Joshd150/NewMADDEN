'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Team } from '@/types/team';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Users, Crown, Clock } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  showOwnership?: boolean;
  showWaitlist?: boolean;
  className?: string;
}

export function TeamCard({ team, showOwnership = true, showWaitlist = true, className }: TeamCardProps) {
  const isOpen = team.ownership?.isOpen || !team.ownership?.discordUserId;
  
  return (
    <Card className={cn(
      "hover:shadow-xl transition-all duration-300 hover:scale-105 bg-slate-800/50 border-slate-700 hover:border-slate-600",
      isOpen && "border-green-500/30 hover:border-green-500/50",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Team Logo Placeholder */}
            <div 
              className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold text-white"
              style={{ 
                backgroundColor: team.primaryColor ? `#${team.primaryColor.toString(16).padStart(6, '0')}` : '#1e293b'
              }}
            >
              {team.abbrName || team.cityName.substring(0, 2).toUpperCase()}
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-white">
                {team.displayName}
              </h3>
              <p className="text-gray-400">
                {team.cityName}
              </p>
              
              {/* Team Record */}
              {team.statistics && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-300">
                    {team.statistics.wins}-{team.statistics.losses}
                    {team.statistics.ties > 0 && `-${team.statistics.ties}`}
                  </span>
                  {team.statistics.divisionRank && (
                    <Badge variant="outline" className="text-xs">
                      #{team.statistics.divisionRank} in Division
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Ownership Status */}
          {showOwnership && (
            <div className="text-right">
              {isOpen ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <Users className="w-3 h-3 mr-1" />
                  Open
                </Badge>
              ) : (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  <Crown className="w-3 h-3 mr-1" />
                  Owned
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Owner Information */}
        {showOwnership && team.ownership && (
          <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Ownership</h4>
            {team.ownership.discordUserId ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-xs text-white">
                  {team.ownership.discordUsername?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-white text-sm">
                  {team.ownership.discordUsername || 'Discord User'}
                </span>
              </div>
            ) : (
              <div className="text-gray-400 text-sm">
                No owner assigned
              </div>
            )}
          </div>
        )}

        {/* Team Stats */}
        {team.statistics && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Season Stats</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">Points For:</span>
                <span className="text-white ml-2">{team.statistics.pointsFor || 0}</span>
              </div>
              <div>
                <span className="text-gray-400">Points Against:</span>
                <span className="text-white ml-2">{team.statistics.pointsAgainst || 0}</span>
              </div>
            </div>
            
            {/* Point Differential */}
            <div className="mt-2">
              <span className="text-gray-400 text-sm">Point Differential:</span>
              <span className={cn(
                "ml-2 font-semibold",
                (team.statistics.pointsFor - team.statistics.pointsAgainst) > 0 
                  ? "text-green-400" 
                  : "text-red-400"
              )}>
                {team.statistics.pointsFor - team.statistics.pointsAgainst > 0 ? '+' : ''}
                {team.statistics.pointsFor - team.statistics.pointsAgainst}
              </span>
            </div>
          </div>
        )}

        {/* Salary Cap Info */}
        {team.roster?.salary_cap && (
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Salary Cap</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Used:</span>
                <span className="text-white">
                  ${(team.roster.salary_cap.used / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Available:</span>
                <span className="text-green-400">
                  ${(team.roster.salary_cap.available / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(team.roster.salary_cap.used / team.roster.salary_cap.total) * 100}%` 
                  }}
                />
              </div>
              <div className="text-xs text-gray-400 text-center">
                {((team.roster.salary_cap.used / team.roster.salary_cap.total) * 100).toFixed(1)}% used
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button asChild className="flex-1" variant="outline">
            <Link href={`/teams/${team.websiteSlug || team.cityName.toLowerCase().replace(/\s+/g, '-')}`}>
              View Team
            </Link>
          </Button>
          
          {isOpen && showWaitlist && (
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <Clock className="w-4 h-4 mr-1" />
              Join Waitlist
            </Button>
          )}
        </div>

        {/* Waitlist Position */}
        {team.ownership?.waitlistPosition && (
          <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-yellow-400" />
              <span className="text-yellow-400">
                #{team.ownership.waitlistPosition} in waitlist
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamCard;