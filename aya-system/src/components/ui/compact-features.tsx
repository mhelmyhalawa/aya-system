import { BookOpen, Phone, Shield, Trophy, UserCheck, Users } from "lucide-react";

export function CompactFeatures() {
  const features = [
    {
      icon: <Shield className="h-5 w-5 text-islamic-green" />,
      title: "إدارة متقدمة",
    },
    {
      icon: <UserCheck className="h-5 w-5 text-islamic-green" />,
      title: "تسجيل الطلاب",
    },
    {
      icon: <BookOpen className="h-5 w-5 text-islamic-green" />,
      title: "تقييم شامل",
    },
    {
      icon: <Trophy className="h-5 w-5 text-islamic-green" />,
      title: "متابعة التقدم",
    },
    {
      icon: <Phone className="h-5 w-5 text-islamic-green" />,
      title: "استعلام الأهالي",
    },
    {
      icon: <Users className="h-5 w-5 text-islamic-green" />,
      title: "تعاون فعال",
    }
  ];

  return (
    <div className="py-6 md:py-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-islamic-green to-accent bg-clip-text text-transparent">
            مميزات النظام
          </h2>
        </div>
        
        <div className="flex flex-wrap justify-center gap-3 md:gap-4">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="flex items-center gap-2 bg-white/50 px-3 py-2 rounded-full shadow-sm hover:shadow transition-all duration-200 border border-islamic-green/10"
            >
              <div className="flex-shrink-0">
                {feature.icon}
              </div>
              <span className="text-sm font-medium text-islamic-green">
                {feature.title}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
