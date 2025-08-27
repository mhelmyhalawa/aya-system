import React from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Ketama Aya - Home</title>
        <meta name="description" content="Welcome to Ketama Aya" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />
      
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1>Welcome to Ketama Aya</h1>
            <p>Your trusted partner for innovative solutions</p>
            <button className={styles.ctaButton}>Learn More</button>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.featureGrid}>
            <div className={styles.featureCard}>
              <h2>Feature 1</h2>
              <p>Description of the first feature and its benefits.</p>
            </div>
            <div className={styles.featureCard}>
              <h2>Feature 2</h2>
              <p>Description of the second feature and its benefits.</p>
            </div>
            <div className={styles.featureCard}>
              <h2>Feature 3</h2>
              <p>Description of the third feature and its benefits.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
