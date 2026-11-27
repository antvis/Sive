"use client";

import { i18n, useI18n } from "../../i18n";

import type { UIMessage } from "ai";
import type { ComponentProps, HTMLAttributes, ReactElement } from "react";

import { Button } from "../ui/button";
import {
  ButtonGroup,
  ButtonGroupText,
} from "../ui/button-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { sqlHighlightTheme } from "../../lib/sql-highlight-theme";
import { cn } from "../../lib/utils";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { defaultComponents, Streamdown } from "streamdown";
import type { MermaidErrorComponentProps } from "streamdown";
import { MarkdownTable } from "./table";

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: UIMessage["role"];
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex min-w-0 max-w-full flex-col gap-2 overflow-hidden text-base text-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({
  className,
  children,
  ...props
}: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
};

export const MessageAction = ({
  tooltip,
  children,
  label,
  variant = "ghost",
  size = "icon-sm",
  ...props
}: MessageActionProps) => {
  const button = (
    <Button size={size} type="button" variant={variant} {...props}>
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

interface MessageBranchContextType {
  currentBranch: number;
  totalBranches: number;
  goToPrevious: () => void;
  goToNext: () => void;
  branches: ReactElement[];
  setBranches: (branches: ReactElement[]) => void;
}

const MessageBranchContext = createContext<MessageBranchContextType | null>(
  null
);

const useMessageBranch = () => {
  const context = useContext(MessageBranchContext);

  if (!context) {
    throw new Error(
      "MessageBranch components must be used within MessageBranch"
    );
  }

  return context;
};

export type MessageBranchProps = HTMLAttributes<HTMLDivElement> & {
  defaultBranch?: number;
  onBranchChange?: (branchIndex: number) => void;
};

export const MessageBranch = ({
  defaultBranch = 0,
  onBranchChange,
  className,
  ...props
}: MessageBranchProps) => {
  const [currentBranch, setCurrentBranch] = useState(defaultBranch);
  const [branches, setBranches] = useState<ReactElement[]>([]);

  const handleBranchChange = useCallback(
    (newBranch: number) => {
      setCurrentBranch(newBranch);
      onBranchChange?.(newBranch);
    },
    [onBranchChange]
  );

  const goToPrevious = useCallback(() => {
    const newBranch =
      currentBranch > 0 ? currentBranch - 1 : branches.length - 1;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const goToNext = useCallback(() => {
    const newBranch =
      currentBranch < branches.length - 1 ? currentBranch + 1 : 0;
    handleBranchChange(newBranch);
  }, [currentBranch, branches.length, handleBranchChange]);

  const contextValue = useMemo<MessageBranchContextType>(
    () => ({
      branches,
      currentBranch,
      goToNext,
      goToPrevious,
      setBranches,
      totalBranches: branches.length,
    }),
    [branches, currentBranch, goToNext, goToPrevious]
  );

  return (
    <MessageBranchContext.Provider value={contextValue}>
      <div
        className={cn("grid w-full gap-2 [&>div]:pb-0", className)}
        {...props}
      />
    </MessageBranchContext.Provider>
  );
};

export type MessageBranchContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageBranchContent = ({
  children,
  ...props
}: MessageBranchContentProps) => {
  const { currentBranch, setBranches, branches } = useMessageBranch();
  const childrenArray = useMemo(
    () => (Array.isArray(children) ? children : [children]),
    [children]
  );

  // Use useEffect to update branches when they change
  useEffect(() => {
    if (branches.length !== childrenArray.length) {
      setBranches(childrenArray);
    }
  }, [childrenArray, branches, setBranches]);

  return childrenArray.map((branch, index) => (
    <div
      className={cn(
        "grid gap-2 overflow-hidden [&>div]:pb-0",
        index === currentBranch ? "block" : "hidden"
      )}
      key={branch.key}
      {...props}
    >
      {branch}
    </div>
  ));
};

export type MessageBranchSelectorProps = ComponentProps<typeof ButtonGroup>;

export const MessageBranchSelector = (props: MessageBranchSelectorProps) => {
  const { totalBranches } = useMessageBranch();

  // Don't render if there's only one branch
  if (totalBranches <= 1) {
    return null;
  }

  return <ButtonGroup {...props} />;
};

export type MessageBranchPreviousProps = ComponentProps<typeof Button>;

export const MessageBranchPrevious = ({
  children,
  ...props
}: MessageBranchPreviousProps) => {
  useI18n();
  const { goToPrevious, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label={i18n("chat.branches.previous")}
      disabled={totalBranches <= 1}
      onClick={goToPrevious}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronLeftIcon size={14} />}
    </Button>
  );
};

export type MessageBranchNextProps = ComponentProps<typeof Button>;

export const MessageBranchNext = ({
  children,
  ...props
}: MessageBranchNextProps) => {
  useI18n();
  const { goToNext, totalBranches } = useMessageBranch();

  return (
    <Button
      aria-label={i18n("chat.branches.next")}
      disabled={totalBranches <= 1}
      onClick={goToNext}
      size="icon-sm"
      type="button"
      variant="ghost"
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </Button>
  );
};

export type MessageBranchPageProps = HTMLAttributes<HTMLSpanElement>;

export const MessageBranchPage = (props: MessageBranchPageProps) => {
  useI18n();
  const { currentBranch, totalBranches } = useMessageBranch();

  return (
    <ButtonGroupText {...props}>
      {i18n("chat.branches.position", [currentBranch + 1, totalBranches])}
    </ButtonGroupText>
  );
};

export type MessageResponseProps = ComponentProps<typeof Streamdown>;

const streamdownCode: typeof code = {
  ...code,
  highlight(options, callback) {
    if (options.language.toLowerCase() === "sql") {
      return code.highlight({ ...options, themes: [sqlHighlightTheme, sqlHighlightTheme] }, callback);
    }
    return code.highlight(options, callback);
  },
};

const streamdownPlugins = { cjk, code: streamdownCode, math, mermaid };

function MermaidError({ chart, error, retry }: MermaidErrorComponentProps) {
  useI18n();
  return (
    <div role="alert" className="space-y-2 rounded-md bg-destructive/10 p-4 text-sm">
      <p className="text-destructive">{i18n("errors.markdown.diagramRenderFailed")}</p>
      <p className="whitespace-pre-wrap break-words">{error}</p>
      <Button onClick={retry}>{i18n("common.actions.retry")}</Button>
      <details>
        <summary className="cursor-pointer">{i18n("markdown.actions.showCode")}</summary>
        <pre className="overflow-x-auto text-xs">{chart}</pre>
      </details>
    </div>
  );
}

const mermaidOptions = {
  config: { themeVariables: { fontSize: "var(--text-sm)" } },
  errorComponent: MermaidError,
};

const streamdownComponents = {
  table: MarkdownTable,
  a: ({ className, ...props }: ComponentProps<typeof defaultComponents.a>) => (
    <defaultComponents.a className={cn("font-normal text-accent", className)} {...props} />
  ),
  strong: ({ className, ...props }: ComponentProps<typeof defaultComponents.strong>) => (
    <defaultComponents.strong className={cn("font-semibold", className)} {...props} />
  ),
  ul: ({ className, ...props }: ComponentProps<typeof defaultComponents.ul>) => (
    <defaultComponents.ul className={cn("list-outside space-y-0 pl-7", className)} {...props} />
  ),
  ol: ({ className, ...props }: ComponentProps<typeof defaultComponents.ol>) => (
    <defaultComponents.ol className={cn("list-outside space-y-0 pl-7", className)} {...props} />
  ),
  li: ({ className, ...props }: ComponentProps<typeof defaultComponents.li>) => (
    <defaultComponents.li className={cn("py-0 leading-[inherit]", className)} {...props} />
  ),
};

export const MessageResponse = memo(
  ({ className, ...props }: MessageResponseProps) => {
    useI18n();
    return (
      <Streamdown
        className={cn(
          "size-full space-y-3 font-sans leading-[1.6] font-normal tracking-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          "[&_h1]:text-2xl [&_h2]:text-xl [&_:is(h3,h4,h5,h6)]:text-lg [&_.katex]:text-[1em] [&_[data-streamdown=code-block-body]_code>span]:before:text-xs",
          "[&_[data-streamdown=code-block][data-language=sql_i]]:bg-muted/50 [&_[data-streamdown=code-block-body][data-language=sql_i]]:bg-transparent",
          className
        )}
        translations={{
          close: i18n("common.actions.close"),
          copied: i18n("common.status.copied"),
          copyCode: i18n("markdown.actions.copyCode"),
          copyLink: i18n("markdown.actions.copyLink"),
          copyTable: i18n("markdown.actions.copyTable"),
          copyTableAsCsv: i18n("markdown.actions.copyCsv"),
          copyTableAsMarkdown: i18n("markdown.actions.copyMarkdown"),
          copyTableAsTsv: i18n("markdown.actions.copyTsv"),
          downloadDiagram: i18n("markdown.actions.downloadDiagram"),
          downloadDiagramAsMmd: i18n("markdown.actions.downloadMmd"),
          downloadDiagramAsPng: i18n("markdown.actions.downloadPng"),
          downloadDiagramAsSvg: i18n("markdown.actions.downloadSvg"),
          downloadFile: i18n("markdown.actions.downloadFile"),
          downloadImage: i18n("markdown.actions.downloadImage"),
          downloadTable: i18n("markdown.actions.downloadTable"),
          downloadTableAsCsv: i18n("markdown.actions.downloadCsv"),
          downloadTableAsMarkdown: i18n("markdown.actions.downloadMarkdown"),
          errorMermaid: i18n("errors.markdown.diagramRenderFailed"),
          exitFullscreen: i18n("common.actions.exitFullscreen"),
          externalLinkWarning: i18n("markdown.externalLink.warning"),
          imageNotAvailable: i18n("markdown.imageUnavailable"),
          mermaidAriaLabel: i18n("markdown.diagramLabel"),
          openExternalLink: i18n("markdown.actions.openExternalLink"),
          openLink: i18n("markdown.actions.openLink"),
          resetView: i18n("markdown.actions.resetView"),
          viewFullscreen: i18n("markdown.actions.enterFullscreen"),
          zoomIn: i18n("common.actions.zoomIn"),
          zoomOut: i18n("common.actions.zoomOut"),
        }}
        plugins={streamdownPlugins}
        mermaid={mermaidOptions}
        components={streamdownComponents}
        {...props}
      />
    );
  },
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

MessageResponse.displayName = "MessageResponse";

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({
  className,
  children,
  ...props
}: MessageToolbarProps) => (
  <div
    className={cn(
      "mt-4 flex w-full items-center justify-between gap-4",
      className
    )}
    {...props}
  >
    {children}
  </div>
);
