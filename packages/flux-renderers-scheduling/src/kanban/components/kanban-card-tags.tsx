import React from 'react';
import { cn } from '@nop-chaos/ui';

export interface KanbanTag {
  id: string;
  text: string;
  color: string;
}

export interface KanbanMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface KanbanCardTagsProps {
  color?: string;
  tags?: KanbanTag[];
  members?: KanbanMember[];
  maxVisibleTags?: number;
  maxVisibleMembers?: number;
  className?: string;
}

function getInitials(name: string): string {
  return name.split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
}

export function KanbanCardTags({
  color,
  tags,
  members,
  maxVisibleTags = 3,
  maxVisibleMembers = 3,
  className,
}: KanbanCardTagsProps) {
  return (
    <div className={cn('nop-kanban-card-tags flex items-center gap-1.5 flex-wrap mt-1.5', className)}>
      {color && (
        <div
          className="nop-kanban-card-color-dot w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}

      {tags && tags.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {tags.slice(0, maxVisibleTags).map((tag) => (
            <span
              key={tag.id}
              className="nop-kanban-card-tag inline-flex items-center px-1.5 py-0.5 text-[10px] rounded-full leading-tight"
              style={{ backgroundColor: tag.color + '30', color: tag.color }}
            >
              {tag.text}
            </span>
          ))}
          {tags.length > maxVisibleTags && (
            <span className="text-[10px] text-gray-400">+{tags.length - maxVisibleTags}</span>
          )}
        </div>
      )}

      {members && members.length > 0 && (
        <div className="nop-kanban-card-members flex items-center ml-auto">
          <div className="flex -space-x-1.5">
            {members.slice(0, maxVisibleMembers).map((member) => (
              <div
                key={member.id}
                className="nop-kanban-card-member w-5 h-5 rounded-full bg-blue-100 border border-white flex items-center justify-center text-[8px] font-medium text-blue-700 overflow-hidden"
                title={member.name}
              >
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  getInitials(member.name)
                )}
              </div>
            ))}
          </div>
          {members.length > maxVisibleMembers && (
            <span className="text-[10px] text-gray-400 ml-1">+{members.length - maxVisibleMembers}</span>
          )}
        </div>
      )}
    </div>
  );
}
