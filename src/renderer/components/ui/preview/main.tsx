import {
  CornerDownLeftIcon,
  ChevronDownIcon,
  ClipboardIcon,
  DatabaseIcon,
  DownloadIcon,
  EllipsisIcon,
  MoonIcon,
  PanelRightIcon,
  PencilIcon,
  RouteIcon,
  SearchIcon,
  SunIcon,
  Table2Icon,
  ZapIcon,
} from 'lucide-react';
import { useLayoutEffect, useState } from 'react';
import type { ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { Group, Panel } from 'react-resizable-panels';
import { Badge } from '../badge';
import { Button } from '../button';
import { ButtonGroup, ButtonGroupText } from '../button-group';
import { Checkbox } from '../checkbox';
import { Collapsible, CollapsibleInlineContent, CollapsibleInlineTrigger } from '../collapsible';
import { CollapsibleSection } from '../collapsible-section';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../command';
import { Composer, ComposerFooter, ComposerSubmitButton, ComposerTextarea } from '../composer';
import {
  AlertDialog,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Modal,
} from '../dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../hover-card';
import { Input } from '../input';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../input-group';
import { PanelTabList } from '../panel-tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { ResizeHandle } from '../resize-handle';
import { ScrollArea } from '../scroll-area';
import { SegmentedControl } from '../segmented-control';
import { Select, SelectContent, SelectField, SelectItem, SelectTrigger, SelectValue } from '../select';
import { Separator } from '../separator';
import { SidebarButton, SidebarList } from '../sidebar';
import { Slider } from '../slider';
import { Spinner } from '../spinner';
import { Switch } from '../switch';
import { Table } from '../table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';
import { Textarea } from '../textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../tooltip';
import '../../../styles.css';

const buttonVariants = [
  'default',
  'primary',
  'neutral',
  'secondary',
  'outline',
  'ghost',
  'danger',
  'destructive',
  'link',
] as const;
const buttonSizes = ['xs', 'sm', 'default', 'lg'] as const;
const badgeVariants = ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'] as const;
const pageSizes = [25, 50, 100].map((size) => ({ value: String(size), label: `${size} 行 / 页` }));
const tables = [
  { id: 'orders', title: '订单明细', source: 'PostgreSQL', rows: '2,480', icon: Table2Icon },
  { id: 'customers', title: '客户名录', source: 'CSV', rows: '316', icon: Table2Icon },
  { id: 'regions', title: '地区映射', source: 'SQLite', rows: '34', icon: Table2Icon },
];

function ButtonExample() {
  const [pressed, setPressed] = useState('');

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        {buttonVariants.map((variant) => (
          <Button key={variant} variant={variant} onClick={() => setPressed(variant)}>
            {variant}
          </Button>
        ))}
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-2">
        {buttonSizes.map((size) => (
          <Button key={size} size={size} onClick={() => setPressed(size)}>
            {size}
          </Button>
        ))}
        <Button variant="ghost" size="icon-sm" aria-label="工具栏按钮" onClick={() => setPressed('icon-sm')}>
          <PanelRightIcon aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="行尾编辑"
          title="行尾编辑"
          className="text-sidebar-muted"
          onClick={() => setPressed('编辑')}
        >
          <PencilIcon className="size-[14px]" aria-hidden />
        </Button>
        <Button disabled>禁用</Button>
        <output className="ms-auto min-h-5 text-xs text-muted-foreground" aria-live="polite">
          {pressed && `已点击 ${pressed}`}
        </output>
      </div>
    </div>
  );
}

function ButtonGroupExample() {
  const [page, setPage] = useState(1);

  return (
    <ButtonGroup aria-label="数据分页">
      <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
        上一页
      </Button>
      <ButtonGroupText aria-live="polite">第 {page} 页</ButtonGroupText>
      <Button variant="ghost" size="sm" disabled={page === 3} onClick={() => setPage(page + 1)}>
        下一页
      </Button>
    </ButtonGroup>
  );
}

