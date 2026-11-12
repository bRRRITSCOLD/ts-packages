---
"@brrritscold/core-react": minor
---

Sidebar, promoted from a page design: a static, non-collapsible sidebar with `Sidebar` (an `<aside>` at `--sidebar-width`, 256px by default), `SidebarHeader`, `SidebarContent`, `SidebarGroup`, `SidebarGroupLabel`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton` (`isActive` → `data-active`, and Base UI's `render` for links), `SidebarMenuBadge`, `SidebarSeparator` and `SidebarFooter`. Eight new semantic tokens per mode, shadcn's `sidebar`, `sidebar-foreground`, `sidebar-primary`, `sidebar-primary-foreground`, `sidebar-accent`, `sidebar-accent-foreground`, `sidebar-border` and `sidebar-ring` (each equal to its general token except the fill: `neutral.50` in light, `neutral.900` in dark), and the `space.64` (256px) primitive.
