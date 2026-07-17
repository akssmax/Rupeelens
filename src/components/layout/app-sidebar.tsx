import { memo } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  ArrowLeftRight,
  ChevronsUpDown,
  LayoutDashboard,
  PanelLeftClose,
  Receipt,
  Repeat,
  Wallet,
} from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
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

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/spending", label: "Spending", icon: Wallet },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/credits-debits", label: "Credits / Debits", icon: ArrowLeftRight },
] as const

const USER = {
  name: "Akshay",
  email: "Local · browser only",
  initials: "AS",
}

export const AppSidebar = memo(function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { isMobile, state, toggleSidebar } = useSidebar()
  const collapsed = state === "collapsed"

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
              {nav.map((item) => {
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
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar size="sm" className="rounded-lg">
                    <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-xs">
                      {USER.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{USER.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {USER.email}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
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
                      <AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-xs">
                        {USER.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{USER.name}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        Data stays on this device
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
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
      <SidebarRail />
    </Sidebar>
  )
})
