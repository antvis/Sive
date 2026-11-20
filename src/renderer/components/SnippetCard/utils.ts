import {
  ArrowsDownUp,
  ChartBar,
  ChartBarHorizontal,
  ChartLineUp,
  ChartPieSlice,
  ChartPolar,
  ChartScatter,
  FlowArrow,
  Funnel,
  Gauge,
  Intersect,
  NotePencil,
  Ranking,
  SquaresFour,
  Table,
  TextAa,
  TreeStructure,
  WarningCircle,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

// The model supplies the intent; templates share the same semantic icons.
const intentIcons = new Map<string, Icon>([
  ['趋势观察', ChartLineUp],
  ['分类比较', ChartBarHorizontal],
  ['排名分析', Ranking],
  ['多维比较', ChartPolar],
  ['占比分析', ChartPieSlice],
  ['阶段转化', Funnel],
  ['累计增减', ArrowsDownUp],
  ['进度观察', Gauge],
  ['分布分析', ChartBar],
  ['异常观察', WarningCircle],
  ['相关分析', ChartScatter],
  ['集合关系', Intersect],
  ['层级构成', TreeStructure],
  ['流向分析', FlowArrow],
  ['词频分析', TextAa],
  ['明细查阅', Table],
  ['数据概览', SquaresFour],
]);

export function getIntentIcon(intent: string) {
  return intentIcons.get(intent) ?? NotePencil;
}

export const titleClassName =
  'line-clamp-2 max-h-14 text-xl leading-7 font-semibold break-words text-balance tabular-nums [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_.t8-container]:text-xl! [&_.t8-p]:line-clamp-2 [&_.t8-p]:m-0! [&_.t8-p]:text-xl! [&_.t8-p]:leading-7! [&_.t8-p]:font-semibold!';

export const summaryClassName =
  'min-w-0 text-sm leading-7 text-pretty tabular-nums [&_.gpt-vis-summary]:bg-transparent! [&_.gpt-vis-summary]:p-0! [&_.t8-p]:m-0! [&_.t8-p]:text-sm! [&_.t8-p]:leading-7!';

export const summaryToggleClassName =
  'mt-2 inline-flex items-center gap-1 p-0 text-xs leading-5 text-muted-foreground hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
