'use client';

import { matchSlashPrefix, type SlashCommand } from '@/lib/slashCommands';

type Props = {
  query: string;
  activeIndex: number;
  onSelect: (cmd: SlashCommand) => void;
  onHover?: (index: number) => void;
};

export function SlashMenu({ query, activeIndex, onSelect, onHover }: Props) {
  const matches = matchSlashPrefix(query);

  if (matches.length === 0) {
    return (
      <div className="slash-menu" role="listbox" aria-label="Slash commands">
        <div className="slash-menu-empty">no commands match</div>
      </div>
    );
  }

  return (
    <div className="slash-menu" role="listbox" aria-label="Slash commands">
      {matches.map((cmd, i) => (
        <div
          key={cmd.name}
          role="option"
          aria-selected={i === activeIndex}
          className={`slash-menu-item${i === activeIndex ? ' active' : ''}`}
          onMouseDown={e => {
            e.preventDefault();
            onSelect(cmd);
          }}
          onMouseEnter={() => onHover?.(i)}
        >
          <div className="slash-menu-name">/{cmd.name}</div>
          <div className="slash-menu-hint">{cmd.hint}</div>
        </div>
      ))}
    </div>
  );
}
