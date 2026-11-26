"use client";

import type { DynamicToolUIPart, ToolUIPart } from "ai";
import { isToolOutputErrorUIPart } from "ai";
import type { ComponentProps, ReactNode } from "react";

import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleInlineTrigger,
} from "../ui/collapsible";
import { cn } from "../../lib/utils";
import {
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import { isValidElement } from "react";

import { CodeBlock } from "./code-block";

export type ToolProps = ComponentProps<typeof Collapsible>;

export const Tool = ({ className, ...props }: ToolProps) => (
  <Collapsible
    className={cn("group not-prose w-full", className)}
    {...props}
  />
);

export type ToolPart = ToolUIPart | DynamicToolUIPart;

export function getToolErrorText(call: ToolPart) {
  if (isToolOutputErrorUIPart(call)) return call.errorText;
  if (call.state === "output-denied") return "工具执行已拒绝。";
}

export type ToolHeaderProps = {
  title: string;
  icon?: ReactNode;
  state: ToolPart["state"];
};

const statusLabels: Partial<Record<ToolPart["state"], string>> = {
  "approval-requested": "等待授权",
  "output-denied": "已拒绝",
};

const statusIcons: Partial<Record<ToolPart["state"], ReactNode>> = {
  "approval-requested": <ClockIcon className="size-4 text-yellow-600" />,
  "output-denied": <XCircleIcon className="size-4 text-orange-600" />,
};

export const getStatusBadge = (status: ToolPart["state"]) =>
  statusLabels[status] ? (
    <Badge className="gap-1.5 rounded-full border-0 bg-transparent px-0 text-xs text-inherit" variant="secondary">
      {statusIcons[status]}
      {statusLabels[status]}
    </Badge>
  ) : null;

export const ToolHeader = ({ title, icon, state }: ToolHeaderProps) => {
  const running = state === "input-streaming" || state === "input-available";

  return (
    <CollapsibleInlineTrigger endContent={getStatusBadge(state)}>
      {icon ?? <WrenchIcon className="size-4 text-muted-foreground" aria-hidden />}
      <span className={cn(
        running && "motion-safe:animate-chat-tool-shimmer motion-safe:bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)] motion-safe:bg-size-[200%_100%] motion-safe:bg-clip-text motion-safe:[-webkit-text-fill-color:transparent]"
      )}>{running ? `正在${title}…` : title}</span>
    </CollapsibleInlineTrigger>
  );
};

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
    <div className={className} {...props}>
      <div
        role={errorText ? "alert" : undefined}
        className={cn(
          "overflow-x-auto rounded-md text-sm leading-6",
          errorText && "bg-destructive/10 p-3 whitespace-pre-wrap break-words text-destructive"
        )}
      >
        {errorText || Output}
      </div>
    </div>
  );
};
