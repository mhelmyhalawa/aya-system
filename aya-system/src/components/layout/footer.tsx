import { Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-green-900/95 text-green-100 py-6 border-t border-green-700 mt-auto shadow-inner">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center text-center space-y-2">
          <p className="text-sm md:text-base font-medium">
            حقوق النشر &copy; {currentYear} — مكتب آية لتحفيظ القرآن الكريم
          </p>

          <div className="flex items-center gap-2 text-sm text-green-200">
            <span>تم التطوير بكل</span>
            <Heart className="h-4 w-4 text-red-500 fill-red-500 animate-pulse" />
            <span className="hidden sm:inline">من أجل خدمة كتاب الله</span>
          </div>
        </div>
      </div>
    </footer>

  );
}
