"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";

import { Badge } from "@renderer/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@renderer/components/ui/collapsible";
import { cn } from "@renderer/lib/utils";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose mb-4 w-full rounded-md border", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export type ToolHeaderProps = {
  title?: string;
  icon?: ReactNode;
  className?: string;
} & (
  | { type: ToolUIPart["type"]; state: ToolUIPart["state"]; toolName?: never }
  | {
      type: DynamicToolUIPart["type"];
      state: DynamicToolUIPart["state"];
      toolName: string;
    }
);

const statusLabels: Partial<Record<ToolPart["state"], string>> = {
  "approval-requested": "等待授权",
  "output-denied": "已拒绝",
  "output-error": "执行失败",
};

const statusIcons: Partial<Record<ToolPart["state"], ReactNode>> = {
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
  "output-error": <XCircleIcon className="size-4 text-red-600" />,
};

export const getStatusBadge = (status: ToolPart["state"]) =>
  statusLabels[status] ? (
    <Badge className="gap-1.5 rounded-full border-0 bg-transparent px-0 text-xs text-inherit" variant="secondary">
      {statusIcons[status]}
      {statusLabels[status]}
    </Badge>
  ) : null;

export const ToolHeader = ({
  className,
  title,
  icon,
  type,
  state,
  toolName,
  ...props
}: ToolHeaderProps) => {
  const derivedName =
    type === "dynamic-tool" ? toolName : type.split("-").slice(1).join("-");
  const action = title ?? derivedName;
  const running = state === "input-streaming" || state === "input-available";

  return (
    <CollapsibleTrigger
      className={cn(
        "group/tool-header flex min-h-6 w-full items-center justify-start gap-1 bg-transparent p-0 text-left text-muted-foreground outline-offset-2 transition-colors duration-150 ease-linear hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2 gap-y-1">
        {icon ?? <WrenchIcon className="size-4 text-muted-foreground" />}
        <span className={cn(
          "text-base font-normal",
          running && "motion-safe:animate-chat-tool-shimmer motion-safe:bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] motion-safe:bg-size-[200%_100%] motion-safe:bg-clip-text motion-safe:[-webkit-text-fill-color:transparent]"
        )}>{running ? `正在${action}…` : action}</span>
      </div>
      <ChevronRightIcon
        className="size-4 shrink-0 text-inherit opacity-0 transition-opacity duration-150 ease-linear group-hover/tool-header:opacity-100 group-focus-visible/tool-header:opacity-100 group-data-[state=open]/tool-header:hidden group-data-[state=open]/tool-header:opacity-100"
        aria-hidden="true"
      />
      <ChevronDownIcon
        className="hidden size-4 shrink-0 text-inherit opacity-0 transition-opacity duration-150 ease-linear group-hover/tool-header:opacity-100 group-focus-visible/tool-header:opacity-100 group-data-[state=open]/tool-header:block group-data-[state=open]/tool-header:opacity-100"
        aria-hidden="true"
      />
      {getStatusBadge(state)}
    </CollapsibleTrigger>
  );
};

export type ToolContentProps = ComponentProps<typeof CollapsibleContent>;

export const ToolContent = ({ className, ...props }: ToolContentProps) => (
  <CollapsibleContent
    className={cn(
      "space-y-4 overflow-hidden p-4 text-popover-foreground outline-none motion-safe:data-[state=open]:animate-chat-tool-expand motion-safe:data-[state=closed]:animate-chat-tool-collapse",
      className
    )}
    {...props}
  />
);

export type ToolInputProps = ComponentProps<"div"> & {
  input: ToolPart["input"];
};

export const ToolInput = ({ className, input, ...props }: ToolInputProps) => (
  <div className={cn("space-y-2 overflow-hidden", className)} {...props}>
    <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
      Parameters
    </h4>
    <div className="rounded-md bg-muted/50">
      <CodeBlock code={JSON.stringify(input, null, 2)} language="json" />
    </div>
  </div>
);

export type ToolOutputProps = ComponentProps<"div"> & {
  output: ToolPart["output"];
  errorText: ToolPart["errorText"];
};

export const ToolOutput = ({
  className,
  output,
  errorText,
  ...props
}: ToolOutputProps) => {
  if (!(output || errorText)) {
    return null;
  }

  let Output = <div>{output as ReactNode}</div>;

  if (typeof output === "object" && !isValidElement(output)) {
    Output = (
      <CodeBlock code={JSON.stringify(output, null, 2)} language="json" />
    );
  } else if (typeof output === "string") {
    Output = <CodeBlock code={output} language="json" />;
  }

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {errorText ? "Error" : "Result"}
      </h4>
      <div
        className={cn(
          "overflow-x-auto rounded-md text-xs [&_table]:w-full",
          errorText && "bg-destructive/10 text-destructive"
        )}
      >
        {errorText && <div>{errorText}</div>}
        {Output}
      </div>
    </div>
  );
};
