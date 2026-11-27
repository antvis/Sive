import { i18n, useI18n } from "../../i18n";
import { cn } from "../../lib/utils"
import { Loader2Icon } from "lucide-react"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  useI18n();
  return (
    <Loader2Icon role="status" aria-label={i18n("common.status.loading")} className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
