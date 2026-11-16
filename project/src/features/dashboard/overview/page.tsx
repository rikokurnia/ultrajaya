import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CYCLES } from "@/shared/cycles";
import styles from "@/components/foundation.module.css";
function CycleIcon({ index }: { index: number }) {
  return (
    <svg
      viewBox="0 0 80 84"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {index === 0 ? (
        <>
          <path d="M18 8h30l18 19v46a5 5 0 0 1-5 5H18a5 5 0 0 1-5-5V13a5 5 0 0 1 5-5Z" />
          <path d="M48 8v20h18M28 44h23M28 59h23" />
        </>
      ) : index === 1 ? (
        <>
          <path d="M12 31h56l3 43a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5l3-43Z" />
          <path d="M25 40V24a15 15 0 0 1 30 0v16" />
        </>
      ) : index === 2 ? (
        <>
          <path d="M4 76V43l21-13v13l22-13v13l27-13v46H4Z" />
          <path d="m58 36 3-34h9l3 29M19 57h6v6h-6zM38 57h6v6h-6zM57 57h6v6h-6z" />
        </>
      ) : (
        <>
          <path d="M40 70H13a5 5 0 0 1-5-5V12a5 5 0 0 1 5-5h49a5 5 0 0 1 5 5v17M22 23h30M22 38h18M22 53h9" />
          <circle cx="59" cy="49" r="8" />
          <path d="M44 76v-5a15 15 0 0 1 30 0v5H44Z" />
        </>
      )}
    </svg>
  );
}
export function DashboardPage() {
  return (
    <section className={styles.dashboard}>
      <h1 className={styles.pageTitle}>Dashboard Operasional</h1>
      <div className={styles.cycleGrid}>
        {CYCLES.map((cycle, index) => {
          return (
            <article className={styles.cycleCard} key={cycle.key}>
              <span className={styles.cycleIcon}>
                <CycleIcon index={index} />
              </span>
              <div className={styles.cycleBody}>
                <h2>{cycle.title}</h2>
                <p>{cycle.description}</p>
                <Link className={styles.cycleLink} href={cycle.path}>
                  Buka siklus <ArrowRight aria-hidden />
                  <span className="sr-only">{cycle.title}</span>
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
