// RulesButton — top-left "RULES" pill used by the lobby and waiting
// room. Wraps the shared IconButton with a BookOpen icon + label so
// both screens have an identical control.

import { BookOpen } from "lucide-react";
import { IconButton } from "./IconButton";
import { useI18n } from "../../i18n";

interface RulesButtonProps {
  onClick: () => void;
}

export function RulesButton({ onClick }: RulesButtonProps) {
  const { t } = useI18n();
  return (
    <IconButton onClick={onClick} title={t.common.gameRules} label={t.common.rules}>
      <BookOpen className="w-4 h-4" />
    </IconButton>
  );
}
