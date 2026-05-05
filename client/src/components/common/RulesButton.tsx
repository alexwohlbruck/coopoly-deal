// RulesButton — top-left "RULES" pill used by the lobby and waiting
// room. Wraps the shared IconButton with a BookOpen icon + label so
// both screens have an identical control.

import { BookOpen } from "lucide-react";
import { IconButton } from "./IconButton";

interface RulesButtonProps {
  onClick: () => void;
}

export function RulesButton({ onClick }: RulesButtonProps) {
  return (
    <IconButton onClick={onClick} title="Game rules" label="Rules">
      <BookOpen className="w-4 h-4" />
    </IconButton>
  );
}