function SelectExample() {
  const [size, setSize] = useState('50');
  const [strategy, setStrategy] = useState('direct');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SelectField aria-label="每页行数" value={size} onChange={setSize} options={pageSizes} />
      <Select value={strategy} onValueChange={setStrategy}>
        <SelectTrigger aria-label="选择分析策略">
          <SelectValue />
        </SelectTrigger>
        <SelectContent side="top">
          <SelectItem value="direct">
            <ZapIcon aria-hidden className="size-3.5 text-muted-foreground" />
            直接分析
          </SelectItem>
          <SelectItem value="loop">
            <RouteIcon aria-hidden className="size-3.5 text-muted-foreground" />
            多步探索
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function SegmentedControlExample() {
  const [language, setLanguage] = useState('zh-CN');
  return (
    <SegmentedControl
      label="界面语言"
      options={[
        { value: 'zh-CN', label: '中文（简体）' },
        { value: 'en-US', label: 'English' },
      ]}
      value={language}
      onValueChange={setLanguage}
    />
  );
}

function CommandExample() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <SearchIcon size={16} aria-hidden />
            查找数据表
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>查找数据表</DialogTitle>
            <DialogDescription>输入表名筛选，按回车选择。</DialogDescription>
          </DialogHeader>
          <Command label="数据表" className="rounded-xl border">
            <CommandInput placeholder="查找数据表…" />
            <CommandList>
              <CommandEmpty>没有匹配的数据表</CommandEmpty>
              {tables.map(({ title }) => (
                <CommandItem
                  key={title}
                  value={title}
                  onSelect={(value) => {
                    setSelected(value);
                    setOpen(false);
                  }}
                >
                  <Table2Icon aria-hidden />
                  {title}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
      <output className="text-xs text-muted-foreground" aria-live="polite">
        {selected && `已选中 ${selected}`}
      </output>
    </div>
  );
}

function DialogExample() {
  const [open, setOpen] = useState<'modal' | 'alert'>();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={() => setOpen('modal')}>普通弹窗</Button>
      <Button variant="danger" onClick={() => setOpen('alert')}>
        删除确认
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline">组合式弹窗</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>数据预览</DialogTitle>
          </DialogHeader>
          <DialogDescription>订单明细包含 2,480 行数据。</DialogDescription>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="primary">完成</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Modal
        open={open === 'modal'}
        onOpenChange={(visible) => !visible && setOpen(undefined)}
        title="重命名数据表"
        footer={
          <Button variant="primary" onClick={() => setOpen(undefined)}>
            完成
          </Button>
        }
      >
        <Input aria-label="数据表名称" defaultValue="订单明细" />
      </Modal>
      <AlertDialog
        open={open === 'alert'}
        onOpenChange={(visible) => !visible && setOpen(undefined)}
        title="删除示例记录？"
        description="此操作只关闭预览中的确认框。"
        cancel={<Button>取消</Button>}
      >
        <Button variant="danger" onClick={() => setOpen(undefined)}>
          确认
        </Button>
      </AlertDialog>
    </div>
  );
}

function DropdownExample() {
  const [action, setAction] = useState('');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button>
            <EllipsisIcon size={16} aria-hidden />
            更多操作
            <ChevronDownIcon size={14} aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={() => setAction('复制名称')}>
            <ClipboardIcon aria-hidden />
            复制名称
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAction('导出数据')}>
            <DownloadIcon aria-hidden />
            导出数据
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <output className="text-xs text-muted-foreground" aria-live="polite">
        {action && `已选择 ${action}`}
      </output>
    </div>
  );
}

