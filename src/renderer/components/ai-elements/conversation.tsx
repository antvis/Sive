"use client";

import { i18n as translateCurrent, useI18n } from "../../i18n";

import type { ComponentProps } from "react";
import type { MessageKey } from "@shared/i18n";

import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { ArrowDownIcon, DownloadIcon } from "lucide-react";
import { useCallback } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

export type ConversationProps = ComponentProps<typeof StickToBottom>;

export const Conversation = ({ className, ...props }: ConversationProps) => (
  <StickToBottom
    className={cn("relative flex-1 overflow-y-hidden", className)}
    initial="smooth"
    resize="smooth"
    role="log"
    {...props}
  />
);

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
>;

export const ConversationContent = ({
  className,
  ...props
}: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("flex flex-col gap-8 p-4", className)}
    {...props}
  />
);

export type ConversationEmptyStateProps = Omit<ComponentProps<"div">, "title"> & {
  title?: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title: titleProp,
  description: descriptionProp,
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => {
  const i18n = useI18n();
  const title = titleProp === undefined ? i18n("chat.empty.title") : titleProp;
  const description = descriptionProp === undefined ? i18n("chat.empty.description") : descriptionProp;
  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {icon && <div className="text-muted-foreground">{icon}</div>}
          <div className="space-y-1">
            <h3 className="font-medium text-2xl tracking-tight">{title}</h3>
            {description && (
              <p className="mt-3 text-muted-foreground text-sm leading-6">{description}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const i18n = useI18n();
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          "absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full dark:bg-background dark:hover:bg-muted",
          className
        )}
        aria-label={i18n("chat.actions.scrollToLatest")}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};

export interface ConversationMessage {
  role: "user" | "assistant" | "system" | "data" | "tool";
  content: string;
}

export type ConversationDownloadProps = Omit<
  ComponentProps<typeof Button>,
  "onClick"
> & {
  messages: ConversationMessage[];
  filename?: string;
  formatMessage?: (message: ConversationMessage, index: number) => string;
};

const roleLabelKeys = {
  user: "chat.roles.user",
  assistant: "chat.roles.assistant",
  system: "chat.roles.system",
  data: "chat.roles.data",
  tool: "chat.roles.tool",
} as const satisfies Record<ConversationMessage["role"], MessageKey>;

const defaultFormatMessage = (message: ConversationMessage): string => {
  const roleLabel = translateCurrent(roleLabelKeys[message.role]);
  return `**${roleLabel}:** ${message.content}`;
};

export const messagesToMarkdown = (
  messages: ConversationMessage[],
  formatMessage: (
    message: ConversationMessage,
    index: number
  ) => string = defaultFormatMessage
): string => messages.map((msg, i) => formatMessage(msg, i)).join("\n\n");

export const ConversationDownload = ({
  messages,
  filename = "conversation.md",
  formatMessage = defaultFormatMessage,
  className,
  children,
  ...props
}: ConversationDownloadProps) => {
  const i18n = useI18n();
  const handleDownload = useCallback(() => {
    const markdown = messagesToMarkdown(messages, formatMessage);
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [messages, filename, formatMessage]);

  return (
    <Button
      className={cn(
        "absolute top-4 right-4 rounded-full dark:bg-background dark:hover:bg-muted",
        className
      )}
      aria-label={i18n("chat.actions.download")}
      onClick={handleDownload}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      {children ?? <DownloadIcon className="size-4" />}
    </Button>
  );
};
