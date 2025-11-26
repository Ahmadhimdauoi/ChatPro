import React, { useState, useEffect, useRef } from 'react';
import { ChatParticipant } from '../types';

interface MentionAutocompleteProps {
  show: boolean;
  query: string;
  users: ChatParticipant[];
  onSelectUser: (user: ChatParticipant) => void;
  position: { x: number; y: number };
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  show,
  query,
  users,
  onSelectUser,
  position
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter users based on query
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(query.toLowerCase())
  );

  // Reset selected index when filtered users change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredUsers]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredUsers.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredUsers.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredUsers[selectedIndex]) {
            onSelectUser(filteredUsers[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          // Parent component should handle hiding
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [show, filteredUsers, selectedIndex, onSelectUser]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && filteredUsers[selectedIndex]) {
      const selectedItem = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, filteredUsers]);

  if (!show || filteredUsers.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-hidden"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        minWidth: '200px'
      }}
    >
      <ul
        ref={listRef}
        className="py-1"
        role="listbox"
        aria-label="Mentionable users"
      >
        {filteredUsers.map((user, index) => (
          <li
            key={user._id}
            className={`px-3 py-2 cursor-pointer flex items-center space-x-2 ${
              index === selectedIndex 
                ? 'bg-blue-50 text-blue-700' 
                : 'hover:bg-gray-50'
            }`}
            onClick={() => onSelectUser(user)}
            role="option"
            aria-selected={index === selectedIndex ? 'true' : 'false'}
          >
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.username}
              </div>
              {user.department && (
                <div className="text-xs text-gray-500 truncate">
                  {user.department}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MentionAutocomplete;
