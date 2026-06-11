import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ShoppingCart, Package, Warehouse, Tags, Truck,
  ClipboardList, Receipt, Users, UserCheck, Calendar, FileText,
  DollarSign, TrendingUp, Bell, Bot, Sparkles, LogOut, Store, Menu, X
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useListNotifications } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navItems = [
  { section: "Overview", items: [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pos", label: "Point of Sale", icon: ShoppingCart },
  ]},
  { section: "Inventory", items: [
    { href: "/products", label: "Products", icon: Package },
    { href: "/inventory", label: "Inventory", icon: Warehouse },
    { href: "/categories", label: "Categories", icon: Tags },
    { href: "/suppliers", label: "Suppliers", icon: Truck },
    { href: "/purchases", label: "Purchase Orders", icon: ClipboardList },
  ]},
  { section: "Sales", items: [
    { href: "/sales", label: "Sales History", icon: Receipt },
    { href: "/customers", label: "Customers", icon: Users },
  ]},
  { section: "HR & Payroll", items: [
    { href: "/employees", label: "Employees", icon: UserCheck },
    { href: "/attendance", label: "Attendance", icon: Calendar },
    { href: "/leaves", label: "Leave Management", icon: FileText },
    { href: "/payroll", label: "Payroll", icon: DollarSign },
  ]},
  { section: "Finance", items: [
    { href: "/expenses", label: "Expenses", icon: TrendingUp },
  ]},
  { section: "AI Tools", items: [
    { href: "/ai-insights", label: "AI Analytics", icon: Sparkles },
    { href: "/ai-assistant", label: "AI Assistant", icon: Bot },
  ]},
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notifications } = useListNotifications();
  const unreadCount = notifications?.filter((n: any) => !n.isRead).length ?? 0;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Store className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold text-sidebar-foreground">Supermarket OS</div>
            <div className="text-xs text-sidebar-foreground/60">{user?.role?.replace("_", " ") ?? "Manager"}</div>
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 px-2 py-2">
        {navItems.map((section) => (
          <div key={section.section} className="mb-3">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {section.section}
            </div>
            {section.items.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors my-0.5",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}>
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
              );
            })}
          </div>
        ))}
      </ScrollArea>
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-semibold text-sidebar-accent-foreground shrink-0">
            {user?.name?.[0] ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-sidebar-foreground truncate">{user?.name ?? "User"}</div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate">{user?.email ?? ""}</div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-sidebar-foreground/50 hover:text-sidebar-foreground" onClick={logout}>
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-56 bg-sidebar flex flex-col h-full z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-border bg-card flex items-center px-4 gap-3 shrink-0">
          <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <div className="flex-1" />
          <Link href="/notifications" className="relative flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted transition-colors">
              <Bell className="h-4 w-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
