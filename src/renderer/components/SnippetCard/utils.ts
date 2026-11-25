import {
  ArrowDownUpIcon,
  CaseSensitiveIcon,
  ChartBarIcon,
  ChartColumnIncreasingIcon,
  ChartLineIcon,
  ChartPieIcon,
  ChartRadarIcon,
  ChartScatterIcon,
  CircleAlertIcon,
  CornerUpRightIcon,
  FunnelIcon,
  GaugeIcon,
  Grid2X2Icon,
  ListTreeIcon,
  NotebookPenIcon,
  PodiumIcon,
  SquaresIntersectIcon,
  Table2Icon,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// The model supplies the intent; templates share the same semantic icons.
const intentIcons = new Map<string, LucideIcon>([
  ['趋势观察', ChartLineIcon],
  ['分类比较', ChartBarIcon],
  ['排名分析', PodiumIcon],
  ['多维比较', ChartRadarIcon],
  ['占比分析', ChartPieIcon],
  ['阶段转化', FunnelIcon],
  ['累计增减', ArrowDownUpIcon],
  ['进度观察', GaugeIcon],
  ['分布分析', ChartColumnIncreasingIcon],
  ['异常观察', CircleAlertIcon],
  ['相关分析', ChartScatterIcon],
  ['集合关系', SquaresIntersectIcon],
  ['层级构成', ListTreeIcon],
  ['流向分析', CornerUpRightIcon],
  ['词频分析', CaseSensitiveIcon],
  ['明细查阅', Table2Icon],
  ['数据概览', Grid2X2Icon],
]);

export function getIntentIcon(intent: string) {
  return intentIcons.get(intent) ?? NotebookPenIcon;
}
