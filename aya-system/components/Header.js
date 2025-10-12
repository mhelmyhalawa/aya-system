import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Info, Briefcase, Phone } from 'lucide-react';
import styles from '../styles/Header.module.css';

/**
 * معيد تصميم شريط التنقل
 * - إزالة اللون البنفسجي (purple) واستبداله بلوحة إسلامية (أخضر / ذهبي)
 * - إضافة أيقونات مميزة لكل عنصر
 * - إبراز العنصر النشط Active
 * - دعم الإتجاه RTL افتراضيًا
 */
const navItems = [
  { href: '/', label: 'الرئيسية', en: 'Home', icon: <Home size={16} /> },
  { href: '/about', label: 'من نحن', en: 'About', icon: <Info size={16} /> },
  { href: '/services', label: 'الخدمات', en: 'Services', icon: <Briefcase size={16} /> },
  { href: '/contact', label: 'تواصل معنا', en: 'Contact', icon: <Phone size={16} /> },
];

const Header = () => {
  const router = useRouter();

  return (
    <header className={styles.header} dir="rtl">
      <div className={styles.container}>
        <div className={styles.logo}>
          <Link href="/" className={styles.brandLink}>
            <h1 className={styles.brandText}>Ketama Aya</h1>
          </Link>
        </div>
        <nav className={styles.nav} aria-label="Main navigation">
          <ul className={styles.navList}>
            {navItems.map(item => {
              const active = router.pathname === item.href;
              return (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href}
                    className={[
                      styles.navLink,
                      active ? styles.navLinkActive : '',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                    title={item.en}
                  >
                    <span className={styles.icon}>{item.icon}</span>
                    <span className={styles.linkText}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
