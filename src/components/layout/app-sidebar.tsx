import { memo, useState } from "react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import {
  ArrowLeftRight,
  ChevronsUpDown,
  CloudUpload,
  FileStack,
  Ghost,
  LayoutDashboard,
  Loader2,
  LogOut,
  PanelLeftClose,
  Receipt,
  Repeat,
  Trash2,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useFinanceData } from "@/hooks/use-finance-data"
import { authClient } from "@/lib/auth/client"
import { useAuthSession } from "@/lib/auth/use-auth-session"
import { clearAllData } from "@/lib/finance/storage"
import { emitFinanceRefresh } from "@/lib/finance-events"
import { migrateIndexedDbToCloud } from "@/lib/migrate-local-to-cloud"
import { setSandboxMode } from "@/lib/sandbox/load-demo"

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/spending", label: "Spending", icon: Wallet },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/credits-debits", label: "Credits / Debits", icon: ArrowLeftRight },
] as const

const signedInNav = [
  { to: "/sources", label: "Sources", icon: FileStack },
] as const

const INCOGNITO_USER = {
  label: "Incognito",
  subtitle: "Saved in this browser",
  hint: "Statements and categories stay on this device until you create an account.",
}

export const AppSidebar = memo(function AppSidebar() {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isMobile, state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"
  const [clearOpen, setClearOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const { user, isSignedIn: signedIn } = useAuthSession()
  const { hasLocalData } = useFinanceData()

  const displayName = user?.name || user?.email || INCOGNITO_USER.label
  const hasPendingLocalSync = signedIn && hasLocalData === true
  const displaySubtitle = signedIn
    ? hasPendingLocalSync
      ? "Local data pending sync"
      : "Synced to cloud"
    : INCOGNITO_USER.subtitle
  const accountHint = signedIn
    ? hasPendingLocalSync
      ? "This browser still has unsynced data from before you signed in. Use Sync local data to upload it to your account."
      : "Uploads and changes save to your cloud account automatically."
    : INCOGNITO_USER.hint
  const initials = signedIn
    ? (displayName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") || "U")
    : null

  const signOut = async () => {
    try {
      await authClient.signOut()
      emitFinanceRefresh()
      toast.success("Signed out")
      void navigate({ to: "/" })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sign out")
    }
  }

  const syncLocalData = async () => {
    setSyncing(true)
    try {
      const synced = await migrateIndexedDbToCloud()
      emitFinanceRefresh()
      if (synced.transactions === 0 && synced.statements === 0) {
        toast.message("Nothing to sync", {
          description: "No local browser data found to upload.",
        })
      } else {
        toast.success(
          `Synced ${synced.transactions} transactions to your account and cleared local browser data.`,
        )
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not sync local data")
    } finally {
      setSyncing(false)
    }
  }

  const clearStoredData = async () => {
    setClearing(true)
    try {
      await clearAllData()
      setSandboxMode(false)
      emitFinanceRefresh()
      setClearOpen(false)
      toast.success("Stored data cleared")
      void navigate({ to: "/" })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear data")
    } finally {
      setClearing(false)
    }
  }

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
              className="group-data-[collapsible=icon]:!p-2"
            >
              <div
                className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg text-[15px] leading-none font-semibold group-data-[collapsible=icon]:size-4 group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:text-[11px]"
                aria-hidden
              >
                <span className="inline-flex translate-y-px items-center justify-center leading-none">
                  ₹
                </span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="font-heading truncate font-semibold">
                  RupeeLens
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  Personal finance
                </span>
              </div>
              <PanelLeftClose className="text-muted-foreground ml-auto size-4" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {[...nav, ...(signedIn ? signedInNav : [])].map((item) => {
                const active =
                  item.to === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.to)
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Link to={item.to} preload="intent">
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={displayName}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-2"
                >
                  <Avatar
                    size="sm"
                    className="rounded-lg group-data-[collapsible=icon]:size-8"
                  >
                    <AvatarFallback className="bg-muted text-muted-foreground rounded-lg group-data-[collapsible=icon]:rounded-md">
                      {signedIn ? (
                        initials
                      ) : (
                        <Ghost className="size-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-medium">{displayName}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {displaySubtitle}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar size="sm" className="rounded-lg">
                      <AvatarFallback className="bg-muted text-muted-foreground rounded-lg">
                        {signedIn ? initials : <Ghost className="size-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{displayName}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {displaySubtitle}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <p className="text-muted-foreground px-2 pb-1 text-xs leading-relaxed">
                  {accountHint}
                </p>
                <DropdownMenuSeparator />
                {signedIn ? (
                  <>
                    <DropdownMenuItem
                      disabled={syncing || !hasPendingLocalSync}
                      onSelect={() => void syncLocalData()}
                    >
                      {syncing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CloudUpload className="size-4" />
                      )}
                      Sync local data
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => void signOut()}>
                      <LogOut className="size-4" />
                      Log out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/signup">
                      <CloudUpload className="size-4" />
                      Sign up to save & sync
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(e) => {
                    e.preventDefault()
                    setClearOpen(true)
                  }}
                >
                  <Trash2 className="size-4" />
                  Clear stored data
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-muted-foreground text-xs">Theme</span>
                  <ModeToggle />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent showCloseButton={!clearing}>
          <DialogHeader>
            <DialogTitle>Clear stored data?</DialogTitle>
            <DialogDescription>
              This removes all imported CSV transactions, categories you learned,
              and merchant mappings from this browser. You cannot undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setClearOpen(false)}
              disabled={clearing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void clearStoredData()}
              disabled={clearing}
            >
              {clearing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Clearing…
                </>
              ) : (
                "Clear data"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SidebarRail />
    </Sidebar>
  )
})
