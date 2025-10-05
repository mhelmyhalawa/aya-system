import { Heart } from "lucide-react";
import { getLabels } from "@/lib/labels";
import { BUILD_VERSION } from "@/lib/version";

interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
  const { footerLabels } = getLabels('ar');
  const year = new Date().getFullYear();
  return (
    <footer className={`w-full border-t border-green-200 dark:border-green-800 bg-white/80 dark:bg-green-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/65 dark:supports-[backdrop-filter]:bg-green-950/60 mt-auto ${compact ? 'py-0.5' : ''}`}>
      <div className={`max-w-screen-xl mx-auto px-3 sm:px-4 ${compact ? 'py-1' : 'py-2'} flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs leading-tight text-green-700 dark:text-green-200`}>
        <span className="font-medium text-green-800 dark:text-green-100">{footerLabels.systemName}</span>
        <span className="hidden sm:inline text-green-400">•</span>
        <span className="flex items-center gap-1 text-green-600 dark:text-green-300">
          {footerLabels.lovePrefix}
          <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />
          {footerLabels.loveSuffix}
        </span>
        <span className="hidden sm:inline text-green-400">•</span>
        <span className="text-green-600 dark:text-green-300">{footerLabels.version} {BUILD_VERSION}</span>
        <span className="hidden sm:inline text-green-400">•</span>
        <span className="text-green-500 dark:text-green-400">{footerLabels.rightsReserved} © {year}</span>
      </div>
    </footer>
  );
}