function PanelTabsExample() {
  const [tabs, setTabs] = useState(tables);
  const [activeId, setActiveId] = useState(tables[0].id);

  if (!tabs.length) {
    return (
      <Button
        onClick={() => {
          setTabs(tables);
          setActiveId(tables[0].id);
        }}
      >
        恢复示例页签
      </Button>
    );
  }

  return (
    <Tabs value={activeId} onValueChange={setActiveId}>
      <PanelTabList
        label="数据表页签"
        tabs={tabs.map(({ icon: Icon, ...tab }) => ({ ...tab, icon: <Icon size={14} aria-hidden /> }))}
        activeTabId={activeId}
        visible
        onClose={(id) => {
          const remaining = tabs.filter((tab) => tab.id !== id);
          setTabs(remaining);
          if (activeId === id) setActiveId(remaining[0]?.id ?? '');
        }}
      />
      {tabs.map(({ id, title, rows }) => (
        <TabsContent
          key={id}
          value={id}
          className="mt-3 rounded-lg border bg-card px-3 py-2.5 text-sm text-muted-foreground"
        >
          {title} · {rows} 行
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ComposerExample() {
  const [text, setText] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setText('');
      }}
    >
      <Composer>
        <ComposerTextarea
          aria-label="示例分析问题"
          placeholder="输入你的分析问题…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <ComposerFooter>
          <ComposerSubmitButton
            className="ml-auto"
            type="submit"
            aria-label="示例发送按钮"
            disabled={!text.trim()}
          >
            <CornerDownLeftIcon aria-hidden />
          </ComposerSubmitButton>
        </ComposerFooter>
      </Composer>
    </form>
  );
}

function SidebarExample() {
  const [current, setCurrent] = useState('数据源');

  return (
    <SidebarList>
      {['数据源', '洞察 Snippet'].map((label) => (
        <SidebarButton key={label} aria-current={current === label} onClick={() => setCurrent(label)}>
          {label}
        </SidebarButton>
      ))}
    </SidebarList>
  );
}

const catalog: ReadonlyArray<{
  id: string;
  title: string;
  items: ReadonlyArray<{ id: string; title: string; example: ComponentType; wide?: boolean; inUse?: false }>;
}> = [
  {
    id: 'actions',
    title: '操作',
    items: [
      { id: 'button', title: '按钮', example: ButtonExample, wide: true },
      { id: 'button-group', title: '按钮组', example: ButtonGroupExample },
      { id: 'dropdown-menu', title: '下拉菜单', example: DropdownExample, inUse: false },
    ],
  },
  {
    id: 'forms',
    title: '表单',
    items: [
      {
        id: 'input',
        title: '输入框',
        example: () => (
          <div className="grid gap-3">
            <Input aria-label="数据源名称" placeholder="数据源名称" />
            <Input aria-label="禁用输入框" value="由连接配置提供" disabled />
          </div>
        ),
      },
      {
        id: 'textarea',
        title: '多行输入框',
        example: () => (
          <Textarea aria-label="数据集说明" placeholder="描述数据集的用途和字段含义…" rows={3} />
        ),
      },
      { id: 'select', title: '选择框', example: SelectExample },
      { id: 'segmented-control', title: '分段控件', example: SegmentedControlExample },
      {
        id: 'checkbox',
        title: '复选框',
        example: () => (
          <label className="flex w-fit items-center gap-2 text-sm">
            <Checkbox defaultChecked />
            包含字段统计
          </label>
        ),
      },
      {
        id: 'slider',
        title: '滑块',
        example: () => <Slider aria-label="界面字号" min={12} max={20} step={1} defaultValue={13} />,
      },
      {
        id: 'switch',
        title: '开关',
        example: () => (
          <label className="flex w-fit items-center gap-2 text-sm">
            <Switch defaultChecked />
            自动检查更新
          </label>
        ),
      },
      {
        id: 'input-group',
        title: '输入框组合',
        example: () => (
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon aria-hidden />
            </InputGroupAddon>
            <InputGroupInput aria-label="搜索字段" placeholder="按字段名搜索…" />
          </InputGroup>
        ),
      },
      { id: 'composer', title: '对话输入', example: ComposerExample, wide: true },
    ],
  },
  {
    id: 'overlays',
    title: '浮层与反馈',
    items: [
      { id: 'dialog', title: '弹窗', example: DialogExample, wide: true },
      {
        id: 'popover',
        title: '弹出面板',
        example: () => (
          <Popover>
            <PopoverTrigger asChild>
              <Button>查看数据源</Button>
            </PopoverTrigger>
            <PopoverContent aria-label="数据源信息">PostgreSQL · 订单明细</PopoverContent>
          </Popover>
        ),
      },
      {
        id: 'tooltip',
        title: '工具提示',
        example: () => (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="outline" aria-label="打开右侧面板">
                <PanelRightIcon aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>打开右侧面板</TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: 'hover-card',
        title: '悬浮卡片',
        inUse: false,
        example: () => (
          <HoverCard openDelay={250}>
            <HoverCardTrigger asChild>
              <Button asChild variant="link">
                <a href="#table">订单明细</a>
              </Button>
            </HoverCardTrigger>
            <HoverCardContent align="start">
              <div className="flex items-center gap-2 font-semibold">
                <DatabaseIcon className="size-4" aria-hidden />
                订单明细
              </div>
              <p className="mt-2 text-muted-foreground">PostgreSQL · 2,480 行</p>
            </HoverCardContent>
          </HoverCard>
        ),
      },
      {
        id: 'badge',
        title: '徽标',
        example: () => (
          <div className="flex flex-wrap items-center gap-2">
            {badgeVariants.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        id: 'spinner',
        title: '加载指示器',
        example: () => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-label="读取中" />
            <span aria-hidden>正在读取数据</span>
          </div>
        ),
      },
    ],
  },
  {
    id: 'content',
    title: '内容与导航',
    items: [
      { id: 'command', title: '命令列表', example: CommandExample, inUse: false },
      { id: 'panel-tabs', title: '面板页签', example: PanelTabsExample },
      {
        id: 'tabs',
        title: '标签页',
        example: () => (
          <Tabs defaultValue="data">
            <TabsList aria-label="数据集信息">
              <TabsTrigger value="data">数据</TabsTrigger>
              <TabsTrigger value="fields">字段</TabsTrigger>
            </TabsList>
            <TabsContent value="data" className="mt-3">
              2,480 行
            </TabsContent>
            <TabsContent value="fields" className="mt-3">
              订单编号、客户编号
            </TabsContent>
          </Tabs>
        ),
      },
      { id: 'sidebar', title: '侧栏导航', example: SidebarExample },
      {
        id: 'resize-handle',
        title: '面板分隔条',
        example: () => (
          <Group className="h-20 text-sm text-muted-foreground" orientation="horizontal">
            <Panel defaultSize="50%" minSize="20%">
              <div className="grid h-full place-items-center rounded-lg bg-page">对话</div>
            </Panel>
            <ResizeHandle aria-label="调整示例面板宽度" />
            <Panel minSize="20%">
              <div className="grid h-full place-items-center rounded-lg bg-page">结果</div>
            </Panel>
          </Group>
        ),
      },
      {
        id: 'collapsible',
        title: '折叠',
        example: () => (
          <Collapsible>
            <CollapsibleInlineTrigger>
              <Table2Icon aria-hidden className="size-4 text-muted-foreground" />
              显示字段详情
            </CollapsibleInlineTrigger>
            <CollapsibleInlineContent>订单编号 · 字符串 · 主键</CollapsibleInlineContent>
          </Collapsible>
        ),
      },
      {
        id: 'collapsible-section',
        title: '折叠区块',
        example: () => (
          <CollapsibleSection title="数据结构" icon={Table2Icon} defaultOpen>
            <p className="px-2 py-1 text-sm text-muted-foreground">订单编号、客户编号、订单金额</p>
          </CollapsibleSection>
        ),
      },
      {
        id: 'scroll-area',
        title: '滚动区域',
        example: () => (
          <ScrollArea className="h-24 rounded-lg border">
            <ul className="divide-y px-3 text-sm">
              {['订单编号', '客户编号', '交易日期', '币种', '订单金额', '地区'].map((field) => (
                <li key={field} className="py-1.5">
                  {field}
                </li>
              ))}
            </ul>
          </ScrollArea>
        ),
      },
      {
        id: 'separator',
        title: '分隔线',
        inUse: false,
        example: () => (
          <div className="grid gap-2 text-sm text-muted-foreground">
            <span>连接信息</span>
            <Separator />
            <span>同步设置</span>
          </div>
        ),
      },
      {
        id: 'table',
        title: '表格',
        wide: true,
        example: () => (
          <Table aria-label="可用数据表">
            <thead>
              <tr>
                <th scope="col">数据表</th>
                <th scope="col">来源</th>
                <th scope="col" className="text-right">
                  行数
                </th>
              </tr>
            </thead>
            <tbody>
              {tables.map(({ id, title, source, rows }) => (
                <tr key={id}>
                  <td>{title}</td>
                  <td>{source}</td>
                  <td className="text-right tabular-nums">{rows}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ),
      },
    ],
  },
];

function ComponentPreview() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
  );

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.fontSize = '13px';
  }, [theme]);

  return (
    <TooltipProvider>
      <a
        href="#catalog"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-30 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        跳转到组件样例
      </a>
      <header className="sticky top-0 z-20 border-b bg-sidebar-canvas">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2.5 text-lg font-semibold">
            <img className="size-7 dark:invert" src="../../../sive.svg" alt="" />
            Sive
          </div>
          <div
            role="group"
            aria-label="主题"
            className="flex gap-0.5 rounded-lg border bg-workspace-control p-0.5"
          >
            {(
              [
                { value: 'light', label: '浅色', icon: SunIcon },
                { value: 'dark', label: '深色', icon: MoonIcon },
              ] as const
            ).map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant="ghost"
                size="xs"
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                <Icon aria-hidden />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 sm:px-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav
          aria-label="组件索引"
          className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6.5rem)] lg:self-start lg:overflow-y-auto lg:pe-5"
        >
          <div className="flex flex-wrap gap-2 pt-5 lg:grid lg:gap-5 lg:pt-1">
            {catalog.map(({ id, title, items }) => (
              <div key={id}>
                <a
                  href={`#${id}`}
                  className="block rounded-md px-2 py-1 text-xs font-semibold text-ink hover:bg-sidebar-highlight"
                >
                  {title}
                </a>
                <ul className="mt-1 hidden space-y-0.5 lg:block">
                  {items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-sidebar-highlight hover:text-ink"
                      >
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <main id="catalog" className="min-w-0 lg:pt-9">
          <div className="mb-10 border-b pb-7">
            <h1 className="text-4xl leading-tight font-semibold tracking-tight">客户端组件库</h1>
            <p className="mt-2 text-muted-foreground">直接预览客户端的共享组件。可操作示例和切换主题。</p>
          </div>
          {catalog.map(({ id, title, items }) => (
            <section key={id} id={id} aria-labelledby={`${id}-title`} className="mb-10">
              <h2 id={`${id}-title`} className="mb-3 text-xl font-semibold">
                {title}
              </h2>
              <div className="grid gap-3.5 sm:grid-cols-2">
                {items.map(({ id: name, title: label, example: Example, wide, inUse }) => (
                  <article
                    key={name}
                    id={name}
                    aria-labelledby={`${name}-title`}
                    className={`min-w-0 rounded-xl border bg-surface target:border-accent target:ring-1 target:ring-accent ${wide ? 'sm:col-span-2' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 border-b px-4 py-2.5">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <h3 id={`${name}-title`} className="font-semibold">
                          {label}
                        </h3>
                        {inUse === false && (
                          <span className="text-xs text-muted-foreground">暂无应用页面调用</span>
                        )}
                      </div>
                      <code className="font-chat-mono text-xs text-muted-foreground">{name}.tsx</code>
                    </div>
                    <div className="px-4 py-4">
                      <Example />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </TooltipProvider>
  );
}

createRoot(document.getElementById('root')!).render(<ComponentPreview />);
