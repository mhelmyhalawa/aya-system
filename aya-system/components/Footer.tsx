import React from 'react';
// Using plain <a> tags instead of next/link since this app is not Next.js.
// @ts-ignore - allow importing CSS module without type declaration
import styles from '../styles/Footer.module.css';

interface FooterProps {
  compact?: boolean;
}

const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`${styles.footer} ${compact ? styles.compact : ''}`}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <h3>Ketama Aya</h3>
            <p>Providing exceptional services and solutions.</p>
          </div>
          <div className={styles.footerCol}>
            <h3>Quick Links</h3>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/services">Services</a></li>
              <li><a href="/contact">Contact</a></li>
            </ul>
          </div>
          <div className={styles.footerCol}>
            <h3>Contact Us</h3>
            <p>Email: info@ketamaaya.com</p>
            <p>Phone: (123) 456-7890</p>
          </div>
        </div>
        <div className={styles.copyright}>
          <p>&copy; {currentYear} Ketama Aya. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
