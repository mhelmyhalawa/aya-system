import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface NavigationProps {
  items: NavigationItem[];
  currentPath?: string;
  onNavigate: (href: string) => void;
}

export function Navigation({ items, currentPath, onNavigate }: NavigationProps) {
  return (
    <nav className="flex flex-wrap gap-2 md:gap-4">
      {items.map((item) => (
        <Button
          key={item.href}
          variant={currentPath === item.href ? "default" : "outline"}
          size="sm"
          onClick={() => onNavigate(item.href)}
          className={cn(
            "transition-all duration-200",
            currentPath === item.href
              ? "bg-primary text-primary-foreground shadow-md"
              : "border-islamic-green/20 text-islamic-green hover:bg-islamic-green/10"
          )}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.label}
        </Button>
      ))}
    </nav>
  );
}