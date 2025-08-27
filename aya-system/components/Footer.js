import React from 'react';
import Link from 'next/link';
import styles from '../styles/Footer.module.css';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.footerGrid}>
          <div className={styles.footerCol}>
            <h3>Ketama Aya</h3>
            <p>Providing exceptional services and solutions.</p>
          </div>
          <div className={styles.footerCol}>
            <h3>Quick Links</h3>
            <ul>
              <li><Link href="/">Home</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/services">Services</Link></li>
              <li><Link href="/contact">Contact</Link></li>
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
